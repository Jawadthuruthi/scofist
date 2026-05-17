import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/User.js";

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const users = await User.find({ roles: "Teacher" })
      .populate("studentSpecificField.batchId")
      .populate("studentSpecificField.classId")
      .populate("studentSpecificField.admissionClassId", "name")
      .limit(10);
    
    console.log(`Found ${users.length} teachers`);
    
    const formattedUsers = users.map((u) => {
      const user = u.toObject({ virtuals: true });
      const studentSpecificField = user.studentSpecificField || {};
      const address = user.address || {};
      const teacherSpecificField = user.teacherSpecificField || {};

      return {
        _id: user._id,
        name: user.name,
        // familyDetails: studentSpecificField.familyDetails || u.studentSpecificField?.familyDetails || [],
        familyOtherDetails: user.familyOtherDetails || studentSpecificField.familyOtherDetails || u.familyOtherDetails || u.studentSpecificField?.familyOtherDetails || "",
      };
    });
    console.log("Map successful");
  } catch (err) {
    console.error("Error during map:", err);
  } finally {
    mongoose.disconnect();
  }
}
test();
