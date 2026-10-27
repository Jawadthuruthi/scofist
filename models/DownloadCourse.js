import mongoose, { Schema, model } from "mongoose";

const DownloadCourseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const DownloadCourse =
  mongoose.models?.DownloadCourse || model("DownloadCourse", DownloadCourseSchema);

export default DownloadCourse;
