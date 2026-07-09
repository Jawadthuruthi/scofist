const mongoose = require('mongoose');
const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';
mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const timetables = await db.collection('timetables').find({
    "timeSlots": {
      $elemMatch: {
        teacherId: "tch-002",
        day: "Wednesday"
      }
    }
  }).toArray();
  
  console.log('Timetables with tch-002 on Wednesday:');
  timetables.forEach(tt => {
    const slots = tt.timeSlots.filter(s => s.teacherId === "tch-002" && s.day === "Wednesday");
    console.log(`Class ID: ${tt.classId}, Slots:`, JSON.stringify(slots, null, 2));
  });
  
  process.exit(0);
});
