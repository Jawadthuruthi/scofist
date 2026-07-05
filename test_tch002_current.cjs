const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({ timeSlots: Array }, { strict: false }));
  const Subject = mongoose.model("Subject", new mongoose.Schema({ _id: String, name: String }, { strict: false }));
  
  const tt = await TimeTable.findOne({ classId: "CLS-1" });
  const subjects = new Set();
  
  for (const slot of tt.timeSlots) {
      if (!slot.validTo && slot.teacherId === "TCH-002") {
          const sub = await Subject.findOne({ _id: slot.subjectId });
          subjects.add(`${slot.subjectId} - ${sub ? sub.name : 'Unknown'}`);
      }
  }
  
  console.log("Subjects taught by TCH-002 in CURRENT timetable:");
  console.log(Array.from(subjects));
  process.exit(0);
});
