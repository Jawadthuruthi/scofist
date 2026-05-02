import mongoose from "mongoose";
import dotenv from "dotenv";
import connectToDB from "./lib/db.js";
import StudentAttendance from "./models/StudentAttendance.js";

dotenv.config({ path: ".env.local" });

connectToDB()
  .then(async () => {
    console.log("Connected to DB");
    
    const attendances = await StudentAttendance.find({}).limit(5).lean();
    let hasBatchId = false;
    for (const doc of attendances) {
      if (doc.attendanceRecords && doc.attendanceRecords.length > 0) {
        console.log("Sample record:", doc.attendanceRecords[0]);
        if (doc.attendanceRecords[0].batchId) {
          hasBatchId = true;
        }
      }
    }
    console.log("Has batchId in records:", hasBatchId);
    process.exit(0);
  })
  .catch(console.error);
