const mongoose = require("mongoose");
require("dotenv").config({path: ".env.local"});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = mongoose.model("User", new mongoose.Schema({ _id: String, name: String }, { strict: false }));
  const u = await User.findOne({ _id: "TCH-002" });
  console.log("TCH-002 name is:", u.name);
  process.exit(0);
});
