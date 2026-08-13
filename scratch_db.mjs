import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    // Find all attendance records for TCH-012
    const teacherId = 'TCH-012'; // The string ID or Object ID? Usually stored as string or ObjectId depending on schema.
    
    // It's probably easier to just fetch from the API using node fetch, but fix the hanging.
    // The API might be hanging because next dev is frozen.
    // Let's just query the DB for the raw Teacher record.
    const teachers = await db.collection('teachers').find({ teacherId: 'TCH-012' }).toArray();
    console.log('Teacher found:', teachers.length);
    
    // It's too complex to reconstruct the synthetic absents from raw DB, because they are generated on the fly!
    
  } finally {
    await client.close();
  }
}
run();
