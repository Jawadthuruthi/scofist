import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const docs = await db.collection("settings").find({}).toArray();
  console.log(`Settings docs count: ${docs.length}`);
  
  if (docs.length > 0) {
    const doc = docs[0];
    console.log("Team Points Snapshots:", JSON.stringify(doc.teamPointsSnapshot, null, 2));
  }
  
  process.exit(0);
}

check().catch(console.error);
