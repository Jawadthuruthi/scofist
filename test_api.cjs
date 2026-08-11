const mongoose = require('mongoose');
const User = require('./models/User');
const Class = require('./models/Class');
const Settings = require('./models/Settings');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scofist");
    const settings = await Settings.findOne({}).select("general").lean();
    console.log("Settings global non working days log:", settings.general.nonWorkingDaysLog);
    console.log("Settings senior non working days:", settings.general.seniorDaawaNonWorkingDays);
    console.log("Settings junior non working days:", settings.general.juniorDaawaNonWorkingDays);
    process.exit(0);
}
test();
