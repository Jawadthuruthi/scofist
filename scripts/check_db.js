import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const count = await db.collection('librarybooks').countDocuments();
    console.log('Total books:', count);
    const someBooks = await db.collection('librarybooks').find({ id: { $regex: '^TRV' } }).limit(2).toArray();
    console.log('Sample TRV books:', JSON.stringify(someBooks, null, 2));
    process.exit(0);
}
check();
