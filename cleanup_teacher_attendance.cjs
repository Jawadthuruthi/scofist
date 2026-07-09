const mongoose = require('mongoose');
const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';

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

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  
  // Get all timetables
  const timetables = await db.collection('timetables').find({}).toArray();
  const scheduleMap = {};
  
  timetables.forEach(tt => {
    (tt.timeSlots || []).forEach(slot => {
      if (!slot.teacherId) return;
      const tId = slot.teacherId.toString();
      if (!scheduleMap[tId]) scheduleMap[tId] = [];
      
      scheduleMap[tId].push({
        classId: tt.classId.toString(),
        subjectId: slot.subjectId ? slot.subjectId.toString() : null,
        periodNumber: slot.periodNumber,
        day: slot.day,
        validFromDS: slot.validFrom ? getDS(slot.validFrom) : getDS(tt.updatedAt || tt.createdAt),
        validToDS: slot.validTo ? getDS(slot.validTo) : null
      });
    });
  });
  
  const teacherAtts = await db.collection('teacherattendances').find({}).toArray();
  
  let totalRemoved = 0;
  
  for (const ta of teacherAtts) {
    const tId = ta.teacherId.toString();
    const slots = scheduleMap[tId] || [];
    
    let originalCount = (ta.attendanceRecords || []).length;
    let newRecords = (ta.attendanceRecords || []).filter(r => {
      if (!r.autoMarked || r.present) return true; // keep manual records and presents
      
      const rDateDS = getDS(r.date);
      // check if it's valid
      const slot = slots.find(s => 
        s.classId === r.classId.toString() && 
        s.subjectId === r.subjectId.toString() && 
        s.periodNumber === r.periodNumber && 
        s.day === r.day
      );
      
      if (!slot) return false; // Not in timetable at all!
      
      const isStarted = !slot.validFromDS || slot.validFromDS <= rDateDS;
      const isNotEnded = !slot.validToDS || slot.validToDS > rDateDS;
      
      if (!isStarted || !isNotEnded) return false; // Delete it, it was invalid!
      
      return true;
    });
    
    if (newRecords.length < originalCount) {
      const removed = originalCount - newRecords.length;
      totalRemoved += removed;
      console.log(`Removing ${removed} invalid records for teacher ${tId}`);
      await db.collection('teacherattendances').updateOne(
        { _id: ta._id },
        { $set: { attendanceRecords: newRecords } }
      );
    }
  }
  
  console.log(`Cleanup complete. Total invalid autoMarked absent records removed: ${totalRemoved}`);
  process.exit(0);
});
