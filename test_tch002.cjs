const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({
      subjectId: { type: String, ref: 'Subject' },
      teacherId: { type: String, ref: 'User' }
  }, { strict: false }));
  
  const Subject = mongoose.model("Subject", new mongoose.Schema({ _id: String, name: String }, { strict: false }));
  
  const atts = await Attendance.find({
      date: { $gte: new Date(2026, 0, 1), $lte: new Date(2026, 1, 0) },
      classId: "CLS-1",
      teacherId: "TCH-002"
  }).populate('subjectId');
  
  const subjects = new Set();
  atts.forEach(a => {
      if (a.subjectId && a.subjectId.name) subjects.add(`${a.subjectId._id} - ${a.subjectId.name}`);
  });
  
  console.log("Subjects taught by TCH-002 in Jan from DB:");
  console.log(Array.from(subjects));
  process.exit(0);
});
