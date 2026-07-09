const mongoose = require('mongoose');
const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  
  const teacherAtt = await db.collection('teacherattendances').find({ teacherId: "TCH-002" }).toArray();
  
  console.log(`Found ${teacherAtt.length} TeacherAttendance docs for TCH-002`);
  
  let period9Count = 0;
  teacherAtt.forEach(doc => {
     (doc.attendanceRecords || []).forEach(r => {
        if (r.periodNumber === 9) {
           period9Count++;
           console.log(`Found period 9 record on ${doc.date}:`, r);
        }
     });
  });
  console.log(`Total period 9 records: ${period9Count}`);

  process.exit(0);
});
