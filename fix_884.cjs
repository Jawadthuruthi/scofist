const { MongoClient } = require('mongodb'); 
async function run() { 
    const client = new MongoClient('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC'); 
    await client.connect(); 
    const db = client.db('scofist'); 
    await db.collection('studentattendances').updateOne(
        { 
            studentId: '884', 
            attendanceRecords: { $elemMatch: { periodNumber: 7, date: new Date('2026-07-09T00:00:00.000Z') } } 
        }, 
        { 
            $set: { 'attendanceRecords.$.present': true } 
        }
    ); 
    console.log('Fixed student 884'); 
    await client.close(); 
} 
run().catch(console.dir);
