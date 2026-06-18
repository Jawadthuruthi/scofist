require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const docs = await db.collection('teacherattendances').find({}).limit(5).toArray();
  docs.forEach(doc => {
    if(doc.attendanceRecords && doc.attendanceRecords.length > 0) {
      console.log("Sample dates:", doc.attendanceRecords.slice(0, 5).map(r => r.date));
      console.log("Types:", doc.attendanceRecords.slice(0, 5).map(r => typeof r.date));
      if (typeof doc.attendanceRecords[0].date === 'object') {
        console.log("Is Date?", doc.attendanceRecords[0].date instanceof Date);
      }
    }
  });

  process.exit(0);
}
check().catch(console.error);
