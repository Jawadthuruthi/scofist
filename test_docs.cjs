const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const SettingsSchema = new mongoose.Schema({}, { strict: false });
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema, "settings");

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const docs = await Settings.find({});
    console.log("Number of settings docs:", docs.length);
    docs.forEach((doc, i) => {
        console.log(`Doc ${i} ID:`, doc._id, "Categories:", doc.get("general.attendanceCategories"));
    });
    await mongoose.disconnect();
}
main();
