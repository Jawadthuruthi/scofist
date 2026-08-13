import { GET } from './app/api/attendance-table/route.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // mock request
  const req = {
    url: 'http://localhost/api/attendance-table?classId=CLS-8&month=8&year=2026'
  };
  
  const res = await GET(req);
  const data = await res.json();
  
  const targetRow = data.tableData.find(r => r.date === '2026-08-11');
  console.log('Target Row:', targetRow);
  
  process.exit(0);
}

run();
