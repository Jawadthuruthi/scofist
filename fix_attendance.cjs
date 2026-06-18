require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const result = await db.collection('teacherattendances').updateMany(
    {},
    {
      $pull: {
        attendanceRecords: {
          date: {
            $gte: new Date('2026-05-24T18:30:00.000Z'), // UTC for 2026-05-25 IST
            $lte: new Date('2026-06-05T18:29:59.999Z')  // UTC for 2026-06-05 IST end
          },
          present: false
        }
      }
    }
  );

  console.log("Modified documents:", result.modifiedCount);
  process.exit(0);
}
fix().catch(console.error);
