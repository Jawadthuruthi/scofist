const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect("mongodb+srv://scofistAppAdmin:vJifc1iXqPez41eG@scofist.sksms.mongodb.net/scofist_app?retryWrites=true&w=majority&appName=scofist").then(async () => {
  const Division = mongoose.model("Division", new Schema({ year: String }, { strict: false }));
  const years = await Division.distinct("year");
  console.log("Distinct years:", years);
  const divs = await Division.find({ year: { $ne: "2025 november" } });
  console.log("Other divisions:", divs);
  process.exit(0);
});
