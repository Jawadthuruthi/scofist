import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import DownloadCourse from "@/models/DownloadCourse";
import Download from "@/models/Download";
import Syllabus from "@/models/Syllabus";
import Book from "@/models/Book";
import cloudinary from "@/lib/cloudinary";
import { isR2Url, deleteR2Object } from "@/lib/r2";

export const dynamic = "force-dynamic";

async function deleteCloudinaryFile(fileUrl) {
  if (!fileUrl) return;
  if (isR2Url(fileUrl)) {
    try {
      await deleteR2Object(fileUrl);
    } catch (err) {
      console.error("R2 deletion failed for item:", err);
    }
    return;
  }
  if (!fileUrl.includes("cloudinary.com")) return;
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    let resourceType = "raw";
    if (fileUrl.includes("/image/upload/")) {
      resourceType = "image";
    } else if (fileUrl.includes("/video/upload/")) {
      resourceType = "video";
    }

    const urlParts = fileUrl.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      const pathAfterVersion = urlParts.slice(uploadIndex + 2).join("/");
      const publicId =
        resourceType === "raw"
          ? pathAfterVersion
          : pathAfterVersion.replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    }
  } catch (err) {
    console.error("Cloudinary deletion failed for item:", err);
  }
}

export async function GET(req) {
  try {
    await connectToDB();

    let courses = await DownloadCourse.find({}).sort({ name: 1 }).lean();

    // If no courses exist in DownloadCourse, seed from existing downloads, syllabus, books and defaults
    if (!courses || courses.length === 0) {
      const distinctDownloads = await Download.distinct("course");
      const distinctSyllabus = await Syllabus.distinct("course");
      const distinctBooks = await Book.distinct("course");
      const defaultList = ["BSIc(5 Years)", "HSIc(3 Years)", "HSIc(2 Years)"];
      const initialNames = Array.from(
        new Set([
          ...distinctDownloads.filter(Boolean),
          ...distinctSyllabus.filter(Boolean),
          ...distinctBooks.filter(Boolean),
          ...defaultList,
        ])
      );

      for (const name of initialNames) {
        try {
          await DownloadCourse.create({ name: name.trim() });
        } catch (e) {
          // ignore duplicate key errors
        }
      }
      courses = await DownloadCourse.find({}).sort({ name: 1 }).lean();
    } else {
      // Ensure any course currently present in downloads, syllabus or books is also in DownloadCourse
      const distinctAll = Array.from(
        new Set([
          ...(await Download.distinct("course")),
          ...(await Syllabus.distinct("course")),
          ...(await Book.distinct("course")),
        ].filter(Boolean))
      );
      const existingNamesLower = new Set(courses.map((c) => c.name.toLowerCase()));
      for (const name of distinctAll) {
        if (name && !existingNamesLower.has(name.toLowerCase())) {
          try {
            await DownloadCourse.create({ name: name.trim() });
          } catch (e) {}
        }
      }
      courses = await DownloadCourse.find({}).sort({ name: 1 }).lean();
    }

    const courseNames = courses.map((c) => c.name);
    return NextResponse.json({ courses: courseNames }, { status: 200 });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { message: "Failed to fetch courses", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectToDB();
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Course name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const regex = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const existing = await DownloadCourse.findOne({ name: regex });

    if (existing) {
      return NextResponse.json(
        { message: "Course already exists", course: existing.name },
        { status: 200 }
      );
    }

    const newCourse = await DownloadCourse.create({ name: cleanName });
    return NextResponse.json(
      { message: "Course created successfully", course: newCourse.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { message: "Failed to create course", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectToDB();
    const { oldName, newName } = await req.json();

    if (!oldName || !newName || !oldName.trim() || !newName.trim()) {
      return NextResponse.json(
        { message: "Both old and new course names are required" },
        { status: 400 }
      );
    }

    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    const oldRegex = new RegExp(`^${cleanOld.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    // 1. Update in DownloadCourse collection
    let courseDoc = await DownloadCourse.findOne({ name: oldRegex });
    if (courseDoc) {
      courseDoc.name = cleanNew;
      await courseDoc.save();
    } else {
      await DownloadCourse.create({ name: cleanNew });
    }

    // 2. Cascade course name update to all Download, Syllabus, and Book documents
    const downloadUpdateResult = await Download.updateMany(
      { course: oldRegex },
      { $set: { course: cleanNew } }
    );
    const syllabusUpdateResult = await Syllabus.updateMany(
      { course: oldRegex },
      { $set: { course: cleanNew } }
    );
    const bookUpdateResult = await Book.updateMany(
      { course: oldRegex },
      { $set: { course: cleanNew } }
    );

    return NextResponse.json(
      {
        message: `Course updated from "${cleanOld}" to "${cleanNew}" successfully`,
        updatedDownloadsCount: downloadUpdateResult.modifiedCount,
        updatedSyllabusCount: syllabusUpdateResult.modifiedCount,
        updatedBooksCount: bookUpdateResult.modifiedCount,
        course: cleanNew,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { message: "Failed to update course", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    let courseName = url.searchParams.get("name");

    if (!courseName) {
      try {
        const body = await req.json();
        courseName = body?.name;
      } catch (e) {}
    }

    if (!courseName || !courseName.trim()) {
      return NextResponse.json(
        { message: "Course name is required" },
        { status: 400 }
      );
    }

    const cleanName = courseName.trim();
    const regex = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    // 1. Remove course from DownloadCourse
    await DownloadCourse.deleteMany({ name: regex });

    // 2. Find and delete associated downloads + their Cloudinary files
    const associatedDownloads = await Download.find({ course: regex });
    for (const dl of associatedDownloads) {
      await deleteCloudinaryFile(dl.fileUrl);
    }
    await Download.deleteMany({ course: regex });

    // 3. Find and delete associated syllabus + their Cloudinary files
    const associatedSyllabus = await Syllabus.find({ course: regex });
    for (const s of associatedSyllabus) {
      await deleteCloudinaryFile(s.fileUrl);
    }
    await Syllabus.deleteMany({ course: regex });

    // 4. Find and delete associated books + their Cloudinary files
    const associatedBooks = await Book.find({ course: regex });
    for (const b of associatedBooks) {
      await deleteCloudinaryFile(b.fileUrl);
    }
    await Book.deleteMany({ course: regex });

    return NextResponse.json(
      {
        message: `Course "${cleanName}" and associated downloads removed successfully`,
        deletedDownloadsCount: associatedDownloads.length,
        deletedSyllabusCount: associatedSyllabus.length,
        deletedBooksCount: associatedBooks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { message: "Failed to delete course", error: error.message },
      { status: 500 }
    );
  }
}
