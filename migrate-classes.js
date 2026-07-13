import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const uri = envConfig.MONGODB_URI;

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const participants2025 = await db.collection('participants').find({ year: "2025 november" }).toArray();
  const userIds = participants2025.map(p => p._id.split('-')[0]);
  
  const attendances = await db.collection('studentattendances').find({ studentId: { $in: userIds } }).toArray();
  let updatedCount = 0;
  
  const bulkOps = [];
  
  for (const p of participants2025) {
    const userId = p._id.split('-')[0];
    const userAtts = attendances.filter(a => a.studentId === userId);
    if (userAtts.length > 0) {
      // Find the most common classId for records in 2025
      const classCounts = {};
      userAtts.forEach(a => {
        a.attendanceRecords.forEach(ar => {
          if (new Date(ar.date).getFullYear() === 2025) {
            classCounts[ar.classId] = (classCounts[ar.classId] || 0) + 1;
          }
        });
      });
      const topClass = Object.keys(classCounts).sort((a,b) => classCounts[b] - classCounts[a])[0];
      if (topClass) {
        bulkOps.push({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { classId: topClass } }
          }
        });
        updatedCount++;
      }
    }
  }
  
  if (bulkOps.length > 0) {
    await db.collection('participants').bulkWrite(bulkOps);
    console.log(`Successfully migrated classId for ${updatedCount} out of ${participants2025.length} participants in 2025 using historical attendance.`);
  } else {
    console.log("No updates needed.");
  }
  
  // Also sync 2026 September to the CURRENT user class so it isn't out of date
  const participants2026 = await db.collection('participants').find({ year: "2026 September" }).toArray();
  const userIds2026 = participants2026.map(p => p._id.split('-')[0]);
  const users2026 = await db.collection('users').find({ _id: { $in: userIds2026 } }).toArray();
  const userMap2026 = {};
  users2026.forEach(u => userMap2026[u._id] = u);
  
  const bulkOps2026 = [];
  let updated2026 = 0;
  for (const p of participants2026) {
    const userId = p._id.split('-')[0];
    const user = userMap2026[userId];
    const currentClassId = user?.studentSpecificField?.classId;
    if (currentClassId && p.classId !== currentClassId) {
      bulkOps2026.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { classId: currentClassId } }
        }
      });
      updated2026++;
    }
  }
  
  if (bulkOps2026.length > 0) {
    await db.collection('participants').bulkWrite(bulkOps2026);
    console.log(`Successfully synced classId for ${updated2026} participants in 2026 to their current User class.`);
  } else {
    console.log("No 2026 participants needed sync.");
  }

  await client.close();
  process.exit(0);
}
main();
