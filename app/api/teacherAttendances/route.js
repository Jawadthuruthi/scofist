import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import { markAbsentTeachers } from "@/lib/teacherAttendanceService";
import TeacherAttendance from "@/models/TeacherAttendance";
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
    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
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
    let teacherAttendances = await TeacherAttendance.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .populate("teacherId", "name")
      .populate("attendanceRecords.classId", "name")
      .populate("attendanceRecords.subjectId", "name");

    // Filter attendance records by date if needed
    if (dateFilter) {
      teacherAttendances = teacherAttendances.map((record) => {
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

    const formattedStudentAttendances = teacherAttendances.map((record) => ({
      id: record.teacherId?._id,
      name: record.teacherId?.name,
      attendanceRecords: record.attendanceRecords.map((attendance) => ({
        ...attendance.toObject(),
        classId: attendance.classId?._id,
        className: attendance.classId?.name,
        subjectId: attendance.subjectId?._id,
        subjectName: attendance.subjectId?.name,
      })),
    }));

    // Get total count for pagination info
    const total = await TeacherAttendance.countDocuments(query);

    return NextResponse.json(
      {
        teacherAttendances: formattedStudentAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) - 1,
        },
        message: "Teacher attendance records fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json();

    // Check if this is a request to mark absent teachers
    if (body.action === "markAbsent" && body.date) {
      const result = await markAbsentTeachers(body.date);
      return NextResponse.json(result, { status: 200 });
    }

    // Validate required fields for manual teacher attendance creation
    const requiredFields = ["teacherId", "attendanceRecords"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Make sure each attendance record has a date
    for (const record of body.attendanceRecords) {
      if (!record.date) {
        return NextResponse.json(
          { message: "Each attendance record must have a date" },
          { status: 400 }
        );
      }
    }

    // Check if attendance record exists for this teacher
    let teacherAttendance = await TeacherAttendance.findOne({
      teacherId: body.teacherId,
    });

    if (teacherAttendance) {
      // Update existing record - add new attendance records
      const newRecords = [];

      for (const newRecord of body.attendanceRecords) {
        const existingIndex = teacherAttendance.attendanceRecords.findIndex(
          (existing) =>
            existing.classId.toString() === newRecord.classId.toString() &&
            existing.subjectId.toString() === newRecord.subjectId.toString() &&
            existing.periodNumber === newRecord.periodNumber &&
            existing.day === newRecord.day &&
            existing.date === newRecord.date
        );

        if (existingIndex === -1) {
          newRecords.push(newRecord);
        } else {
          // Update existing record
          teacherAttendance.attendanceRecords[existingIndex] = {
            ...teacherAttendance.attendanceRecords[existingIndex].toObject(),
            ...newRecord,
            markedAt: new Date(),
          };
        }
      }

      teacherAttendance.attendanceRecords.push(...newRecords);
      await teacherAttendance.save();
    } else {
      // Create new record
      teacherAttendance = await TeacherAttendance.create(body);
    }

    return NextResponse.json(
      {
        teacherAttendance,
        message: "Teacher attendance created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { teacherId, attendanceRecordIds, updates } = body;

    if (!teacherId || !attendanceRecordIds || !updates) {
      return NextResponse.json(
        { message: "teacherId, attendanceRecordIds, and updates are required" },
        { status: 400 }
      );
    }

    const teacherAttendance = await TeacherAttendance.findOne({ teacherId });

    if (!teacherAttendance) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    // Update specific attendance records
    attendanceRecordIds.forEach((recordId) => {
      const recordIndex = teacherAttendance.attendanceRecords.findIndex(
        (record) => record?._id.toString() === recordId
      );

      if (recordIndex !== -1) {
        teacherAttendance.attendanceRecords[recordIndex] = {
          ...teacherAttendance.attendanceRecords[recordIndex].toObject(),
          ...updates,
          markedAt: new Date(),
        };
      }
    });

    await teacherAttendance.save();

    return NextResponse.json(
      {
        teacherAttendance,
        message: "Teacher attendance record updated successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { teacherId, attendanceRecordIds } = await req.json();

    if (!teacherId || !attendanceRecordIds || !attendanceRecordIds.length) {
      return NextResponse.json(
        { message: "teacherId and attendanceRecordIds are required" },
        { status: 400 }
      );
    }

    const teacherAttendance = await TeacherAttendance.findOne({ teacherId });

    if (!teacherAttendance) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    // Remove specific attendance records
    teacherAttendance.attendanceRecords =
      teacherAttendance.attendanceRecords.filter(
        (record) => !attendanceRecordIds.includes(record?._id.toString())
      );

    await teacherAttendance.save();

    return NextResponse.json(
      {
        message: "Attendance records deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
