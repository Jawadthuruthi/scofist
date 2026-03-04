import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Attendance from "@/models/Attendance";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId");
        const month = parseInt(url.searchParams.get("month"));
        const year = parseInt(url.searchParams.get("year"));

        if (!studentId) {
            return NextResponse.json(
                { message: "studentId is required" },
                { status: 400 }
            );
        }

        // Build date range filter
        const dateFilter = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);
            dateFilter.date = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(year, 11, 31);
            endDate.setHours(23, 59, 59, 999);
            dateFilter.date = { $gte: startDate, $lte: endDate };
        }

        // Query attendance records that include this student
        const attendances = await Attendance.find({
            "attendanceData.studentId": studentId,
            ...dateFilter,
        })
            .populate({ path: "subjectId", select: "name" })
            .populate({ path: "teacherId", select: "name" })
            .populate({ path: "classId", select: "name" })
            .sort({ date: -1 })
            .lean();

        // Extract per-record data for this student
        const records = attendances.map((att) => {
            const studentEntry = att.attendanceData?.find(
                (d) => String(d.studentId) === String(studentId)
            );
            return {
                date: att.date,
                subjectName: att.subjectId?.name || "—",
                teacherName: att.teacherId?.name || "—",
                className: att.classId?.name || "—",
                periodNumber: att.periodNumber,
                present: studentEntry?.present ?? null,
            };
        });

        return NextResponse.json({ records }, { status: 200 });
    } catch (error) {
        console.error("student-attendance-lookup error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
