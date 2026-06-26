const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC').then(async () => {
  const users = await mongoose.connection.collection('users').find({
    $or: [
      { 'admissionNumber': { $regex: '978' } },
      { 'studentSpecificField.admissionNumber': { $regex: '978' } },
      { 'name': { $regex: '978' } },
      { '_id': { $regex: '978' } }
    ]
  }).toArray();
  console.log('User:', JSON.stringify(users.map(u => ({ name: u.name, id: u._id, classId: u.classId, specClassId: u.studentSpecificField?.classId, admission: u.admissionNumber, specAdmission: u.studentSpecificField?.admissionNumber })), null, 2));
  
  if (users.length > 0) {
    const leaves = await mongoose.connection.collection('leaves').find({ studentId: users[0]._id }).toArray();
    console.log('Leaves count:', leaves.length);
    if (leaves.length > 0) {
      console.log('Sample leave:', JSON.stringify(leaves[0], null, 2));
    }
  }
  process.exit(0);
});
