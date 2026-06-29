import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  try {
    const result = await db.collection('users').updateMany(
      { 
        roles: 'Student', 
        "studentSpecificField.status": "Active",
        "studentSpecificField.classId": "CLS-12"
      },
      {
        $set: {
          "studentSpecificField.classId": "CLS-2"
        }
      }
    );

    console.log(`Successfully migrated students. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Error migrating students:", error);
  } finally {
    process.exit(0);
  }
}

run();
