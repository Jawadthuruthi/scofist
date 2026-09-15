import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import PhotoFrame from "@/models/PhotoFrame";
import cloudinary from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// GET /api/frames — list all frames
export async function GET() {
  try {
    await connectToDB();
    const frames = await PhotoFrame.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(
      {
        success: true,
        frames: frames.map((f) => ({ ...f, id: f._id.toString() })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching frames:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch frames" },
      { status: 500 }
    );
  }
}

// POST /api/frames — upload a new frame (base64 image → Cloudinary → DB)
export async function POST(req) {
  try {
    await connectToDB();
    const { image, name } = await req.json();

    if (!image) {
      return NextResponse.json(
        { success: false, message: "No image provided" },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "frames",
      resource_type: "image",
    });

    const frame = await PhotoFrame.create({
      name: name?.trim() || "Frame",
      url: result.secure_url,
      publicId: result.public_id,
    });

    return NextResponse.json(
      {
        success: true,
        frame: { ...frame.toObject(), id: frame._id.toString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading frame:", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload frame" },
      { status: 500 }
    );
  }
}

// DELETE /api/frames?id=xxx — delete a frame from DB and Cloudinary
export async function DELETE(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Frame ID is required" },
        { status: 400 }
      );
    }

    const frame = await PhotoFrame.findById(id);
    if (!frame) {
      return NextResponse.json(
        { success: false, message: "Frame not found" },
        { status: 404 }
      );
    }

    // Delete from Cloudinary first
    if (frame.publicId) {
      try {
        await cloudinary.uploader.destroy(frame.publicId);
      } catch (cloudErr) {
        console.warn("Failed to delete frame from Cloudinary:", cloudErr.message);
      }
    }

    await PhotoFrame.findByIdAndDelete(id);

    return NextResponse.json(
      { success: true, message: "Frame deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting frame:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete frame" },
      { status: 500 }
    );
  }
}
