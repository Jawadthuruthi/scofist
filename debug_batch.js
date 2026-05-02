import mongoose from "mongoose";
import dotenv from "dotenv";
import connectToDB from "./lib/db.js";
import User from "./models/User.js";
import Batch from "./models/Batch.js";
import StudentAttendance from "./models/StudentAttendance.js";

dotenv.config({ path: ".env.local" });

connectToDB()
  .then(async () => {
    console.log("Connected to DB");
    
    // 1. Get a batch ID to test
    const sampleBatch = await Batch.findOne({});
    if (!sampleBatch) {
      console.log("No batches found.");
      process.exit(0);
    }
    
    const batchId = sampleBatch._id;
    console.log("Testing with batchId:", batchId, "Name:", sampleBatch.name);

    // 2. Query Users
    const users = await User.find({ 
      roles: "Student",
      "studentSpecificField.batchId": batchId 
    }).lean();
    
    console.log(`Found ${users.length} users for batch ${batchId}`);
    
    if (users.length > 0) {
      const studentIds = users.map(u => u._id);
      
      // 3. Query StudentAttendance
      const attendanceDocs = await StudentAttendance.find({ studentId: { $in: studentIds } }).lean();
      console.log(`Found ${attendanceDocs.length} attendance documents for these students`);
      
      if (attendanceDocs.length > 0) {
        // Let's check how many records match the batch
        let totalRecordsMatchingBatch = 0;
        let totalRecords = 0;
        attendanceDocs.forEach(doc => {
          (doc.attendanceRecords || []).forEach(r => {
            totalRecords++;
            if (r.batchId === batchId || r.batchId?.toString() === batchId) {
              totalRecordsMatchingBatch++;
            }
          });
        });
        
        console.log(`Total attendance records: ${totalRecords}`);
        console.log(`Total records matching batchId ${batchId}: ${totalRecordsMatchingBatch}`);
        
        if (totalRecordsMatchingBatch === 0 && totalRecords > 0) {
           console.log("Sample record batchId:", attendanceDocs[0].attendanceRecords[0].batchId);
        }
      }
    }

    process.exit(0);
  })
  .catch(console.error);
