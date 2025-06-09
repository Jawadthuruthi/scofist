import { Schema } from "mongoose";
import { models, model } from "mongoose";
import LiteraryGroup from "./LiteraryGroup";
import Class from "./Class";
const literaryAttendanceSchema = new Schema(
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
    category: {
      type: String,
      required: true,
      enum: ["GROUP", "ALL"],
    },
    groupId: {
      type: String,
      required: function () {
        return this.category === "GROUP";
      },
      ref: "LiteraryGroup",
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Group ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    classId: {
      type: String,
      required: function () {
        return this.category === "ALL";
      },
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
      required: function () {
        return this.category === "ALL";
      },
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

const LiteraryAttendance =
  models.LiteraryAttendance ||
  model("LiteraryAttendance", literaryAttendanceSchema);

export default LiteraryAttendance;
