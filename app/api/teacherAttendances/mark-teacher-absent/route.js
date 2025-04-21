import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import { markAbsentTeachers } from "@/lib/teacherAttendanceService";

export async function GET(req) {
  try {
    await connectToDB();

    // Get today's date in IST (UTC+5:30)
    const today = new Date();
    // Add 5 hours and 30 minutes to convert to IST
    const istTime = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);
    const dateString = istTime.toISOString().split("T")[0];

    // Set a timeout for the operation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), 50000)
    );

    // Race the operation against the timeout
    const result = await Promise.race([
      markAbsentTeachers(dateString),
      timeoutPromise,
    ]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to mark absent teachers:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
