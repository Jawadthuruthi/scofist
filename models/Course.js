import mongoose, { Schema, model } from "mongoose";

const CourseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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

CourseSchema.index({ name: 1, type: 1, universityBoard: 1 }, { unique: true });

const Course = mongoose.models?.Course || model("Course", CourseSchema);
export default Course;
