import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SettingsSchema = new mongoose.Schema({}, { strict: false });
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

async function test() {
    console.log("Connecting to", process.env.MONGODB_URI?.substring(0, 20) + "...");
    await mongoose.connect(process.env.MONGODB_URI);
    const settings = await Settings.findOne({}).select("general").lean();
    console.log("Settings junior non working days:");
    console.log(settings.general.juniorDaawaNonWorkingDays);
    process.exit(0);
}
test().catch(console.error);
