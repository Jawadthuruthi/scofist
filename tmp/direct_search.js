import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function search() {
    try {
        await mongoose.connect(MONGODB_URI);
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model('User', UserSchema, 'users');
        
        const users = await User.find({ name: /Husain/i }).lean();
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

search();
