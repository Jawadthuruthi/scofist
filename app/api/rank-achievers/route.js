import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import RankAchiever from "@/models/RankAchiever";
import cloudinary from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// Helper to check if requester can mutate (College Admin, not Teacher)
function isTeacher(req) {
  const activeRole =
    req.cookies?.get("active-role")?.value ||
    req.headers?.get("active-role");
  return activeRole === "Teacher";
}

// GET /api/rank-achievers - list all rank achievers
export async function GET() {
  try {
    await connectToDB();
    const achievers = await RankAchiever.find({}).lean();

    // Sort by Year descending, then Rank ascending
    achievers.sort((a, b) => {
      const yearComp = String(b.year || "").localeCompare(
        String(a.year || ""),
        undefined,
        { numeric: true }
      );
      if (yearComp !== 0) return yearComp;

      const rankNumA = parseInt(String(a.rank || "").replace(/\D/g, ""), 10);
      const rankNumB = parseInt(String(b.rank || "").replace(/\D/g, ""), 10);
      if (!isNaN(rankNumA) && !isNaN(rankNumB)) {
        return rankNumA - rankNumB;
      }
      return String(a.rank || "").localeCompare(String(b.rank || ""));
    });

    return NextResponse.json(
      {
        success: true,
        rankAchievers: achievers.map((item) => ({
          ...item,
          _id: item._id.toString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching rank achievers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch rank achievers", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/rank-achievers - add a new rank achiever (College Admin only)
export async function POST(req) {
  try {
    if (isTeacher(req)) {
      return NextResponse.json(
        { success: false, message: "Teachers are authorized for view-only access" },
        { status: 403 }
      );
    }

    await connectToDB();
    const body = await req.json();
    const { name, rank, year, course, college, photo } = body;

    if (!name?.trim() || !rank?.trim() || !year?.trim() || !course?.trim() || !college?.trim()) {
      return NextResponse.json(
        { success: false, message: "Name, rank, year, course, and college are required" },
        { status: 400 }
      );
    }

    const newAchiever = await RankAchiever.create({
      name: name.trim(),
      rank: rank.trim(),
      year: year.trim(),
      course: course.trim(),
      college: college.trim(),
      photo: {
        url: photo?.url?.trim() || "",
        publicId: photo?.publicId?.trim() || "",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Rank achiever added successfully",
        rankAchiever: {
          ...newAchiever.toObject(),
          _id: newAchiever._id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating rank achiever:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create rank achiever", error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/rank-achievers - update a rank achiever (College Admin only)
export async function PUT(req) {
  try {
    if (isTeacher(req)) {
      return NextResponse.json(
        { success: false, message: "Teachers are authorized for view-only access" },
        { status: 403 }
      );
    }

    await connectToDB();
    const body = await req.json();
    const { id, _id, name, rank, year, course, college, photo } = body;
    const targetId = id || _id;

    if (!targetId) {
      return NextResponse.json(
        { success: false, message: "Achiever ID is required" },
        { status: 400 }
      );
    }

    const existing = await RankAchiever.findById(targetId);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Rank achiever not found" },
        { status: 404 }
      );
    }

    // If photo publicId changed, optionally destroy old one
    if (
      existing.photo?.publicId &&
      photo?.publicId &&
      existing.photo.publicId !== photo.publicId
    ) {
      try {
        await cloudinary.uploader.destroy(existing.photo.publicId);
      } catch (err) {
        console.warn("Failed to delete previous Cloudinary image:", err.message);
      }
    }

    if (name !== undefined) existing.name = name.trim();
    if (rank !== undefined) existing.rank = rank.trim();
    if (year !== undefined) existing.year = year.trim();
    if (course !== undefined) existing.course = course.trim();
    if (college !== undefined) existing.college = college.trim();
    if (photo !== undefined) {
      existing.photo = {
        url: photo?.url?.trim() || "",
        publicId: photo?.publicId?.trim() || "",
      };
    }

    await existing.save();

    return NextResponse.json(
      {
        success: true,
        message: "Rank achiever updated successfully",
        rankAchiever: {
          ...existing.toObject(),
          _id: existing._id.toString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating rank achiever:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update rank achiever", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/rank-achievers - delete a rank achiever (College Admin only)
export async function DELETE(req) {
  try {
    if (isTeacher(req)) {
      return NextResponse.json(
        { success: false, message: "Teachers are authorized for view-only access" },
        { status: 403 }
      );
    }

    await connectToDB();
    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id || body?._id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Achiever ID is required" },
        { status: 400 }
      );
    }

    const achiever = await RankAchiever.findById(id);
    if (!achiever) {
      return NextResponse.json(
        { success: false, message: "Rank achiever not found" },
        { status: 404 }
      );
    }

    if (achiever.photo?.publicId) {
      try {
        await cloudinary.uploader.destroy(achiever.photo.publicId);
      } catch (cloudErr) {
        console.warn("Failed to delete image from Cloudinary:", cloudErr.message);
      }
    }

    await RankAchiever.findByIdAndDelete(id);

    return NextResponse.json(
      { success: true, message: "Rank achiever deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting rank achiever:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete rank achiever", error: error.message },
      { status: 500 }
    );
  }
}
