const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }));
  
  const atts = await Attendance.find({
      date: { $gte: new Date(2026, 5, 1), $lte: new Date(2026, 6, 0) },
      classId: "CLS-1"
  });
  const attPairs = new Set(atts.map(a => `${a.subjectId}-${a.teacherId}`));
  console.log("Marked in June:");
  console.log(Array.from(attPairs));
  process.exit(0);
});
