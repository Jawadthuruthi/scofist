const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const classes = await mongoose.connection.collection('classes').find({ status: 'Active' }).toArray();
  const students = await User.find({ roles: 'Student', 'studentSpecificField.status': 'Active' }).lean();
  
  console.log('Total classes:', classes.length);
  console.log('Total students:', students.length);
  
  const classCounts = {};
  classes.forEach(c => classCounts[c._id.toString()] = 0);
  
  let unmapped = 0;
  students.forEach(s => {
    const classId = s.studentSpecificField && s.studentSpecificField.classId ? s.studentSpecificField.classId.toString() : null;
    if (classId && classCounts[classId] !== undefined) {
      classCounts[classId]++;
    } else {
      unmapped++;
    }
  });
  
  console.log('Students mapped to active classes:', students.length - unmapped);
  console.log('Students unmapped:', unmapped);
  
  const zeroClasses = Object.keys(classCounts).filter(k => classCounts[k] === 0);
  console.log('Classes with 0 students:', zeroClasses.length);
  if (zeroClasses.length > 0) {
    console.log('Some zero count classes:', zeroClasses.slice(0, 5));
  }
  process.exit(0);
}
check();
