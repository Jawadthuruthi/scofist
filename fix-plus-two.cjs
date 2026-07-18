const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  // Move all students from CLS-12 (PLUS TWO B) to CLS-2 (PLUS TWO)
  const result = await db.collection('users').updateMany(
    { roles: 'Student', 'studentSpecificField.classId': 'CLS-12' },
    { $set: { 'studentSpecificField.classId': 'CLS-2' } }
  );
  
  console.log(`Moved ${result.modifiedCount} students from PLUS TWO B (CLS-12) → PLUS TWO (CLS-2)`);
  
  // Verify
  const plusTwoCount = await db.collection('users').countDocuments({ roles: 'Student', 'studentSpecificField.classId': 'CLS-2' });
  const plusTwoBCount = await db.collection('users').countDocuments({ roles: 'Student', 'studentSpecificField.classId': 'CLS-12' });
  
  console.log(`\nAfter fix:`);
  console.log(`  PLUS TWO (CLS-2): ${plusTwoCount} students`);
  console.log(`  PLUS TWO B (CLS-12): ${plusTwoBCount} students`);
  
  await client.close();
}
main().catch(console.error);
