import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import User from "@/models/User";

async function getMonthlyAttendance(classId, subjectId, month, year) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const studentAttendances = await StudentAttendance.find({
    studentId: { $in: await getUsers(classId) },
    "attendanceRecords.date": { $gte: startDate, $lte: endDate },
    "attendanceRecords.subjectId": subjectId,
  }).populate("studentId", "name");

  const formatted = studentAttendances.reduce((acc, record) => {
    const studentId = record.studentId._id.toString();
    acc[studentId] = {};
    record.attendanceRecords.forEach((att) => {
      const attDate = new Date(att.date);
      if (
        att.subjectId.toString() === subjectId &&
        attDate.getFullYear() === year &&
        attDate.getMonth() === month
      ) {
        acc[studentId][attDate.getDate()] = att.present;
      }
    });
    return acc;
  }, {});

  return formatted;
}

async function getUsers(classId) {
  const users = await User.find({ "studentSpecificField.classId": classId, roles: "Student", "studentSpecificField.status": "Active" }).select("_id");
  return users.map(u => u._id);
}

export async function GET(req) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const month = parseInt(url.searchParams.get("month"));
    const year = parseInt(url.searchParams.get("year"));

    if (!classId || !subjectId || isNaN(month) || isNaN(year)) {
      return apiResponse.error("Missing required query parameters.", 400);
    }

    const attendance = await getMonthlyAttendance(classId, subjectId, month, year);

    return NextResponse.json({ attendance }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}
