require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Attendance = require('./models/Attendance').default || require('./models/Attendance');
  const TimeTable = require('./models/TimeTable').default || require('./models/TimeTable');

  const today = new Date();
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });
  const todayDay = formatter.format(today); 
  
  const getDS = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(istDate.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const todayDS = getDS(today);
  
  const [istYear, istMonth, istDay] = todayDS.split("-").map(Number);
  const startOfDayIST = new Date(Date.UTC(istYear, istMonth - 1, istDay, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
  const endOfDayIST = new Date(Date.UTC(istYear, istMonth - 1, istDay + 1, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000) - 1);
  
  console.log({ todayDay, todayDS, startOfDayIST, endOfDayIST });
  
  const timeTables = await TimeTable.find({
    "timeSlots.day": todayDay,
  }).populate("classId", "name").lean();
  
  console.log(`Found ${timeTables.length} timetables for today (${todayDay})`);
  
  const attendances = await Attendance.find({
    date: { $gte: startOfDayIST, $lte: endOfDayIST },
  }).lean();
  
  console.log(`Found ${attendances.length} attendances marked today`);
  if (attendances.length > 0) {
    console.log("Sample attendance:", attendances[0].classId, attendances[0].subjectId, attendances[0].periodNumber);
    console.log("Types:", typeof attendances[0].classId, typeof attendances[0].subjectId);
  }
  
  process.exit(0);
}

test().catch(console.error);
