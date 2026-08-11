import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SettingsSchema = new mongoose.Schema({}, { strict: false });
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

async function cleanDB() {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    
    const settings = await Settings.findOne({});
    if (settings) {
        const now = new Date();
        const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        const todayStr = `${todayIST.getUTCFullYear()}-${String(todayIST.getUTCMonth() + 1).padStart(2, "0")}-${String(todayIST.getUTCDate()).padStart(2, "0")}`;
        
        const jnwd = settings.get("general.juniorDaawaNonWorkingDays") || [];
        const snwd = settings.get("general.seniorDaawaNonWorkingDays") || [];
        
        // Only keep dates >= todayStr
        const newJnwd = jnwd.filter(dt => {
            const dStr = new Date(dt).toISOString().split("T")[0];
            return dStr >= todayStr;
        });
        const newSnwd = snwd.filter(dt => {
            const dStr = new Date(dt).toISOString().split("T")[0];
            return dStr >= todayStr;
        });
        
        await Settings.updateOne({}, {
            $set: {
                "general.juniorDaawaNonWorkingDays": newJnwd,
                "general.seniorDaawaNonWorkingDays": newSnwd
            }
        });
        console.log("Cleaned Junior dates. Old count:", jnwd.length, "New count:", newJnwd.length);
        console.log("Cleaned Senior dates. Old count:", snwd.length, "New count:", newSnwd.length);
    }
    
    process.exit(0);
}
cleanDB().catch(console.error);
