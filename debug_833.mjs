
import connectToDB from "../../lib/db.js";
import StudentAttendance from "../../models/StudentAttendance.js";
import LeaveRecord from "../../models/LeaveRecord.js";
import Attendance from "../../models/Attendance.js";

async function debug() {
  await connectToDB();
  const studentId = "833";
  const dateStr = "2026-04-22";
  
  console.log("--- StudentAttendance ---");
  const studentDoc = await StudentAttendance.findOne({ studentId }).lean();
  if (studentDoc) {
    const records = studentDoc.attendanceRecords.filter(r => {
        const d = new Date(r.date);
        return d.toISOString().startsWith("2026-04-22") || d.toISOString().startsWith("2026-04-21T18:30");
    });
    console.log(JSON.stringify(records, null, 2));
  } else {
    console.log("No student doc found");
  }

  console.log("\n--- LeaveRecord ---");
  const leaves = await LeaveRecord.find({ studentId }).lean();
  console.log(JSON.stringify(leaves.filter(l => {
      const start = new Date(l.dateOfLeave).toISOString();
      const end = new Date(l.dateOfArrival).toISOString();
      return (start <= "2026-04-22T23:59:59Z" && end >= "2026-04-22T00:00:00Z") ||
             (start <= "2026-04-21T18:30:00Z" && end >= "2026-04-21T18:30:00Z");
  }), null, 2));

  console.log("\n--- Attendance (to check teacher name) ---");
  const attendances = await Attendance.find({ 
      date: { 
          $gte: new Date("2026-04-21T00:00:00Z"), 
          $lte: new Date("2026-04-23T00:00:00Z") 
      },
      "attendanceData.studentId": studentId
  }).lean();
  console.log(JSON.stringify(attendances, null, 2));

  process.exit(0);
}

debug();
