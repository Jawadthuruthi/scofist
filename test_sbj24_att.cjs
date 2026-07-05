const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({
      classId: String,
      subjectId: { type: String },
      teacherId: { type: String }
  }, { strict: false }));
  
  const atts = await Attendance.find({
      date: { $gte: new Date(2026, 0, 1), $lte: new Date(2026, 1, 0) },
      classId: "CLS-5",
      subjectId: "SBJ-24"
  });
  
  console.log("Attendances for SBJ-24 in CLS-5 in Jan:", atts.length);
  if (atts.length > 0) {
      console.log("Teachers:", Array.from(new Set(atts.map(a => a.teacherId))));
  }
  process.exit(0);
});
