import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import LeaveRecord from "@/models/LeaveRecord";
import User from "@/models/User";

async function getMonthlyLeaveRecords(classId, month, year) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const leaveRecords = await LeaveRecord.find({
    classId: classId,
    dateOfLeave: { $gte: startDate, $lte: endDate },
  }).populate("studentId", "name");

  const formatted = leaveRecords.reduce((acc, record) => {
    const studentId = record.studentId._id.toString();
    if (!acc[studentId]) {
      acc[studentId] = {};
    }
    const date = new Date(record.dateOfLeave).getDate();
    acc[studentId][date] = record.leaveReason;
    return acc;
  }, {});

  return formatted;
}

export async function GET(req) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const month = parseInt(url.searchParams.get("month"));
    const year = parseInt(url.searchParams.get("year"));

    if (!classId || isNaN(month) || isNaN(year)) {
      return apiResponse.error("Missing required query parameters.", 400);
    }

    const leaveRecords = await getMonthlyLeaveRecords(classId, month, year);

    return NextResponse.json({ leaveRecords }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}
