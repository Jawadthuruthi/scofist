import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getYear } from './lib/getYear.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const req = {
    url: 'http://localhost/team-points/2026?year=2026',
    headers: new Map()
  };
  req.headers.get = (key) => {
    if (key === 'cookie') return '';
    return null;
  };
  
  const year = await getYear(req);
  console.log("Resolved year:", year);
  
  const db = mongoose.connection.db;
  const docs = await db.collection("settings").find({}).toArray();
  const doc = docs[0];
  const snapshot = (doc.teamPointsSnapshot || []).find(s => s.year === year);
  console.log("Found snapshot:", snapshot ? "Yes" : "No", snapshot?.year);
  
  process.exit(0);
}

check().catch(console.error);
