import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({ roles: 'Student', "studentSpecificField.status": "Active" }).toArray();
  const classes = await db.collection('classes').find({}).toArray();

  let missingClassIdCount = 0;
  for (const u of users) {
    if (!u.studentSpecificField?.classId) {
      missingClassIdCount++;
    }
  }
  
  console.log("Active students without classId:", missingClassIdCount);
  
  const cls2 = await db.collection('classes').findOne({ _id: 'CLS-2' });
  const cls12 = await db.collection('classes').findOne({ _id: 'CLS-12' });
  
  console.log("CLS-2:", cls2.name, cls2.status);
  console.log("CLS-12:", cls12.name, cls12.status);
  
  process.exit(0);
}

run();
