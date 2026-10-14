import mongoose, { Schema, model } from "mongoose";

const CourseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Islamic", "Academic", "Both"],
      default: "Academic",
    },
    universityBoard: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const Course = mongoose.models?.Course || model("Course", CourseSchema);
export default Course;
