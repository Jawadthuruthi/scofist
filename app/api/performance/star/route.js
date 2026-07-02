import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import Class from "@/models/Class";
import StudentAttendance from "@/models/StudentAttendance";
import StudentMasjidAttendance from "@/models/StudentMasjidAttendance";
import StudentLiteraryAttendance from "@/models/StudentLiteraryAttendance";
import Remark from "@/models/Remark";
import Performance from "@/models/Performance";
import LeaveRecord from "@/models/LeaveRecord";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

function getAttendancePoints(percentage) {
  if (percentage >= 100) return 10;
  if (percentage >= 90) return 9;
  if (percentage >= 80) return 8;
  if (percentage >= 70) return 7;
  if (percentage >= 60) return 6;
  if (percentage >= 50) return 5;
  if (percentage >= 40) return 4;
  if (percentage >= 30) return 3;
  if (percentage >= 20) return 2;
  if (percentage >= 10) return 1;
  return 0;
}

function getStatusPoints(status) {
  switch (status?.toLowerCase()) {
    case "advanced": return 10;
    case "very good": return 8;
    case "good": return 6;
    case "acceptable": return 4;
    case "unsatisfied": return -2;
    case "poor": return -4;
    case "bad": return -6;
    case "very bad": return -6;
    default: return 0;
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const month = parseInt(searchParams.get("month"));
    const year = parseInt(searchParams.get("year"));

    if (!classId || !month || !year) {
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    await connectToDB();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Get all students in the class
    const students = await User.find({
      "studentSpecificField.classId": classId,
      "roles": "Student",
      "studentSpecificField.status": "Active"
    }).lean();

    if (!students || students.length === 0) {
      return NextResponse.json({ success: false, message: "No active students found in this class." });
    }

    const studentMap = {};
    students.forEach(s => {
      studentMap[s._id.toString()] = {
        id: s._id.toString(),
        name: s.name,
        profilePic: s.profilePic?.url || null,
        scores: {
          regularAttendance: 0,
          masjidAttendance: 0,
          literaryAttendance: 0,
          remarks: 0,
          performance: 0,
          leaves: 10 // Default to 10 points if no leaves
        },
        stats: {
          regular: { total: 0, present: 0 },
          masjid: { total: 0, present: 0 },
          literary: { total: 0, present: 0 }
        }
      };
    });

    const studentIds = Object.keys(studentMap);

    // 2-7. Run all independent queries in parallel
    const [regAtt, masAtt, litAtt, remarks, performances, leaves] = await Promise.all([
      StudentAttendance.find({ "attendanceRecords.classId": classId }).lean(),
      StudentMasjidAttendance.find({ "attendanceRecords.classId": classId }).lean(),
      StudentLiteraryAttendance.find({ studentId: { $in: studentIds } }).lean(),
      Remark.find({ studentId: { $in: studentIds }, date: { $gte: startDate, $lte: endDate } }).lean(),
      Performance.find({ studentId: { $in: studentIds }, date: { $gte: startDate, $lte: endDate } }).lean(),
      LeaveRecord.find({ studentId: { $in: studentIds }, dateOfLeave: { $gte: startDate, $lte: endDate } }).lean()
    ]);

    // Process Regular Attendance
    regAtt.forEach(doc => {
      const sid = doc.studentId.toString();
      if (!studentMap[sid]) return;
      doc.attendanceRecords.forEach(record => {
        const recDate = new Date(record.date);
        if (record.classId.toString() === classId && recDate >= startDate && recDate <= endDate) {
          studentMap[sid].stats.regular.total += 1;
          if (record.present) studentMap[sid].stats.regular.present += 1;
        }
      });
    });

    // Process Masjid Attendance
    masAtt.forEach(doc => {
      const sid = doc.studentId.toString();
      if (!studentMap[sid]) return;
      doc.attendanceRecords.forEach(record => {
        const recDate = new Date(record.date);
        if (record.classId.toString() === classId && recDate >= startDate && recDate <= endDate) {
          studentMap[sid].stats.masjid.total += 1;
          if (record.present) studentMap[sid].stats.masjid.present += 1;
        }
      });
    });

    // Process Literary Attendance
    litAtt.forEach(doc => {
      const sid = doc.studentId.toString();
      if (!studentMap[sid]) return;
      doc.attendanceRecords.forEach(record => {
        const recDate = new Date(record.date);
        if (recDate >= startDate && recDate <= endDate) {
          studentMap[sid].stats.literary.total += 1;
          if (record.present) studentMap[sid].stats.literary.present += 1;
        }
      });
    });

    // Calculate attendance points
    for (const sid of studentIds) {
      const s = studentMap[sid];
      
      const regPct = s.stats.regular.total > 0 ? (s.stats.regular.present / s.stats.regular.total) * 100 : 0;
      s.scores.regularAttendance = getAttendancePoints(regPct);

      const masPct = s.stats.masjid.total > 0 ? (s.stats.masjid.present / s.stats.masjid.total) * 100 : 0;
      s.scores.masjidAttendance = getAttendancePoints(masPct);

      const litPct = s.stats.literary.total > 0 ? (s.stats.literary.present / s.stats.literary.total) * 100 : 0;
      s.scores.literaryAttendance = getAttendancePoints(litPct);
    }

    // Process Remarks
    remarks.forEach(remark => {
      const sid = remark.studentId.toString();
      if (!studentMap[sid]) return;
      studentMap[sid].scores.remarks += getStatusPoints(remark.status);
    });

    // Process Performance
    performances.forEach(perf => {
      const sid = perf.studentId.toString();
      if (!studentMap[sid]) return;
      studentMap[sid].scores.performance += getStatusPoints(perf.status);
    });

    // Process Leaves

    const studentsWithLeaves = new Set();
    leaves.forEach(leave => {
      const sid = leave.studentId.toString();
      if (!studentMap[sid]) return;
      
      if (!studentsWithLeaves.has(sid)) {
        studentsWithLeaves.add(sid);
        studentMap[sid].scores.leaves = 0; // Remove the default 10 points
      }
      
      studentMap[sid].scores.leaves += getStatusPoints(leave.remark);
    });

    // Determine the Star (highest total score)
    let bestStudent = null;
    let maxScore = -Infinity;

    for (const sid of studentIds) {
      const s = studentMap[sid];
      const total = s.scores.regularAttendance + s.scores.masjidAttendance + s.scores.literaryAttendance + s.scores.remarks + s.scores.performance + s.scores.leaves;
      
      // We only consider students who have at least one record of any kind (or you could just rank everyone)
      // Actually, let's rank everyone.
      if (total > maxScore) {
        maxScore = total;
        bestStudent = {
          student: { id: s.id, name: s.name, profilePic: s.profilePic },
          breakdown: s.scores,
          totalScore: total
        };
      }
    }

    if (!bestStudent) {
      return NextResponse.json({ success: false, message: "No data available to calculate Star of the Month." });
    }

    const [classDoc, settings] = await Promise.all([
      Class.findById(classId).lean(),
      Settings.findOne().lean()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...bestStudent,
        className: classDoc ? classDoc.name : "Unknown Class",
        institutionName: settings?.institution?.name || "Institution Name",
      }
    });

  } catch (error) {
    console.error("Star of the Month Error:", error);
    return NextResponse.json({ success: false, message: "Server error", error: error.message }, { status: 500 });
  }
}
