import { GET } from './app/api/attendance-sheet/route.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // mock request
  const req = {
    url: 'http://localhost/api/attendance-sheet?classId=CLS-8&month=7&year=2026&subjectId=SBJ-04'
  };
  
  const res = await GET(req);
  const data = await res.json();
  
  console.log('nonWorkingDaysMap:', data.nonWorkingDaysMap);
  
  process.exit(0);
}

run();
