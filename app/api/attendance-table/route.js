import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Attendance from "@/models/Attendance.js";
import TimeTable from "@/models/TimeTable.js";

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const month = parseInt(url.searchParams.get("month"));
    const year = parseInt(url.searchParams.get("year"));

    if (!classId || !month || !year) {
      return NextResponse.json(
        { message: "classId, month, and year are required" },
        { status: 400 }
      );
    }

    const subjectTeacherPairs = {};

    // 1. Fetch TimeTable for the class to get scheduled pairs
    const timeTables = await TimeTable.find({ classId }).populate([
      { path: "timeSlots.subjectId", select: "name" },
      { path: "timeSlots.teacherId", select: "name" },
    ]);

    if (timeTables) {
      timeTables.forEach((tt) => {
        tt.timeSlots.forEach((p) => {
          if (p.subjectId && p.teacherId) {
            const key = `${p.subjectId._id.toString()}-${p.teacherId._id.toString()}`;
            if (!subjectTeacherPairs[key]) {
              subjectTeacherPairs[key] = {
                subjectId: p.subjectId._id.toString(),
                subjectName: p.subjectId.name,
                teacherId: p.teacherId._id.toString(),
                teacherName: p.teacherId.name,
              };
            }
          }
        });
      });
    }

    // 2. Fetch attendance for the month and merge in any new pairs
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await Attendance.find({
      classId,
      date: { $gte: startDate, $lte: endDate },
    }).populate([
      { path: "subjectId", select: "name" },
      { path: "teacherId", select: "name" },
    ]);

    attendances.forEach((att) => {
      if (att.subjectId && att.teacherId) {
        const key = `${att.subjectId._id.toString()}-${att.teacherId._id.toString()}`;
        if (!subjectTeacherPairs[key]) {
          subjectTeacherPairs[key] = {
            subjectId: att.subjectId._id.toString(),
            subjectName: att.subjectId.name,
            teacherId: att.teacherId._id.toString(),
            teacherName: att.teacherId.name,
          };
        }
      }
    });

    const uniquePairs = Object.values(subjectTeacherPairs).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    );

    // 3. Create a Set for quick lookups of marked attendance
    const markedAttendances = new Set();
    attendances.forEach((att) => {
      const isoDate = new Date(att.date).toISOString().split("T")[0];
      const key = `${isoDate}-${att.subjectId._id.toString()}-${att.teacherId._id.toString()}`;
      markedAttendances.add(key);
    });

    // 4. Create columns for the table
    const columns = [
      {
        Header: "Date",
        accessor: "date",
      },
      ...uniquePairs.map((pair) => ({
        Header: `${pair.subjectName} (${pair.teacherName})`,
        accessor: `${pair.subjectId}-${pair.teacherId}`,
      })),
    ];

    // 5. Create table data
    const daysInMonth = endDate.getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) =>
      new Date(year, month - 1, i + 1)
    );

    const tableData = dates.map((date) => {
      const isoDate = date.toISOString().split("T")[0];
      const row = { date: isoDate };

      uniquePairs.forEach((pair) => {
        const accessor = `${pair.subjectId}-${pair.teacherId}`;
        const lookupKey = `${isoDate}-${pair.subjectId}-${pair.teacherId}`;
        row[accessor] = markedAttendances.has(lookupKey);
      });

      return row;
    });

    return NextResponse.json({ tableData, columns });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
