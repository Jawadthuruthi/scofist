const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  // Get all classes
  const classes = await db.collection('classes').find({}).project({_id:1, name:1, batchId:1, status:1}).toArray();
  
  // Get student counts per classId
  const counts = await db.collection('users').aggregate([
    { $match: { roles: 'Student' } },
    { $group: { _id: '$studentSpecificField.classId', count: { $sum: 1 } } }
  ]).toArray();
  
  const countMap = {};
  counts.forEach(c => countMap[String(c._id)] = c.count);
  
  const result = classes.map(c => ({ 
    _id: c._id, 
    name: c.name, 
    batchId: c.batchId, 
    status: c.status, 
    studentCount: countMap[String(c._id)] || 0 
  }));
  
  console.log('\n=== ALL CLASSES WITH STUDENT COUNTS ===');
  result.forEach(c => {
    console.log(`  _id: "${c._id}" | name: "${c.name}" | batchId: "${c.batchId}" | students: ${c.studentCount} | status: ${c.status}`);
  });

  // Also show uncounted (students with null/undefined classId)
  const nullCount = await db.collection('users').countDocuments({ roles: 'Student', 'studentSpecificField.classId': null });
  const undefinedCount = await db.collection('users').countDocuments({ roles: 'Student', 'studentSpecificField.classId': { $exists: false } });
  console.log(`\nStudents with null classId: ${nullCount}`);
  console.log(`Students with no classId field: ${undefinedCount}`);

  await client.close();
}
main().catch(console.error);
