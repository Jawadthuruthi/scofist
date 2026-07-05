const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({}, { strict: false }));
  const tt = await TimeTable.findOne({ classId: "CLS-1" });
  if (tt) {
      const activeSlots = tt.timeSlots.filter(s => !s.validTo);
      const uniquePairs = new Set(activeSlots.map(s => `${s.subjectId}-${s.teacherId}`));
      console.log("Current active pairs:", uniquePairs.size);
      console.log(Array.from(uniquePairs));
  }
  process.exit(0);
});
