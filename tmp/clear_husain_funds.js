import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function clearHusainFunds() {
    try {
        await mongoose.connect(MONGODB_URI);
        const FundSchema = new mongoose.Schema({}, { strict: false });
        const StudentsFund = mongoose.model('StudentsFund', FundSchema, 'studentsfunds');
        
        const teacherId = "708"; // Husain
        
        const result = await StudentsFund.updateMany(
            { teacherId },
            { 
                $set: { 
                    balance: 0, 
                    transactions: [] 
                } 
            }
        );
        
        console.log(`Successfully cleared ${result.modifiedCount} fund records for teacher ${teacherId}.`);

    } catch (error) {
        console.error("Error clearing funds:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

clearHusainFunds();
