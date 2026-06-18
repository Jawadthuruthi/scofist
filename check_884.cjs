require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;
mongoose.connect(uri).then(async () => {
  try {
    const db = mongoose.connection.db;
    const students = await db.collection('users').find({
      $or: [
        { 'studentSpecificField.admissionNumber': '884' },
        { 'studentSpecificField.admissionNumber': 884 },
        { 'admissionNumber': '884' },
        { 'admissionNumber': 884 },
        { 'name': { $regex: '884', $options: 'i' } }
      ]
    }).toArray();
    console.log('Found matching 884:', students.length);
    students.forEach(s => console.log(s.name, s.roles, s.studentSpecificField?.admissionNumber || s.admissionNumber, s.status, s.studentSpecificField?.classId));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
});
