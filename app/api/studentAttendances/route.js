import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query
    const query = {};
    if (filterParams.studentId) {
      query.studentId = filterParams.studentId;
    }

    // Handle date filtering
    let dateFilter = null;
    if (filterParams.date) {
      dateFilter = { date: filterParams.date };
    } else if (filterParams.startDate && filterParams.endDate) {
      dateFilter = {
        date: { $gte: filterParams.startDate, $lte: filterParams.endDate },
      };
    }

    // Execute query with pagination
    let studentAttendances = await StudentAttendance.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .populate("studentId", "name")
      .populate("attendanceRecords.classId", "name")
      .populate("attendanceRecords.subjectId", "name");

    // Filter attendance records by date if needed
    if (dateFilter) {
      studentAttendances = studentAttendances.map((record) => {
        const filteredAttendance = { ...record.toObject() };

        if (dateFilter.date) {
          filteredAttendance.attendanceRecords =
            filteredAttendance.attendanceRecords.filter(
              (r) => r.date === dateFilter.date
            );
        } else {
          filteredAttendance.attendanceRecords =
            filteredAttendance.attendanceRecords.filter(
              (r) =>
                r.date >= dateFilter.date.$gte && r.date <= dateFilter.date.$lte
            );
        }

        return filteredAttendance;
      });
    }

    const formattedStudentAttendances = studentAttendances.map((record) => ({
      id: record.studentId?._id,
      name: record.studentId?.name,
      attendanceRecords: record.attendanceRecords.map((attendance) => ({
        ...attendance.toObject(),
        className: attendance.classId?.name,
        subjectName: attendance.subjectId?.name,
        classId: attendance.classId?._id,
        subjectId: attendance.subjectId?._id,
      })),
    }));

    // Get total count for pagination info
    const total = await StudentAttendance.countDocuments(query);

    return NextResponse.json(
      {
        studentAttendances: formattedStudentAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit) - 1),
        },
        message: "Teacher attendance records fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
