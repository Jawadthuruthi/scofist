const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({ classId: String, timeSlots: Array }, { strict: false }));
  
  const tt = await TimeTable.findOne({ classId: "CLS-5" });
  const slots = tt.timeSlots.filter(s => s.subjectId && s.subjectId.toString() === "SBJ-24");
  
  const teachers = new Set(slots.map(s => s.teacherId ? s.teacherId.toString() : 'null'));
  
  console.log("Current teachers for SBJ-24 in CLS-5 TimeTable:", Array.from(teachers));
  process.exit(0);
});
