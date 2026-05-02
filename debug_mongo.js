import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(dbUrl);
  await client.connect();
  const db = client.db();
  
  const batches = await db.collection("batches").find({}).toArray();
  for (const batch of batches) {
    const batchId = batch._id.toString();
    console.log(`\nTesting with batch: ${batch.name} (${batchId})`);
    
    const users = await db.collection("users").find({ 
      roles: "Student",
      "studentSpecificField.batchId": batchId
    }).toArray();
    
    console.log("Users found:", users.length);
    
    if (users.length > 0) {
      const userIds = users.map(u => u._id.toString());
      const attendances = await db.collection("studentattendances").find({
        studentId: { $in: userIds }
      }).toArray();
      
      console.log("Attendances docs found:", attendances.length);
      if (attendances.length > 0) {
        let recordsTotal = 0;
        let matchingBatch = 0;
        let undefinedBatch = 0;
        
        attendances.forEach(doc => {
          (doc.attendanceRecords || []).forEach(r => {
            recordsTotal++;
            if (r.batchId && r.batchId.toString() === batchId) {
              matchingBatch++;
            }
            if (!r.batchId) {
              undefinedBatch++;
            }
          });
        });
        console.log(`Total records: ${recordsTotal}, Matching batchId: ${matchingBatch}, Missing batchId: ${undefinedBatch}`);
      }
    }
  }
  
  await client.close();
}

run().catch(console.dir);
