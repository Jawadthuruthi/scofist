const mongoose = require('mongoose');
const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';
mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const classes = await db.collection('classes').find({ name: /PG/i }).toArray();
  console.log('PG Classes:', classes.map(c => ({ id: c._id, name: c.name })));
  
  // Also dump LiteraryAttendance for PG FIRST YEAR
  const pg1 = classes.find(c => c.name.includes('PG') && c.name.includes('FIRST'));
  if (pg1) {
    const attendances = await db.collection('literaryattendances').find({ classId: pg1._id }).limit(2).toArray();
    console.log('Attendances for PG1:', attendances.map(a => ({ _id: a._id, classId: a.classId, type: typeof a.classId })));
  }
  process.exit(0);
});
