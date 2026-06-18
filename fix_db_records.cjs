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
            $gte: new Date('2026-02-11T18:30:00.000Z'), // UTC for 2026-02-12 IST
            $lte: new Date('2026-02-28T18:29:59.999Z')  // UTC for 2026-02-28 IST end
          },
          present: false
        }
      }
    }
  );

  console.log("Modified documents for Feb 12-28:", result.modifiedCount);
  
  // also check May 25 to Jun 5 just in case
  const result2 = await db.collection('teacherattendances').updateMany(
    {},
    {
      $pull: {
        attendanceRecords: {
          date: {
            $gte: new Date('2026-05-24T18:30:00.000Z'), 
            $lte: new Date('2026-06-05T18:29:59.999Z')  
          },
          present: false
        }
      }
    }
  );
  console.log("Modified documents for May 25-Jun 5:", result2.modifiedCount);

  process.exit(0);
}
fix().catch(console.error);
