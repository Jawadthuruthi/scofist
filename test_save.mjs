import mongoose from "mongoose";
import "dotenv/config";
import User from "./models/User.js";

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const user = await User.findOne({ roles: "Teacher" });
    console.log("Teacher studentSpecificField:", user.studentSpecificField);
    
    user.name = "TEST UPDATE 2";
    user.markModified("studentSpecificField");
    user.markModified("studentSpecificField.familyDetails");
    
    await user.save();
    console.log("Saved successfully");
  } catch (e) {
    console.error("Save error:", e.message);
  } finally {
    mongoose.disconnect();
  }
}
test();
