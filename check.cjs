const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Result = mongoose.connection.db.collection('results');
  const r = await Result.findOne();
  console.log('Result:', JSON.stringify(r, null, 2));

  const PR = mongoose.connection.db.collection('programregistrations');
  const pr = await PR.findOne({ programId: r.programId });
  console.log('PR:', pr ? 'Found' : 'Not found');
  
  process.exit(0);
}
check();
