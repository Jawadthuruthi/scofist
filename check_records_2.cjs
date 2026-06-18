require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const docs = await db.collection('teacherattendances').find({}).toArray();
  let records = [];

  docs.forEach(doc => {
    if(doc.attendanceRecords) {
      doc.attendanceRecords.forEach(r => {
        const d = new Date(r.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const dt = d.getDate();
        
        // 2026-05-25 to 2026-06-05
        let inRange = false;
        if (y === 2026) {
          if (m === 5 && dt >= 25) inRange = true;
          if (m === 6 && dt <= 5) inRange = true;
        }

        if (inRange) {
          records.push({ date: r.date, present: r.present, autoMarked: r.autoMarked, teacherId: doc.teacherId });
        }
      });
    }
  });

  console.log("Records in range 25/05/2026 to 05/06/2026:", records.length);
  if(records.length > 0) {
    console.log("First few:", records.slice(0, 5));
    console.log("Are dates strings?", typeof records[0].date);
  }
  process.exit(0);
}
check().catch(console.error);
