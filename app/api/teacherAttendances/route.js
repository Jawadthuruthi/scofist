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

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
    }
    if (filterParams.date) {
      query.date = filterParams.date;
    }
    if (filterParams.startDate && filterParams.endDate) {
      query.date = { $gte: filterParams.startDate, $lte: filterParams.endDate };
    }

    // Execute query with pagination
    const teacherAttendances = await TeacherAttendance.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ date: -1 })
      .populate("teacherId", "name")
      .populate({
        path: "attendanceRecords.classId",
        select: "name",
      })
      .populate({
        path: "attendanceRecords.subjectId",
        select: "name",
      });

    // Get total count for pagination info
    const total = await TeacherAttendance.countDocuments(query);

    return NextResponse.json(
      {
        teacherAttendances,
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
    const requiredFields = ["teacherId", "date", "attendanceRecords"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if attendance record exists for this teacher and date
    const existingRecord = await TeacherAttendance.findOne({
      teacherId: body.teacherId,
      date: body.date,
    });

    let teacherAttendance;

    if (existingRecord) {
      // Update existing record
      existingRecord.attendanceRecords = [
        ...existingRecord.attendanceRecords,
        ...body.attendanceRecords.filter(
          (newRecord) =>
            !existingRecord.attendanceRecords.some(
              (existingItem) =>
                existingItem.classId === newRecord.classId &&
                existingItem.subjectId === newRecord.subjectId &&
                existingItem.periodNumber === newRecord.periodNumber
            )
        ),
      ];

      teacherAttendance = await existingRecord.save();
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
    const { _id, ...data } = body;

    const updatedTeacherAttendance = await TeacherAttendance.findOneAndUpdate(
      { _id },
      data,
      {
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json(
      {
        updatedTeacherAttendance,
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

    const { ids } = await req.json();
    const _id = ids[0];

    if (ids.length > 1) {
      const deletedTeacherAttendance = await TeacherAttendance.deleteMany({
        _id: { $in: ids },
      });

      return NextResponse.json(
        {
          deletedTeacherAttendance,
          message: "Teacher attendance records deleted successfully",
        },
        { status: 200 }
      );
    }

    const deletedTeacherAttendance = await TeacherAttendance.findByIdAndDelete(
      _id
    );

    return NextResponse.json(
      {
        deletedTeacherAttendance,
        message: "Teacher attendance record deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
