const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({}, { strict: false }));
  const tt = await TimeTable.findOne({ classId: "CLS-1" });
  if (tt) {
      const slots = tt.timeSlots.filter(s => s.subjectId === "SBJ-18" && s.teacherId === "TCH-009");
      slots.forEach(slot => {
          console.log("validFrom:", slot.validFrom);
          console.log("validTo:", slot.validTo);
      });
  }
  process.exit(0);
});
