import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import LiteraryAttendance from "@/models/LiteraryAttendance";
import { apiResponse } from "@/lib/apiResponse";
import StudentLiteraryAttendance from "@/models/StudentLiteraryAttendance";
import { formatDateForDisplay, sortClasses } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0", 10) || 0;
    const limitParam = url.searchParams.get("limit");
    const parsedLimit = limitParam !== null ? parseInt(limitParam, 10) : NaN;
    const isPaginated = !isNaN(parsedLimit) && parsedLimit > 0;
    const limit = isPaginated ? parsedLimit : Infinity;

    const trackAbsentees = url.searchParams.get("trackAbsentees") === "true";
    const trackHistory = url.searchParams.get("trackHistory") === "true";

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    const query = {};

    if (filterParams.date) {
      const date = new Date(filterParams.date);
      query.date = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    if (filterParams.groupId) {
      query.groupId = filterParams.groupId;
    }

    if (filterParams.classId) {
      query.classId = filterParams.classId;
    }

    if (filterParams.batchId) {
      query.batchId = filterParams.batchId;
    }

    if (filterParams.category) {
      query.category = filterParams.category;
    }

    if (filterParams.date || filterParams.startDate || filterParams.endDate) {
      const start = filterParams.date || filterParams.startDate;
      const end = filterParams.date || filterParams.endDate;

      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      query.date = {
        $gte: start ? startDate : undefined,
        $lt: end ? endDate : undefined,
      };
    }

    const literaryAttendances = await LiteraryAttendance.find(
      query,
      projections
    )
      .populate("groupId", "name")
      .populate("classId", "name")
      .populate("batchId", "name")
      .populate({
        path: "attendanceData.studentId",
        select: ["name", "profilePic", "studentSpecificField.classId"],
        populate: {
          path: "studentSpecificField.classId",
          select: "name shortname"
        }
      });

    let formattedAttendances = literaryAttendances.map((attendance) => {
      return {
        ...attendance.toObject(),
        date: new Date(attendance.date).toISOString().slice(0, 10),
        dateForDisplay: formatDateForDisplay(attendance.date),
        groupId: attendance?.groupId?._id || attendance?.groupId,
        groupDetails: typeof attendance?.groupId === 'object' ? attendance?.groupId : undefined,
        classId: attendance?.classId?._id || attendance?.classId,
        classDetails: typeof attendance?.classId === 'object' ? attendance?.classId : undefined,
        batchId: attendance?.batchId?._id || attendance?.batchId,
        batchDetails: typeof attendance?.batchId === 'object' ? attendance?.batchId : undefined,
        attendanceData: attendance.attendanceData.map((data) => ({
          ...data.toObject(),
          studentId: data.studentId._id,
          studentName: data.studentId.name,
          studentDetails: data.studentId,
          className: data.studentId?.studentSpecificField?.classId?.name || (attendance.classId?.name || "—"),
          classShortName: data.studentId?.studentSpecificField?.classId?.shortname || data.studentId?.studentSpecificField?.classId?.name || (attendance.classId?.shortname || attendance.classId?.name || "—")
        })),
      };
    });

    const studentAbsences = {};
    // Enhanced processing for absentee tracking if requested
    if (trackAbsentees) {
      // Group attendance records by students and track continuous absences

      // Process each attendance record
      formattedAttendances.forEach((attendance) => {
        attendance.attendanceData.forEach((student) => {
          const uniqueKey = `${student.studentId}_${attendance.classId || attendance.groupId || "none"}_${attendance.category}`;
          
          if (!studentAbsences[uniqueKey]) {
            studentAbsences[uniqueKey] = {
              studentId: student.studentId,
              studentName: student.studentName,
              className: student.className,
              classShortName: student.classShortName,
              classId: attendance.classId || undefined,
              groupId: attendance.groupId || undefined,
              category: attendance.category,
              absences: [],
              continuousAbsences: 0,
              lastAbsenceDate: null,
            };
          }

          // Add this absence record
          studentAbsences[uniqueKey].absences.push({
            date: attendance.date,
            present: student.present,
            updatedAt: attendance.updatedAt || attendance.createdAt || new Date(0),
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

        // Deduplicate by date, keeping the most recently updated record
        const uniqueAbsencesByDate = {};
        student.absences.forEach((item) => {
          const dateStr = new Date(item.date).toISOString().slice(0, 10);
          if (
            !uniqueAbsencesByDate[dateStr] ||
            new Date(item.updatedAt) > new Date(uniqueAbsencesByDate[dateStr].updatedAt)
          ) {
            uniqueAbsencesByDate[dateStr] = item;
          }
        });

        // Sort absences by date (newest first)
        const studentAbsencesArray = Object.values(uniqueAbsencesByDate)
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
    }

    const absentees = Object.values(studentAbsences)
      .filter((student) => student.continuousAbsences > 0)
      .sort((a, b) => b.continuousAbsences - a.continuousAbsences);

    let attendanceHistory = [];

    if (trackHistory) {
      formattedAttendances?.forEach((attendance) => {
        const dateExists = attendanceHistory.some(
          (item) => item.date === attendance.date && item.category === attendance.category
        );

        if (!dateExists) {
          attendanceHistory.push({
            date: attendance.date,
            dateForDisplay: attendance.dateForDisplay,
            category: attendance.category,
            _id: attendance._id,
          });
        }
      });
    }

    for (const historyItem of attendanceHistory) {
      const dayAbsentees = [];
      const seenStudents = new Set();

      const matchingAttendances = formattedAttendances.filter(
        (att) => att.date === historyItem.date && att.category === historyItem.category
      );

      matchingAttendances.forEach((att) => {
        (att.attendanceData || []).forEach((student) => {
          if (!student.present && !seenStudents.has(student.studentId)) {
            seenStudents.add(student.studentId);
            dayAbsentees.push({
              studentId: student.studentId,
              studentName: student.studentName,
              className: student.className || att.classDetails?.name || att.classId?.name || (att.groupDetails?.name || att.groupId?.name ? `${att.groupDetails?.name || att.groupId?.name}` : "—"),
              classShortName: student.classShortName || att.classDetails?.shortname || att.classId?.shortname || student.className || att.classDetails?.name || att.classId?.name || (att.groupDetails?.name || att.groupId?.name ? `${att.groupDetails?.name || att.groupId?.name}` : "—"),
              groupName: att.groupDetails?.name || att.groupId?.name,
              category: att.category,
              date: historyItem.date,
            });
          }
        });
      });

      dayAbsentees.sort((a, b) => {
        const classComp = sortClasses(a, b, (item) => item.className || "");
        if (classComp !== 0) return classComp;
        const idComp = String(a.studentId || "").localeCompare(String(b.studentId || ""), undefined, { numeric: true });
        if (idComp !== 0) return idComp;
        return (a.studentName || "").localeCompare(b.studentName || "");
      });

      historyItem.absentees = dayAbsentees;
    }

    const total = await LiteraryAttendance.countDocuments(query);

    return NextResponse.json(
      {
        attendances: formattedAttendances,
        absentees,
        history: attendanceHistory,
        pagination: {
          page,
          limit: isPaginated ? limit : total,
          total,
          totalPages: isPaginated ? Math.max(1, Math.ceil(total / limit)) : 1,
        },
        message: "Literary attendances fetched successfully!",
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

    const data = await req.json();
    const { date, classId, groupId, batchId, category } = data;

    // Strict duplicate check to prevent multiple records for same class/date
    const duplicateQuery = {
      date: new Date(date),
      category: category,
    };
    if (classId) duplicateQuery.classId = classId;
    if (groupId) duplicateQuery.groupId = groupId;

    const existingAttendance = await LiteraryAttendance.findOne(duplicateQuery);
    if (existingAttendance) {
      return NextResponse.json(
        {
          error: "Attendance already recorded",
          message: "Attendance for this class/group on this date already exists.",
        },
        { status: 409 }
      );
    }

    const attendance = new LiteraryAttendance({
      ...data,
      date: new Date(date),
    });

    await attendance.save();

    const bulkOps = attendance.attendanceData.map((student) => {
      return {
        updateOne: {
          filter: { studentId: student.studentId },
          update: {
            $push: {
              attendanceRecords: {
                classId: attendance.classId || undefined,
                batchId: attendance.batchId || undefined,
                groupId: attendance.groupId || undefined,
                category: attendance.category,
                day: attendance.day,
                date: attendance.date,
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
      await StudentLiteraryAttendance.bulkWrite(bulkOps);
    }

    revalidatePath("/dashboard/literary-attendance");

    return NextResponse.json(
      { message: "Literary attendance created successfully!" },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const data = await req.json();
    const { _id, attendanceData } = data;

    if (!_id || !attendanceData) {
      return NextResponse.json(
        { message: "ID and attendance data are required!" },
        { status: 400 }
      );
    }

    const attendance = await LiteraryAttendance.findById(_id);
    if (!attendance) {
      return NextResponse.json(
        { message: "Literary attendance not found!" },
        { status: 404 }
      );
    }

    attendance.attendanceData = attendanceData;
    await attendance.save();

    if (data.attendanceData) {
      const bulkOps = attendance.attendanceData.map((student) => {
        return {
          updateOne: {
            filter: {
              studentId: student.studentId,
              "attendanceRecords.date": attendance.date,
              "attendanceRecords.classId": attendance.classId || undefined,
              "attendanceRecords.batchId": attendance.batchId || undefined,
              "attendanceRecords.groupId": attendance.groupId || undefined,
              "attendanceRecords.category": attendance.category,
            },
            update: {
              $set: { "attendanceRecords.$.present": student.present },
            },
          },
        };
      });

      if (bulkOps.length > 0) {
        await StudentLiteraryAttendance.bulkWrite(bulkOps);
      }
    }

    revalidatePath("/dashboard/literary-attendance");

    return NextResponse.json(
      { message: "Literary attendance updated successfully!" },
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

    const deletedAttendances = await LiteraryAttendance.find({
      _id: { $in: ids },
    });
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
                  groupId: attendance.groupId,
                  date: attendance.date,
                  category: attendance.category,
                },
              },
            },
          },
        });
      }
    }

    // Execute student attendance updates in bulk
    if (bulkOps.length > 0) {
      await StudentLiteraryAttendance.bulkWrite(bulkOps);
    }
    if (ids.length > 1) {
      const result = await LiteraryAttendance.deleteMany({ _id: { $in: ids } });

      revalidatePath("/dashboard/literary-attendance");

      return NextResponse.json(
        {
          result,
          message: "Literary Attendance records deleted successfully!",
        },
        { status: 200 }
      );
    }
    const deletedAttendance = await LiteraryAttendance.findByIdAndDelete(_id);

    revalidatePath("/dashboard/literary-attendance");

    return NextResponse.json(
      { message: "Literary attendance deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
