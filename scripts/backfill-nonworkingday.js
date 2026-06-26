import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Generate all dates from 26 May 2026 to 05 June 2026 inclusive
  const start = new Date('2026-05-26T00:00:00.000Z');
  const end   = new Date('2026-06-05T00:00:00.000Z');
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  console.log('Dates to add:', dates.map(d => d.toISOString().split('T')[0]));

  const result = await mongoose.connection.collection('settings').updateOne(
    {},
    { $addToSet: { 'general.nonWorkingDays': { $each: dates } } }
  );

  console.log('Backfill result:', JSON.stringify(result));
  await mongoose.disconnect();
  console.log('Done.');
}

backfill().catch(console.error);
