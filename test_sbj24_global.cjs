const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({
      classId: String,
      subjectId: { type: String, ref: 'Subject' },
      teacherId: { type: String, ref: 'User' }
  }, { strict: false }));
  
  const Subject = mongoose.model("Subject", new mongoose.Schema({ _id: String, name: String }, { strict: false }));
  
  const atts = await Attendance.find({
      date: { $gte: new Date(2026, 0, 1), $lte: new Date(2026, 1, 0) }
  }).populate('subjectId');
  
  const sbj24Atts = atts.filter(a => a.subjectId && a.subjectId._id.toString() === "SBJ-24");
  
  console.log(`Total SBJ-24 attendances in Jan across all classes: ${sbj24Atts.length}`);
  sbj24Atts.forEach(a => {
      console.log(`Class: ${a.classId}, Teacher: ${a.teacherId}`);
  });
  process.exit(0);
});
