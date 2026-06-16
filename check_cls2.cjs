
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const allStudents = await User.find({ roles: 'Student' }).lean();
  
  const cls2Students = allStudents.filter(s => s.studentSpecificField && s.studentSpecificField.classId === 'CLS-2');
  console.log('Students in CLS-2:', cls2Students.length);
  if (cls2Students.length > 0) {
    const statuses = {};
    cls2Students.forEach(s => {
      const st = s.studentSpecificField.status;
      statuses[st] = (statuses[st] || 0) + 1;
    });
    console.log('Statuses of CLS-2 students:', statuses);
  }
  
  process.exit(0);
}
check();

