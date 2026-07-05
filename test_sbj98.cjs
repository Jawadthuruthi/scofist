const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({}, { strict: false }));
  const tt = await TimeTable.findOne({ classId: "CLS-1" });
  if (tt) {
      const slot = tt.timeSlots.find(s => s.subjectId === "SBJ-98" && s.teacherId === "TCH-006");
      if (slot) {
          console.log("Found SBJ-98-TCH-006!");
          console.log("validFrom:", slot.validFrom);
          console.log("validTo:", slot.validTo);
      } else {
          console.log("Not found in TimeTable");
      }
  }
  process.exit(0);
});
