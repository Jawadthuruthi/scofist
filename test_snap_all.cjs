const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const DailyTimetableSnapshot = mongoose.model("DailyTimetableSnapshot", new mongoose.Schema({}, { strict: false }));
  const count = await DailyTimetableSnapshot.countDocuments({ 
      dateString: { $regex: "^2026-05-" }
  });
  console.log("May Snapshots for ALL classes:", count);
  process.exit(0);
});
