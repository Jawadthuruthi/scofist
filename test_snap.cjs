const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const DailyTimetableSnapshot = mongoose.model("DailyTimetableSnapshot", new mongoose.Schema({}, { strict: false }));
  const count = await DailyTimetableSnapshot.countDocuments({ 
      classId: "CLS-1",
      dateString: { $regex: "^2026-05-" }
  });
  console.log("May Snapshots for CLS-1:", count);
  process.exit(0);
});
