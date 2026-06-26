const mongoose = require('mongoose');

async function fixLeaveRecords() {
  await mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC');
  
  const leavesCollection = mongoose.connection.collection('leaverecords');
  const usersCollection = mongoose.connection.collection('users');
  
  console.log('Fetching users...');
  const users = await usersCollection.find({}, { projection: { _id: 1, 'studentSpecificField.classId': 1, classId: 1 } }).toArray();
  const userMap = new Map();
  for (const u of users) {
    const currentClassId = u.studentSpecificField?.classId || u.classId;
    const actualClassId = typeof currentClassId === 'object' && currentClassId !== null ? currentClassId._id : currentClassId;
    if (actualClassId) {
      userMap.set(u._id, actualClassId);
    }
  }
  console.log(`Loaded ${userMap.size} users.`);
  
  console.log('Fetching leaves...');
  const leaves = await leavesCollection.find({}).toArray();
  console.log(`Loaded ${leaves.length} leaves.`);
  
  const bulkOps = [];
  
  for (const leave of leaves) {
    const actualClassId = userMap.get(leave.studentId);
    if (actualClassId && leave.classId !== actualClassId) {
      bulkOps.push({
        updateOne: {
          filter: { _id: leave._id },
          update: { $set: { classId: actualClassId } }
        }
      });
    }
  }
  
  if (bulkOps.length > 0) {
    console.log(`Executing ${bulkOps.length} bulk updates...`);
    const result = await leavesCollection.bulkWrite(bulkOps);
    console.log(`Updated ${result.modifiedCount} leave records to match students' current classes.`);
  } else {
    console.log('No leave records needed updating.');
  }
  
  process.exit(0);
}

fixLeaveRecords().catch(err => {
  console.error(err);
  process.exit(1);
});
