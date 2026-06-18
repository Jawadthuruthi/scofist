import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function findHusainFunds() {
    try {
        await mongoose.connect(MONGODB_URI);
        const FundSchema = new mongoose.Schema({}, { strict: false });
        const StudentsFund = mongoose.model('StudentsFund', FundSchema, 'studentsfunds');
        
        const teacherId = "708"; // Husain
        
        const funds = await StudentsFund.find({ teacherId }).lean();
        
        console.log(`Total funds found for teacher ${teacherId}:`, funds.length);
        
        if (funds.length > 0) {
            const totalBalance = funds.reduce((acc, f) => acc + (f.balance || 0), 0);
            console.log(`Total aggregate balance: ₹${totalBalance.toFixed(2)}`);
            
            // Check fund types
            const types = {};
            funds.forEach(f => {
                types[f.fundType] = (types[f.fundType] || 0) + 1;
            });
            console.log("Fund types distribution:", types);
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

findHusainFunds();
