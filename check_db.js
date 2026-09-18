import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback

const uri = process.env.MONGODB_URI;
console.log("URI:", uri ? "Loaded" : "Not Loaded");

async function check() {
  if (!uri) {
    console.error("No MONGODB_URI found");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const docs = await db.collection("settings").find({}).toArray();
  console.log(`Found ${docs.length} settings documents.`);
  for (const doc of docs) {
    console.log(`Doc ID: ${doc._id}`);
    console.log(`Years: ${doc.years}`);
    console.log(`Team points snapshot length: ${doc.teamPointsSnapshot ? doc.teamPointsSnapshot.length : 0}`);
    if (doc.teamPointsSnapshot) {
      doc.teamPointsSnapshot.forEach(s => {
        console.log(`  Snapshot Year: ${s.year}, Total results: ${s.totalResults}`);
        if (s.teams) {
            console.log(`    Teams: ${s.teams.map(t => `${t.name}(${t.points})`).join(', ')}`);
        }
      });
    }
  }
  process.exit(0);
}

check();
