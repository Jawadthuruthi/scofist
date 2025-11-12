import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "downloads",
          resource_type: "auto",
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
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        resource_type: uploadResult.resource_type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return NextResponse.json(
      {
        message: "Error uploading file",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
