import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const tch = await db.collection('users').findOne({ teacherId: 'TCH-012' });
    const teacher_id = tch._id.toString();

    const today = new Date();
    const startDate = `${today.getFullYear()}-01-01`;
    const endDate = `${today.getFullYear()}-12-31`;

    const r = await fetch(`http://localhost:3000/api/teacherAttendances?teacherId=${teacher_id}&startDate=${startDate}&endDate=${endDate}&limit=0`, {
       headers: { 'api-key': process.env.API_KEY }
    });
    const d = await r.json();
    
    let totalAbsents = 0;
    const tch012 = d.teacherAttendances[0];
    
    if (tch012) {
        const absents = tch012.attendanceRecords.filter(r => !r.present);
        totalAbsents = absents.length;
        console.log(`TCH-012 (${tch.name}) Total Absents: ${totalAbsents}`);
        
        absents.forEach(r => {
            const ds = new Date(r.date).toISOString().split('T')[0];
            if (ds.startsWith('2026-08')) {
                console.log(`- ${ds}, Period: ${r.periodNumber}, Class: ${r.className || r.classId}, Synthetic: ${r.synthetic}`);
            }
        });
    } else {
        console.log('TCH-012 not found in response');
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
