const mongoose = require('mongoose');

async function fixLeaveRecords() {
  await mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC');
  
  const leavesCollection = mongoose.connection.collection('leaverecords');
  const usersCollection = mongoose.connection.collection('users');
  
  const leaves = await leavesCollection.find({}).toArray();
  
  let updatedCount = 0;
  for (const leave of leaves) {
    const student = await usersCollection.findOne({ _id: leave.studentId });
    if (student) {
      const currentClassId = student.studentSpecificField?.classId || student.classId;
      // If currentClassId is an object (due to how it was stored), extract _id
      const actualClassId = typeof currentClassId === 'object' && currentClassId !== null ? currentClassId._id : currentClassId;
      
      if (actualClassId && leave.classId !== actualClassId) {
        await leavesCollection.updateOne(
          { _id: leave._id },
          { $set: { classId: actualClassId } }
        );
        updatedCount++;
      }
    }
  }
  
  console.log(`Updated ${updatedCount} leave records to match students' current classes.`);
  process.exit(0);
}

fixLeaveRecords().catch(err => {
  console.error(err);
  process.exit(1);
});
