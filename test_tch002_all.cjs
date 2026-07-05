const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({
      subjectId: { type: String },
      teacherId: { type: String }
  }, { strict: false }));
  
  const atts = await Attendance.find({
      date: { $gte: new Date(2026, 0, 1), $lte: new Date(2026, 1, 0) },
      teacherId: "TCH-002"
  });
  
  const subjects = new Set();
  atts.forEach(a => {
      if (a.subjectId) subjects.add(a.subjectId);
  });
  
  console.log("All subjects for TCH-002 in Jan across ALL classes:", Array.from(subjects));
  process.exit(0);
});
