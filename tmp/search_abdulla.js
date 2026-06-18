import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function search() {
    try {
        await mongoose.connect(MONGODB_URI);
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model('User', UserSchema, 'users');
        
        const abdullas = await User.find({ name: /Abdulla/i }).lean();
        const stationaryStaff = await User.find({ roles: "Stationary" }).lean();
        
        console.log("Abdullas:", JSON.stringify(abdullas, null, 2));
        console.log("Stationary Staff:", JSON.stringify(stationaryStaff, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

search();
