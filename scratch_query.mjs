import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const tt = await db.collection('timetables').find({'timeSlots.teacherId': 'TCH-012'}).toArray();
    
    console.log('TCH-012 classes:');
    const classes = new Set();
    tt.forEach(t => {
        t.timeSlots.forEach(s => {
            if(s.teacherId === 'TCH-012') classes.add(t.classId);
        });
    });
    
    for (const cid of classes) {
        const cls = await db.collection('classes').findOne({ _id: cid });
        console.log(`Class: ${cls.name}, Section: ${cls.section}`);
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
