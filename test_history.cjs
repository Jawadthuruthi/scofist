const mongoose = require('mongoose');
const connectToDB = require('./lib/db');
const Attendance = require('./models/Attendance').default;

(async () => {
  await connectToDB();
  const date = new Date('2026-05-24'); // yesterday
  const day = 'Sunday';
  const attendances = await Attendance.find({ day: day }).populate('classId subjectId teacherId').lean();
  console.log('Total Sunday attendances:', attendances.length);
  
  const map = {};
  attendances.forEach(a => {
      const classId = a.classId?._id ? a.classId._id.toString() : a.classId;
      const key = `${classId}_${a.periodNumber}_${a.day}`;
      map[key] = true;
  });
  console.log('Unique periods covered by history:', Object.keys(map).length);
  process.exit(0);
})();
