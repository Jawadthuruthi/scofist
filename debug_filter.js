import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(dbUrl);
  await client.connect();
  const db = client.db();
  
  const student = await db.collection("studentattendances").findOne({ studentId: "884" });
  
  const records = student.attendanceRecords || [];
  
  const start = new Date("2026-03-31T18:30:00.000Z");
  const end = new Date("2026-04-30T18:29:59.999Z");
  
  const aprilRecords = records.filter(r => new Date(r.date) >= start && new Date(r.date) <= end);
  if (aprilRecords.length > 0) {
    console.log("Sample 1 classId:", JSON.stringify(aprilRecords[0].classId));
    console.log("Sample 1 subjectId:", JSON.stringify(aprilRecords[0].subjectId));
  }
  
  await client.close();
}

run().catch(console.dir);
