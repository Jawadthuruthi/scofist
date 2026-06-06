const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC');
  const db = mongoose.connection.db;

  const docs = await db.collection('teacherattendances').find({}).toArray();
  let records = [];

  docs.forEach(doc => {
    if(doc.attendanceRecords) {
      doc.attendanceRecords.forEach(r => {
        const d = new Date(r.date);
        if (d.getFullYear() === 2026 && (d.getMonth() === 4 || d.getMonth() === 5)) {
          records.push({ date: d, present: r.present, autoMarked: r.autoMarked, teacherId: doc.teacherId });
        }
      });
    }
  });

  console.log("Found records in May/June 2026:");
  records.slice(0, 20).forEach(r => console.log(r));
  console.log("Total records in May/June 2026:", records.length);
  process.exit(0);
}
check().catch(console.error);
