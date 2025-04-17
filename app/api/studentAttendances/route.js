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
      dateFilter = { date: new Date(filterParams.date) };
    } else if (filterParams.startDate && filterParams.endDate) {
      dateFilter = {
        date: {
          $gte: new Date(`${filterParams.startDate}T00:00:00.000Z`),
          $lte: new Date(`${filterParams.endDate}T23:59:59.999Z`),
        },
      };
    } else if (filterParams.startDate) {
      dateFilter = {
        date: { $gte: new Date(`${filterParams.startDate}T00:00:00.000Z`) },
      };
    } else if (filterParams.endDate) {
      dateFilter = {
        date: { $lte: new Date(`${filterParams.endDate}T23:59:59.999Z`) },
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

        // Ensure dates are compared correctly as Date objects
        filteredAttendance.attendanceRecords =
          filteredAttendance.attendanceRecords.filter((r) => {
            const recordDate = new Date(r.date);

            if (dateFilter.date instanceof Date) {
              // Exact date match
              return (
                recordDate.toISOString().split("T")[0] ===
                dateFilter.date.toISOString().split("T")[0]
              );
            } else {
              // Range match
              const { $gte, $lte } = dateFilter.date;
              return (
                recordDate >= new Date($gte) && recordDate <= new Date($lte)
              );
            }
          });

        return filteredAttendance;
      });
    }

    const formattedStudentAttendances = studentAttendances.map((record) => ({
      _id: record.studentId?._id,
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
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Teacher attendance records fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
