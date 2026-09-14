require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({}, { strict: false });
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema, "settings");

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    let settings = await Settings.findOne({});
    if (settings && settings.get("general.attendanceCategories")) {
        const cats = settings.get("general.attendanceCategories");
        if (!cats.includes("Onnam Dars")) {
            cats.push("Onnam Dars");
            await Settings.updateOne({}, { $set: { "general.attendanceCategories": cats } });
            console.log("Added Onnam Dars");
        } else {
            console.log("Onnam Dars already exists");
        }
    } else if (settings && !settings.get("general.attendanceCategories")) {
        await Settings.updateOne({}, { $set: { "general.attendanceCategories": ["Masjid", "Haddad", "Programs", "Spot", "Onnam Dars"] } });
        console.log("Created attendanceCategories with Onnam Dars");
    }
    
    await mongoose.disconnect();
}

main();
