const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }));
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 1, 0);
  const atts = await Attendance.find({
      date: { $gte: start, $lte: end },
      classId: "CLS-1"
  });
  
  console.log("January attendances for CLS-1:", atts.length);
  if (atts.length > 0) {
      console.log("Unique pairs marked in Jan:");
      const pairs = new Set(atts.map(a => `${a.subjectId}-${a.teacherId}`));
      console.log(Array.from(pairs));
  }
  process.exit(0);
});
