import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // We will just do what teacherAttendances/route.js does manually to see where it breaks.
    
    const r = await fetch(`http://localhost:3000/api/teacherAttendances?teacherId=TCH-012&limit=0`, {
       headers: { 'api-key': process.env.API_KEY }
    });
    
    if (!r.ok) {
       console.log('API Error:', await r.text());
       process.exit(1);
    }
    
    const d = await r.json();
    const teacher = d.teacherAttendances[0];
    if (!teacher) {
       console.log('Teacher not found in API response');
       process.exit(0);
    }
    
    const absents = teacher.attendanceRecords.filter(r => !r.present);
    console.log('API Absents:', absents.length);
    
    // Check August absents
    const augAbsents = absents.filter(r => new Date(r.date).toISOString().includes('2026-08'));
    console.log('Aug Absents:', augAbsents.length);
    
    for (const a of augAbsents) {
       console.log(`- Date: ${new Date(a.date).toISOString().split('T')[0]}, Class: ${a.className}, Subject: ${a.subjectName}, Period: ${a.periodNumber}`);
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
