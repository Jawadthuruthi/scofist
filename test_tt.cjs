const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({}, { strict: false }));
  const tt = await TimeTable.findOne({ classId: "CLS-1" });
  if (tt) {
      console.log("TimeTable validFrom dates:");
      tt.timeSlots.forEach(s => {
          if (s.validFrom) console.log(s.validFrom);
      });
  }
  process.exit(0);
});
