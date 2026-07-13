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
  let found = 0;
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
      if (topClass) found++;
    }
  }
  
  console.log(`Found attendance based classes for ${found} out of ${participants2025.length} participants.`);
  
  await client.close();
  process.exit(0);
}
main();
