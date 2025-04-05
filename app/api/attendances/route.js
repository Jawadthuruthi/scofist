import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import { markTeacherAttendanceFromStudentAttendance } from "@/lib/teacherAttendanceService";
import Attendance from "@/models/Attendance";
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

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams.classId) {
      query.classId = filterParams.classId;
    }
    if (filterParams.batchId) {
      query.batchId = filterParams.batchId;
    }
    if (filterParams.subjectId) {
      query.subjectId = filterParams.subjectId;
    }
    if (filterParams.periodNumber) {
      query.periodNumber = parseInt(filterParams.periodNumber);
    }
    if (filterParams.date) {
      query.date = filterParams.date;
    } else if (filterParams.startDate && filterParams.endDate) {
      query.date = {
        $gte: filterParams.startDate,
        $lte: filterParams.endDate,
      };
    } else if (filterParams.startDate) {
      query.date = { $gte: filterParams.startDate };
    } else if (filterParams.endDate) {
      query.date = { $lte: filterParams.endDate };
    }
    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
    }
    if (filterParams.day) {
      query.day = filterParams.day;
    }

    // Execute query with pagination
    const attendances = await Attendance.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ date: -1 })
      .populate("classId", "name")
      .populate("batchId", "name")
      .populate("subjectId", "name")
      .populate("teacherId", "name")
      .populate({
        path: "attendanceData.studentId",
        select: "name _id",
      });

    // Get total count for pagination info
    const total = await Attendance.countDocuments(query);

    return NextResponse.json(
      {
        attendances,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) - 1,
        },
        message: "Attendance records fetched successfully!",
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

    // Validate required fields
    const requiredFields = [
      "classId",
      "batchId",
      "subjectId",
      "teacherId",
      "periodNumber",
      "day",
      "date",
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const newAttendance = await Attendance.create(body);
    await markTeacherAttendanceFromStudentAttendance(newAttendance);
    const bulkOps = newAttendance.attendanceData.map((student) => {
      return {
        updateOne: {
          filter: { studentId: student.studentId },
          update: {
            $push: {
              attendanceRecords: {
                classId: newAttendance.classId,
                batchId: newAttendance.batchId,
                subjectId: newAttendance.subjectId,
                periodNumber: newAttendance.periodNumber,
                day: newAttendance.day,
                date: newAttendance.date,
                present: student.present,
              },
            },
          },
          upsert: true,
        },
      };
    });

    // Execute the bulk operation if there are students
    if (bulkOps.length > 0) {
      await StudentAttendance.bulkWrite(bulkOps);
    }

    return NextResponse.json(
      {
        attendance: newAttendance,
        message: "Attendance created successfully!",
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle duplicate key error for unique attendance records
    if (error.code === 11000) {
      return NextResponse.json(
        {
          error:
            "Attendance record already exists for this class, subject, period and date",
        },
        { status: 400 }
      );
    }
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { _id, ...data } = body;

    const updatedAttendance = await Attendance.findOneAndUpdate({ _id }, data, {
      new: true,
      runValidators: true,
    });

    if (data.attendanceData) {
      const bulkOps = updatedAttendance.attendanceData.map((student) => {
        return {
          updateOne: {
            filter: {
              studentId: student.studentId,
              "attendanceRecords.date": updatedAttendance.date,
              "attendanceRecords.classId": updatedAttendance.classId,
              "attendanceRecords.batchId": updatedAttendance.batchId,
              "attendanceRecords.subjectId": updatedAttendance.subjectId,
              "attendanceRecords.periodNumber": updatedAttendance.periodNumber,
            },
            update: {
              $set: { "attendanceRecords.$.present": student.present },
            },
          },
        };
      });

      // Execute the bulk operation if there are students
      if (bulkOps.length > 0) {
        await StudentAttendance.bulkWrite(bulkOps);
      }
    }
    return NextResponse.json(
      { updatedAttendance, message: "Attendance record updated successfully!" },
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
      const deletedAttendance = await Attendance.deleteMany({
        _id: { $in: ids },
      });

      const bulkOps = [];

      for (const attendance of deletedAttendance) {
        for (const student of attendance.attendanceData) {
          bulkOps.push({
            updateOne: {
              filter: { studentId: student.studentId },
              update: {
                $pull: {
                  attendanceRecords: {
                    classId: attendance.classId,
                    batchId: attendance.batchId,
                    subjectId: attendance.subjectId,
                    date: attendance.date,
                    periodNumber: attendance.periodNumber,
                  },
                },
              },
            },
          });
        }
      }

      // Execute student attendance updates in bulk
      if (bulkOps.length > 0) {
        await StudentAttendance.bulkWrite(bulkOps);
      }
      return NextResponse.json(
        {
          deletedAttendance,
          message: "Attendance records deleted successfully!",
        },
        { status: 200 }
      );
    }
    const deletedAttendance = await Attendance.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedAttendance, message: "Attendance record deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
