import 'dotenv/config';
import mongoose from 'mongoose';
import Attendance from './models/Attendance.js';
import TimeTable from './models/TimeTable.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const today = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
  const todayDay = formatter.format(today);
  
  const getDS = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-${String(istDate.getUTCDate()).padStart(2, "0")}`;
  };
  
  const todayDS = getDS(today);
  const [istYear, istMonth, istDay] = todayDS.split("-").map(Number);
  
  const startOfDayIST = new Date(Date.UTC(istYear, istMonth - 1, istDay, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
  const endOfDayIST = new Date(Date.UTC(istYear, istMonth - 1, istDay + 1, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000) - 1);
  
  console.log("Checking for:", { todayDay, todayDS, startOfDayIST, endOfDayIST });
  
  const attendances = await Attendance.find({
    date: { $gte: startOfDayIST, $lte: endOfDayIST },
  }).lean();
  
  console.log("Attendances found:", attendances.length);
  
  const markedPeriods = new Set(
    attendances.map(att => `${att.classId}_${att.subjectId}_${att.periodNumber}`)
  );
  
  console.log("Marked periods:", Array.from(markedPeriods));
  
  const timeTables = await TimeTable.find({ "timeSlots.day": todayDay }).populate("classId", "name").lean();
  console.log("TimeTables found:", timeTables.length);
  
  const expectedPeriods = [];
  timeTables.forEach((tt) => {
    tt.timeSlots.forEach((slot) => {
      if (slot.day === todayDay) {
        expectedPeriods.push({
          classId: tt.classId?._id?.toString(),
          subjectId: slot.subjectId?.toString(),
          periodNumber: slot.periodNumber,
        });
      }
    });
  });
  
  console.log("Expected periods:", expectedPeriods.length);
  const missing = [];
  expectedPeriods.forEach(exp => {
    if (exp.classId && exp.subjectId) {
      const key = `${exp.classId}_${exp.subjectId}_${exp.periodNumber}`;
      if (!markedPeriods.has(key)) {
        missing.push(key);
      }
    }
  });
  
  console.log("Missing periods:", missing);
  process.exit(0);
}

check().catch(console.error);
