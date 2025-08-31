import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { message: "No image provided" },
        { status: 400 }
      );
    }

    // Option 1: Minimal transformation for better quality
    const result = await cloudinary.uploader.upload(image, {
      folder: "profiles",
      transformation: [
        { width: 3000, height: 3000, crop: "limit" }, // Very high resolution
        { quality: "95" }, // Near-maximum quality
        { format: "auto" }, // Let Cloudinary choose best format
      ],
    });

    // Option 2: Different settings based on use case
    // For profile images - moderate compression
    // const result = await cloudinary.uploader.upload(image, {
    //   folder: "profiles",
    //   transformation: [
    //     { width: 800, height: 800, crop: "limit" },
    //     { quality: "85" },
    //     { format: "auto" },
    //   ],
    // });

    // Option 3: No transformation for original quality
    // const result = await cloudinary.uploader.upload(image, {
    //   folder: "profiles",
    //   // No transformation - keeps original quality and size
    // });

    return NextResponse.json(
      {
        url: result.secure_url,
        publicId: result.public_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error.message);
    return NextResponse.json(
      { message: "Error uploading image" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { publicId } = await req.json();

    if (!publicId) {
      return NextResponse.json(
        { message: "No image ID provided" },
        { status: 400 }
      );
    }

    // Delete image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return NextResponse.json(
        { message: "Image deleted successfully!" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Failed to delete image" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error.message);
    return NextResponse.json(
      { message: "Error deleting image" },
      { status: 500 }
    );
  }
}
