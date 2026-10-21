import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(req) {
  // ✅ Auth check: only authenticated users with the right role can upload gallery images
  const xUser = req.headers.get("x-user");
  if (!xUser) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = JSON.parse(xUser);
  const allowedRoles = ["College Admin", "Program Committee"];
  if (!user?.roles?.some((r) => allowedRoles.includes(r))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const year = formData.get("year") || "2026";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // File validation: must be an image and <= 10MB
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File exceeds maximum size of 10MB" },
        { status: 400 }
      );
    }

    const fileExt = (file.name || "").split(".").pop().toLowerCase();
    const ALLOWED_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!ALLOWED_IMAGE_EXTS.includes(fileExt)) {
      return NextResponse.json(
        { success: false, message: "Only image files (jpg, jpeg, png, webp, gif) are allowed" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize year for folder name
    const cleanYear = year.toString().trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "2026";

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `gallery/${cleanYear}`,
          resource_type: "image",
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json(
      {
        success: true,
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading to Cloudinary for gallery:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error uploading image to gallery",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
