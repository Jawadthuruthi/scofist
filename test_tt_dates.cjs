const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({ timeSlots: Array }, { strict: false }));
  const tt = await TimeTable.findOne({ classId: "CLS-1" });
  
  let validFroms = new Set();
  tt.timeSlots.forEach(s => {
      if (s.validFrom) validFroms.add(s.validFrom.toISOString().split('T')[0]);
  });
  console.log("All validFrom dates in TimeTable:", Array.from(validFroms));
  
  let validTos = new Set();
  tt.timeSlots.forEach(s => {
      if (s.validTo) validTos.add(s.validTo.toISOString().split('T')[0]);
  });
  console.log("All validTo dates in TimeTable:", Array.from(validTos));
  
  process.exit(0);
});
