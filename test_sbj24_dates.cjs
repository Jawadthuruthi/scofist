const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({ classId: String, timeSlots: Array }, { strict: false }));
  const tt = await TimeTable.findOne({ classId: "CLS-5" });
  
  const slots = tt.timeSlots.filter(s => s.subjectId && s.subjectId.toString() === "SBJ-24");
  
  console.log("SBJ-24 slots validFrom dates:");
  slots.forEach(s => {
      console.log(`Period ${s.periodNumber}, Day ${s.day}: validFrom =`, s.validFrom);
  });
  process.exit(0);
});
