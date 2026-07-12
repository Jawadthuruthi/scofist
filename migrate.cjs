
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function migrateYear(oldYear, newYear) {
  try {
    await client.connect();
    const db = client.db('scofist');
    const collections = await db.listCollections().toArray();
    
    console.log('Starting migration from ' + oldYear + ' to ' + newYear + '...');
    
    for (const collInfo of collections) {
      if (collInfo.type !== 'collection') continue;
      const collName = collInfo.name;
      const collection = db.collection(collName);
      
      const count = await collection.countDocuments({ year: oldYear });
      if (count > 0) {
        console.log('Found ' + count + ' documents in collection ' + collName);
        const result = await collection.updateMany(
          { year: oldYear },
          { $set: { year: newYear } }
        );
        console.log('Updated ' + result.modifiedCount + ' documents in ' + collName);
      }
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrateYear('2026 December', '2026 September');

