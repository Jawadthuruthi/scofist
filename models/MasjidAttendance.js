import { Schema } from "mongoose";
import { models, model } from "mongoose";
import Class from "./Class";

const masjidAttendanceSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => v <= new Date(),
        message: "Attendance date cannot be in the future",
      },
    },
    day: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
    classId: {
      type: String,
      required: true,
      ref: "Class",
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Class ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    batchId: {
      type: String,
      required: true,
      ref: "Batch",
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Batch ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    attendanceData: [
      {
        studentId: {
          type: String,
          required: true,
          ref: "User",
        },
        present: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const MasjidAttendance =
  models.MasjidAttendance ||
  model("MasjidAttendance", masjidAttendanceSchema);

export default MasjidAttendance;