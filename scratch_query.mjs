import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const classes = await db.collection('classes').find({}).toArray();
    console.log('Classes:');
    classes.forEach(c => {
        let section = c.section || "";
        let name = c.name || "";
        let mappedSection = "Unknown";
        if (section.toLowerCase().includes("senior") || name.toLowerCase().includes("senior")) {
          mappedSection = "Senior Da-awa";
        } else if (section.toLowerCase().includes("junior") || name.toLowerCase().includes("junior")) {
          mappedSection = "Junior Da-awa";
        }
        console.log(`- ${c._id}: Name: "${name}", Section: "${section}" -> Mapped: ${mappedSection}`);
    });
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
