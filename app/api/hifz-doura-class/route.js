import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import HifzDouraClass from "@/models/HifzDouraClass";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const classId = url.searchParams.get("classId");
    const teacherId = url.searchParams.get("teacherId");

    const query = {};
    if (classId) query.classId = classId;
    if (teacherId) query.teacherId = teacherId;

    const enrollments = await HifzDouraClass.find(query)
      .populate("studentId", "name profilePic guardianContactNumber studentSpecificField")
      .populate("classId", "name shortname")
      .populate("teacherId", "name profilePic")
      .sort({ classId: 1 })
      .lean();

    return NextResponse.json(
      {
        enrollments,
        message: "Hifz & Doura enrollments fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { studentIds, classId, teacherId, year } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { message: "At least one student is required" },
        { status: 400 }
      );
    }

    // Upsert each student enrollment
    const results = await Promise.allSettled(
      studentIds.map((studentId) =>
        HifzDouraClass.findOneAndUpdate(
          { studentId },
          { studentId, classId, teacherId, enrolledAt: new Date() },
          { upsert: true, new: true, runValidators: true }
        )
      )
    );

    const enrolled = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json(
      {
        message: `${enrolled} student(s) enrolled successfully${failed > 0 ? `, ${failed} failed` : ""}`,
        enrolled,
        failed,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { data } = body;
    const { ids, teacherId, year } = data || body;

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { message: "No IDs provided" },
        { status: 400 }
      );
    }

    // Update teacher for all given enrollment records
    const updated = await HifzDouraClass.updateMany(
      { _id: { $in: ids } },
      { $set: { teacherId } }
    );

    return NextResponse.json(
      { updated, message: "Enrollment(s) updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();

    const { ids } = await req.json();

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { message: "No IDs provided" },
        { status: 400 }
      );
    }

    const deleted = await HifzDouraClass.deleteMany({ _id: { $in: ids } });

    return NextResponse.json(
      { deleted, message: "Student(s) removed from Hifz & Doura successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
