import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import { markTeacherAttendanceFromStudentAttendance } from "@/lib/teacherAttendanceService";
import Attendance from "@/models/Attendance";
import StudentAttendance from "@/models/StudentAttendance";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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
      query.date = new Date(filterParams.date);
    } else if (filterParams.startDate && filterParams.endDate) {
      query.date = {
        $gte: new Date(`${filterParams.startDate}T00:00:00.000Z`),
        $lte: new Date(`${filterParams.endDate}T23:59:59.999Z`),
      };
    } else if (filterParams.startDate) {
      query.date = {
        $gte: new Date(`${filterParams.startDate}T00:00:00.000Z`),
      };
    } else if (filterParams.endDate) {
      query.date = { $lte: new Date(`${filterParams.endDate}T23:59:59.999Z`) };
    }

    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
    }
    if (filterParams.day) {
      query.day = filterParams.day;
    }

    // Handle absentee tracking specific query parameter
    const trackAbsentees = url.searchParams.get("trackAbsentees") === "true";

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
        path: "attendanceData",
        populate: {
          path: "studentId",
          select: "name email",
        },
      });

    let formattedAttendances = attendances.map((attendance) => {
      return {
        ...attendance.toObject(),
        attendanceData: attendance.attendanceData.map((student) => ({
          ...student.toObject(),
          studentId: student.studentId?._id,
          studentName: student.studentId?.name,
        })),
      };
    });

    // Enhanced processing for absentee tracking if requested
    if (trackAbsentees) {
      // Group attendance records by students and track continuous absences
      const studentAbsences = {};

      // Process each attendance record
      formattedAttendances.forEach((attendance) => {
        attendance.attendanceData.forEach((student) => {
          if (!studentAbsences[student.studentId]) {
            studentAbsences[student.studentId] = {
              studentId: student.studentId,
              studentName: student.studentName,
              absences: [],
              continuousAbsences: 0,
              lastAbsenceDate: null,
            };
          }

          // Add this absence record
          studentAbsences[student.studentId].absences.push({
            date: attendance.date,
            present: student.present,
          });
        });
      });

      // Calculate continuous absences for each student
      Object.values(studentAbsences).forEach((student) => {
        const istNow = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        const todayIST = new Date(istNow);
        todayIST.setUTCHours(0, 0, 0, 0);
        // Sort absences by date (newest first)
        const studentAbsencesArray = student.absences
          .filter((item) => new Date(item.date) <= todayIST)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Count continuous absences
        for (const absence of studentAbsencesArray) {
          if (!absence.present) {
            student.continuousAbsences++;
            if (!student.lastAbsenceDate) {
              student.lastAbsenceDate = absence.date;
            }
          } else {
            // Break at first presence
            break;
          }
        }
      });

      // Add absentee tracking info to response
      formattedAttendances = {
        ...formattedAttendances,
        absenteeTracking: Object.values(studentAbsences)
          .filter((student) => student.continuousAbsences > 0)
          .sort((a, b) => b.continuousAbsences - a.continuousAbsences),
      };
    }

    // Get total count for pagination info
    const total = await Attendance.countDocuments(query);

    return NextResponse.json(
      {
        attendances: formattedAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
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

    // 🔒 STEP 1: Check if attendance already exists at Attendance level
    const existingAttendance = await Attendance.findOne({
      classId: body.classId,
      batchId: body.batchId,
      subjectId: body.subjectId,
      date: new Date(body.date),
      periodNumber: body.periodNumber,
    });

    if (existingAttendance) {
      return NextResponse.json(
        {
          error: "Attendance already recorded",
          message:
            "Attendance for this class, subject, period and date already exists.",
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create new attendance record
    let newAttendance;
    try {
      newAttendance = await Attendance.create(body);
    } catch (createError) {
      console.error("❌ Attendance Creation/Validation Error:", {
        message: createError.message,
        errors: createError.errors,
        bodyPreview: {
          classId: body.classId,
          batchId: body.batchId,
          subjectId: body.subjectId,
          date: body.date
        }
      });
      throw createError;
    }

    await markTeacherAttendanceFromStudentAttendance(newAttendance);

    // 🔒 STEP 2: Safe update - check for duplicates before adding to student records
    const bulkOps = [];
    let skippedCount = 0;

    for (const student of newAttendance.attendanceData) {
      // Check if this exact attendance record already exists for this student
      const existingRecord = await StudentAttendance.findOne({
        studentId: student.studentId,
        attendanceRecords: {
          $elemMatch: {
            date: new Date(newAttendance.date),
            classId: newAttendance.classId,
            periodNumber: newAttendance.periodNumber,
            subjectId: newAttendance.subjectId,
          },
        },
      });

      if (!existingRecord) {
        // Safe to add - no duplicate
        bulkOps.push({
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
        });
      } else {
        // Skip duplicate
        skippedCount++;
        console.warn(
          `⚠️ Duplicate skipped: Student ${student.studentId} already has attendance for ${newAttendance.date}, period ${newAttendance.periodNumber}`
        );
      }
    }

    // Execute the bulk operation if there are students
    if (bulkOps.length > 0) {
      await StudentAttendance.bulkWrite(bulkOps);
    }

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/time-tables");
    revalidatePath("/dashboard/my-time-table");

    return NextResponse.json(
      {
        attendance: newAttendance,
        message: "Attendance created successfully!",
        studentsUpdated: bulkOps.length,
        ...(skippedCount > 0 && {
          warning: `${skippedCount} students already had this attendance record`,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle duplicate key error for unique attendance records
    if (error.code === 11000) {
      return NextResponse.json(
        {
          error: "Attendance record already exists",
          message: "This attendance has already been recorded.",
        },
        { status: 409 }
      );
    }
    console.error("❌ Attendance POST generic error:", error);
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
    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/time-tables");
    revalidatePath("/dashboard/my-time-table");

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
    console.log("Deleting attendance records with IDs:", ids);
    const _id = ids[0];

    const deletedAttendances = await Attendance.find({ _id: { $in: ids } });
    const bulkOps = [];

    for (const attendance of deletedAttendances) {
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

    if (ids.length > 1) {
      const result = await Attendance.deleteMany({ _id: { $in: ids } });

      // Revalidate paths
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/time-tables");
      revalidatePath("/dashboard/my-time-table");

      return NextResponse.json(
        {
          result,
          message: "Attendance records deleted successfully!",
        },
        { status: 200 }
      );
    }
    const deletedAttendance = await Attendance.findByIdAndDelete(_id);

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/time-tables");
    revalidatePath("/dashboard/my-time-table");

    return NextResponse.json(
      { deletedAttendance, message: "Attendance record deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
