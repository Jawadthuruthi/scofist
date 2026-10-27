import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import DownloadCourse from "@/models/DownloadCourse";
import Download from "@/models/Download";
import cloudinary from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();

    let courses = await DownloadCourse.find({}).sort({ name: 1 }).lean();

    // If no courses exist in DownloadCourse, seed from existing downloads and defaults
    if (!courses || courses.length === 0) {
      const distinctDownloads = await Download.distinct("course");
      const defaultList = ["BSIc(5 Years)", "HSIc(3 Years)", "HSIc(2 Years)"];
      const initialNames = Array.from(
        new Set([...distinctDownloads.filter(Boolean), ...defaultList])
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
      // Ensure any course currently present in downloads is also in DownloadCourse
      const distinctDownloads = await Download.distinct("course");
      const existingNamesLower = new Set(courses.map((c) => c.name.toLowerCase()));
      for (const name of distinctDownloads) {
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

    // 2. Cascade course name update to all Download documents
    const downloadUpdateResult = await Download.updateMany(
      { course: oldRegex },
      { $set: { course: cleanNew } }
    );

    return NextResponse.json(
      {
        message: `Course updated from "${cleanOld}" to "${cleanNew}" successfully`,
        updatedDownloadsCount: downloadUpdateResult.modifiedCount,
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
    if (associatedDownloads.length > 0) {
      try {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        for (const dl of associatedDownloads) {
          if (dl.fileUrl && dl.fileUrl.includes("cloudinary.com")) {
            try {
              let resourceType = "raw";
              if (dl.fileUrl.includes("/image/upload/")) {
                resourceType = "image";
              } else if (dl.fileUrl.includes("/video/upload/")) {
                resourceType = "video";
              }

              const urlParts = dl.fileUrl.split("/");
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
        }
      } catch (e) {
        console.error("Cloudinary config or deletion error:", e);
      }

      await Download.deleteMany({ course: regex });
    }

    return NextResponse.json(
      {
        message: `Course "${cleanName}" and associated downloads removed successfully`,
        deletedDownloadsCount: associatedDownloads.length,
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
