const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }));
  
  const getDS = (date) => {
      const d = new Date(date);
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const y = istDate.getUTCFullYear();
      const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
  };

  const attendances = await Attendance.find({ 
      classId: "CLS-1", 
      date: { $gte: new Date("2026-05-01"), $lte: new Date("2026-05-31T23:59:59Z") } 
  });
  
  const historicalDayScheduleMap = {};
  attendances.forEach(att => {
      const isoDate = getDS(new Date(att.date));
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const [y, m, d] = isoDate.split("-");
      const dayName = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      
      const accessor = `${att.subjectId}-${att.teacherId}`;
      if (!historicalDayScheduleMap[dayName]) historicalDayScheduleMap[dayName] = {};
      if (!historicalDayScheduleMap[dayName][accessor]) historicalDayScheduleMap[dayName][accessor] = [];
      if (!historicalDayScheduleMap[dayName][accessor].includes(att.periodNumber)) {
          historicalDayScheduleMap[dayName][accessor].push(att.periodNumber);
      }
  });
  
  console.log(JSON.stringify(historicalDayScheduleMap, null, 2));
  process.exit(0);
});
