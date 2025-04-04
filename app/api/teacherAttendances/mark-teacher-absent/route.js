import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import { markAbsentTeachers } from "@/lib/teacherAttendanceService";

export async function POST(req) {
  try {
    await connectToDB();

    const today = new Date();
    const dateString = today.toISOString().split("T")[0];

    const result = await markAbsentTeachers(dateString);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to mark absent teachers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
