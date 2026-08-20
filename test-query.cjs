const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
if(fs.existsSync('.env.local')) dotenv.config({path: '.env.local'});
else dotenv.config();

require('./models/User.js');
require('./models/Class.js');
const Remark = require('./models/Remark.js').default;

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const query = {
    $or: [
      { classId: { $in: ['CLS-1'] } },
      { teacherId: 'TCH-002' }
    ]
  };
  
  const remarks = await Remark.find(query).exec();
  console.log(`Found ${remarks.length} remarks for CLS-1 or TCH-002.`);
  
  process.exit(0);
}
check();
