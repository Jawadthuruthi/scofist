import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import LiteraryAttendance from "@/models/LiteraryAttendance";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);

    const trackAbsentees = url.searchParams.get("trackAbsentees") === "true";

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      filterParams[key] = value;
    }

    const query = {};

    if (filterParams.date) {
      const date = new Date(filterParams.date);
      query.date = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    const literaryAttendances = await LiteraryAttendance.find(query)
      .populate("groupId", "name")
      .populate("classId", "name")
      .populate("batchId", "name")
      .populate("attendanceData.studentId", ["name", "profilePic"]);

    let formattedAttendances = literaryAttendances.map((attendance) => {
      return {
        ...attendance.toObject(),
        date: new Date(attendance.date).toISOString().slice(0, 10), // Format date to YYYY-MM-DD
        groupId: attendance?.groupId?._id,
        groupDetails: attendance?.groupId,
        classId: attendance?.classId?._id,
        classDetails: attendance?.classId,
        batchId: attendance?.batchId?._id,
        batchDetails: attendance?.batchId,
        attendanceData: attendance.attendanceData.map((data) => ({
          ...data.toObject(),
          studentId: data.studentId._id,
          studentName: data.studentId.name,
          studentDetails: data.studentId,
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
          if (!studentAbsences[student.studentId]) {
            studentAbsences[student.studentId] = {
              studentId: student.studentId,
              studentName: student.studentName,
              classId: attendance.classId || undefined,
              groupId: attendance.groupId || undefined,
              category: attendance.category,
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
    }

    return NextResponse.json(
      {
        attendances: formattedAttendances,
        absentees: Object.values(studentAbsences)
          .filter((student) => student.continuousAbsences > 0)
          .sort((a, b) => b.continuousAbsences - a.continuousAbsences),

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

    const { groupId, classId, batchId, date, day, attendanceData, category } =
      data;

    const attendance = new LiteraryAttendance({
      ...data,
      date: new Date(date),
    });

    await attendance.save();

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
    const literaryAttendance = await LiteraryAttendance.findByIdAndDelete(ids);
    return NextResponse.json(
      { message: "Literary attendance deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
