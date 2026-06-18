require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const docs = await db.collection('teacherattendances').find({}).toArray();
  let dates = new Set();

  docs.forEach(doc => {
    if(doc.attendanceRecords) {
      doc.attendanceRecords.forEach(r => {
        const d = new Date(r.date);
        if (d.getFullYear() === 2026) {
          dates.add(`${d.getMonth()+1}-${d.getDate()}`);
        }
      });
    }
  });

  console.log("Dates present in 2026:", Array.from(dates).sort());
  process.exit(0);
}
check().catch(console.error);
