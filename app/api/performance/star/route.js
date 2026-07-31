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

    if (!month || !year) {
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    await connectToDB();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const studentFilter = {
      "roles": "Student",
      "studentSpecificField.status": "Active"
    };
    
    if (classId && classId !== "all") {
      studentFilter["studentSpecificField.classId"] = classId;
    }

    // 1. Get all students
    const students = await User.find(studentFilter).lean();

    if (!students || students.length === 0) {
      return NextResponse.json({ success: false, message: "No active students found." });
    }

    const studentMap = {};
    const classIdsSet = new Set();
    
    students.forEach(s => {
      const sClassId = s.studentSpecificField?.classId?.toString();
      if (sClassId) classIdsSet.add(sClassId);
      
      studentMap[s._id.toString()] = {
        id: s._id.toString(),
        name: s.name,
        profilePic: s.profilePic?.url || null,
        admnNo: s.studentSpecificField?.admissionNumber || s.admissionNumber || s._id?.toString() || "-",
        classId: sClassId,
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
        },
        details: {
          remarks: [],
          performance: [],
          leaves: [],
          attendance: {
            regular: { percentage: 0 },
            masjid: { percentage: 0 },
            literary: { percentage: 0 }
          }
        }
      };
    });

    const studentIds = Object.keys(studentMap);

    const getAttStats = async (Model) => {
      const stats = await Model.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        { $unwind: "$attendanceRecords" },
        { $match: { "attendanceRecords.date": { $gte: startDate, $lte: endDate } } },
        { $group: {
            _id: "$studentId",
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ["$attendanceRecords.present", true] }, 1, 0] } }
        }}
      ]);
      const map = {};
      stats.forEach(s => {
        map[s._id] = { total: s.total, present: s.present };
      });
      return map;
    };

    // Sequential queries to avoid overwhelming the connection pool
    const regAttMap = await getAttStats(StudentAttendance);
    const masAttMap = await getAttStats(StudentMasjidAttendance);
    const litAttMap = await getAttStats(StudentLiteraryAttendance);
    
    const remarks = await Remark.find({ studentId: { $in: studentIds }, date: { $gte: startDate, $lte: endDate } }).populate('teacherId', 'name').lean();
    const performances = await Performance.find({ studentId: { $in: studentIds }, date: { $gte: startDate, $lte: endDate } }).populate('teacherId', 'name').lean();
    const leaves = await LeaveRecord.find({ studentId: { $in: studentIds }, dateOfLeave: { $gte: startDate, $lte: endDate } }).lean();
    const classes = await Class.find({ _id: { $in: Array.from(classIdsSet) } }).lean();
    const settings = await Settings.findOne().lean();

    const classMap = {};
    classes.forEach(c => {
      classMap[c._id.toString()] = c.name;
    });

    // Assign stats directly
    studentIds.forEach(sid => {
      if (regAttMap[sid]) {
        studentMap[sid].stats.regular.total = regAttMap[sid].total;
        studentMap[sid].stats.regular.present = regAttMap[sid].present;
      }
      if (masAttMap[sid]) {
        studentMap[sid].stats.masjid.total = masAttMap[sid].total;
        studentMap[sid].stats.masjid.present = masAttMap[sid].present;
      }
      if (litAttMap[sid]) {
        studentMap[sid].stats.literary.total = litAttMap[sid].total;
        studentMap[sid].stats.literary.present = litAttMap[sid].present;
      }
    });

    // Calculate attendance points
    for (const sid of studentIds) {
      const s = studentMap[sid];
      
      const regPct = s.stats.regular.total > 0 ? (s.stats.regular.present / s.stats.regular.total) * 100 : 0;
      s.scores.regularAttendance = getAttendancePoints(regPct);
      s.details.attendance.regular.percentage = regPct;

      const masPct = s.stats.masjid.total > 0 ? (s.stats.masjid.present / s.stats.masjid.total) * 100 : 0;
      s.scores.masjidAttendance = getAttendancePoints(masPct);
      s.details.attendance.masjid.percentage = masPct;

      const litPct = s.stats.literary.total > 0 ? (s.stats.literary.present / s.stats.literary.total) * 100 : 0;
      s.scores.literaryAttendance = getAttendancePoints(litPct);
      s.details.attendance.literary.percentage = litPct;
    }

    // Process Remarks
    remarks.forEach(remark => {
      const sid = remark.studentId.toString();
      if (!studentMap[sid]) return;
      const pts = getStatusPoints(remark.status);
      studentMap[sid].scores.remarks += pts;
      
      const teacherName = remark.teacherId?.name || "Unknown Teacher";
      studentMap[sid].details.remarks.push({ 
        status: remark.status, 
        points: pts, 
        date: remark.date,
        comments: remark.comments,
        teacherName: teacherName
      });
    });

    // Process Performance
    performances.forEach(perf => {
      const sid = perf.studentId.toString();
      if (!studentMap[sid]) return;
      const pts = getStatusPoints(perf.status);
      studentMap[sid].scores.performance += pts;
      
      const teacherName = perf.teacherId?.name || "Unknown Teacher";
      studentMap[sid].details.performance.push({ 
        status: perf.status, 
        points: pts, 
        date: perf.date,
        comments: perf.comments,
        teacherName: teacherName
      });
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
      
      const pts = getStatusPoints(leave.remark);
      studentMap[sid].scores.leaves += pts;
      studentMap[sid].details.leaves.push({ 
        status: leave.remark, 
        points: pts, 
        date: leave.dateOfLeave,
        leaveReason: leave.leaveReason
      });
    });

    // Determine the Star(s)
    const bestByClass = {};
    const allStudents = [];

    for (const sid of studentIds) {
      const s = studentMap[sid];
      const total = s.scores.regularAttendance + s.scores.masjidAttendance + s.scores.literaryAttendance + s.scores.remarks + s.scores.performance + s.scores.leaves;
      
      const cId = s.classId;
      if (!cId) continue;
      
      s.totalScore = total;
      s.className = classMap[cId] || "Unknown Class";
      allStudents.push(s);

      const studentData = {
        student: { id: s.id, name: s.name, profilePic: s.profilePic, admnNo: s.admnNo },
        breakdown: s.scores,
        totalScore: total,
        classId: cId,
        className: s.className,
        institutionName: settings?.institution?.name || "Institution Name"
      };

      if (!bestByClass[cId] || total > bestByClass[cId].maxScore) {
        bestByClass[cId] = {
          maxScore: total,
          winners: [studentData]
        };
      } else if (total === bestByClass[cId].maxScore) {
        bestByClass[cId].winners.push(studentData);
      }
    }

    let results = [];
    Object.values(bestByClass).forEach(classData => {
      results.push(...classData.winners);
    });
    
    results = results.sort((a, b) => a.classId.localeCompare(b.classId));

    if (results.length === 0) {
      return NextResponse.json({ success: false, message: "No data available to calculate Star of the Month." });
    }

    return NextResponse.json({
      success: true,
      data: results,
      allStudents: allStudents
    });

  } catch (error) {
    console.error("Star of the Month Error:", error);
    return NextResponse.json({ success: false, message: "Server error", error: error.message }, { status: 500 });
  }
}
