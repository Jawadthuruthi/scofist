import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const uri = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(uri);
  
  const Result = mongoose.model('Result', new mongoose.Schema({}, { strict: false }));
  const Program = mongoose.model('Program', new mongoose.Schema({}, { strict: false }));
  
  const results = await Result.find({ isResultDeclared: true, year: "2026 September" }).lean();
  let totalRaw = 0;
  let totalStage = 0;
  let totalOff = 0;
  let totalOther = 0;

  for (const res of results) {
    const prog = await Program.findById(res.programId).lean();
    const cat = prog ? prog.category : 'DELETED';
    
    let sum = 0;
    (res.participants || []).forEach(p => {
        if (p.points) sum += p.points;
    });

    totalRaw += sum;
    if (cat === 'Stage') totalStage += sum;
    else if (cat === 'Off-Stage') totalOff += sum;
    else {
        totalOther += sum;
        console.log(`Other category: ${cat}, Program: ${prog?.name}, Points: ${sum}`);
    }
  }

  console.log(`Total Raw Points: ${totalRaw}`);
  console.log(`Stage Points: ${totalStage}`);
  console.log(`Off-Stage Points: ${totalOff}`);
  console.log(`Other Points: ${totalOther}`);
  process.exit(0);
}

check();
