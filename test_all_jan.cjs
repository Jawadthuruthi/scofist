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
      classId: "CLS-1"
  }).populate('subjectId');
  
  const counts = {};
  atts.forEach(a => {
      if (a.subjectId && a.subjectId.name) {
          const key = `${a.subjectId._id} (${a.subjectId.name}) - ${a.teacherId}`;
          counts[key] = (counts[key] || 0) + 1;
      }
  });
  
  console.log("All subjects and teachers in Jan:");
  console.log(counts);
  process.exit(0);
});
