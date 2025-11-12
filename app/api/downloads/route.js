import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Download from "@/models/Download";
import { apiResponse } from "@/lib/apiResponse";
import cloudinary from "@/lib/cloudinary";

export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const searchParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      searchParams[key] = value;
    }

    const query = {};
    if (searchParams.year) {
      query.year = searchParams.year;
    }

    if (searchParams.semester) {
      query.semester = searchParams.semester;
    }

    const downloads = await Download.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ downloads }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const { course, year, semester, subject, fileUrl } = await req.json();
    const newDownload = new Download({
      course,
      year,
      semester,
      subject,
      fileUrl,
    });
    await newDownload.save();
    return NextResponse.json({ newDownload }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();
    const { _id, fileUrl } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Download ID is required" },
        { status: 400 }
      );
    }

    // Find the download to get fileUrl if not provided
    const download = await Download.findById(_id);

    if (!download) {
      return NextResponse.json(
        { message: "Download not found" },
        { status: 404 }
      );
    }

    // Extract public_id from Cloudinary URL
    const urlToDelete = fileUrl || download.fileUrl;
    if (urlToDelete && urlToDelete.includes("cloudinary.com")) {
      try {
        // Extract public_id from URL
        // Example URL: https://res.cloudinary.com/xxx/image/upload/v123456/downloads/filename.pdf
        const urlParts = urlToDelete.split("/");
        const uploadIndex = urlParts.indexOf("upload");
        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          // Get everything after 'upload/v123456/'
          const pathAfterVersion = urlParts.slice(uploadIndex + 2).join("/");
          // Remove file extension
          const publicId = pathAfterVersion.replace(/\.[^/.]+$/, "");

          // Delete from Cloudinary
          await cloudinary.uploader.destroy(publicId, {
            resource_type: "raw", // Use 'raw' for non-image files like PDFs
          });

          console.log(`Deleted file from Cloudinary: ${publicId}`);
        }
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue with database deletion even if Cloudinary delete fails
      }
    }

    // Delete from database
    await Download.findByIdAndDelete(_id);

    return NextResponse.json(
      { message: "Download deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete error:", error);
    return apiResponse.error(error);
  }
}
