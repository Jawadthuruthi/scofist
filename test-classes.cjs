const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
if(fs.existsSync('.env.local')) dotenv.config({path: '.env.local'});
else dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const classes = await mongoose.connection.collection('classes').find({ teacherId: { $exists: true, $ne: null } }).toArray();
  console.log('All classes with teacherId:');
  classes.forEach(c => console.log('Class:', c._id, 'Teacher:', c.teacherId));
  process.exit(0);
}
check();
