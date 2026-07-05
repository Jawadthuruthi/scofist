const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }));
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({}, { strict: false }));
  
  const atts = await Attendance.find({
      date: { $gte: new Date(2026, 0, 1), $lte: new Date(2026, 1, 0) },
      classId: "CLS-1"
  });
  const attPairs = new Set(atts.map(a => `${a.subjectId}-${a.teacherId}`));
  
  const tt = await TimeTable.findOne({ classId: "CLS-1" });
  const activePairs = new Set(tt.timeSlots.filter(s => !s.validTo).map(s => `${s.subjectId}-${s.teacherId}`));
  
  console.log("Marked in Jan, but NOT in current timetable:");
  for (let p of attPairs) {
      if (!activePairs.has(p)) console.log(p);
  }
  process.exit(0);
});
