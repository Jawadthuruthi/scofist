const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC');
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
