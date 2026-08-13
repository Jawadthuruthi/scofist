import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const settings = await db.collection('settings').findOne({});
    console.log('Senior Daawa isWorkingDay:', settings?.general?.seniorDaawa?.isWorkingDay);
    console.log('Junior Daawa isWorkingDay:', settings?.general?.juniorDaawa?.isWorkingDay);
    process.exit(0);
  } catch(e) {
    console.error('Failed:', e.message);
  }
}
run();
