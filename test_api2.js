import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({}, { strict: false });
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scofist");
    const settings = await Settings.findOne({}).select("general").lean();
    console.log("Settings global non working days log length:", settings.general.nonWorkingDaysLog?.length);
    console.log("Settings senior non working days length:", settings.general.seniorDaawaNonWorkingDays?.length);
    console.log("Settings junior non working days length:", settings.general.juniorDaawaNonWorkingDays?.length);
    console.log("Senior dates:", settings.general.seniorDaawaNonWorkingDays);
    process.exit(0);
}
test();
