const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({
      classId: String,
      subjectId: { type: String, ref: 'Subject' },
      teacherId: { type: String, ref: 'User' }
  }, { strict: false }));
  
  const Subject = mongoose.model("Subject", new mongoose.Schema({ _id: String, name: String }, { strict: false }));
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({ classId: String, timeSlots: Array }, { strict: false }));
  
  const atts = await Attendance.find({
      date: { $gte: new Date(2026, 0, 1), $lte: new Date(2026, 1, 0) },
      teacherId: "TCH-002"
  }).populate('subjectId');
  
  const classes = new Set(atts.map(a => a.classId));
  
  for (let cid of classes) {
      console.log(`\nChecking Class: ${cid}`);
      const tt = await TimeTable.findOne({ classId: cid });
      const ttSubjects = new Set(tt ? tt.timeSlots.filter(s => s.subjectId).map(s => s.subjectId.toString()) : []);
      
      const classAtts = atts.filter(a => a.classId === cid);
      const attSubjects = new Set(classAtts.map(a => a.subjectId ? a.subjectId._id.toString() : 'null'));
      
      console.log("Subjects taught by TCH-002 in Jan (Attendance):", Array.from(attSubjects));
      console.log("Are all Attendance subjects in TimeTable array?");
      attSubjects.forEach(sid => {
          if (!ttSubjects.has(sid)) {
              console.log(`❌ MISSING FROM TIMETABLE: ${sid}`);
          }
      });
  }
  process.exit(0);
});
