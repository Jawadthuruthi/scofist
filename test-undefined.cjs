const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
if(fs.existsSync('.env.local')) dotenv.config({path: '.env.local'});
else dotenv.config();

require('./models/User.js');
const Class = require('./models/Class.js').default;

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const teacherClasses = await Class.find({ teacherId: undefined });
  console.log('Classes found with undefined:', teacherClasses.length);
  
  process.exit(0);
}
check();
