import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC').then(async () => {
  const users = await mongoose.connection.db.collection('users').find({ 'studentSpecificField.classId': 'CLS-12' }).toArray();
  console.log('Users with CLS-12:', users.length);
  
  const allStudents = await mongoose.connection.db.collection('users').find({ roles: 'Student', 'studentSpecificField.status': 'Active' }).toArray();
  const classesMap = {};
  allStudents.forEach(s => {
    const cid = s.studentSpecificField?.classId || s.classId || 'none';
    classesMap[cid] = (classesMap[cid] || 0) + 1;
  });
  console.log('Active Students by classId:', classesMap);
  
  process.exit();
});
