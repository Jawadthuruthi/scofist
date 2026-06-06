import connectToDB from './lib/db.js';
import AcademicCalendar from './models/AcademicCalendar.js';
import TeacherAttendance from './models/TeacherAttendance.js';

async function check() {
  await connectToDB();
  const holidays = await AcademicCalendar.find({ date: { $gte: new Date('2026-05-25'), $lte: new Date('2026-06-05') } });
  console.log("Holidays:", holidays);

  const attendances = await TeacherAttendance.find({});
  let totalRecords = 0;
  let toDelete = 0;

  attendances.forEach(a => {
    a.attendanceRecords.forEach(r => {
      totalRecords++;
      const date = new Date(r.date);
      if (date >= new Date('2026-05-25') && date <= new Date('2026-06-05')) {
        toDelete++;
      }
    });
  });

  console.log("Total records:", totalRecords);
  console.log("Records in range:", toDelete);
  process.exit(0);
}
check();
