import { model, models, Schema } from "mongoose";
import User from "./User";
import Class from "./Class";
import Subject from "./Subject";
import Batch from "./Batch";

const studentAttendanceSchema = new Schema(
  {
    studentId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    attendanceRecords: [
      {
        classId: {
          type: String,
          required: true,
          ref: "Class",
        },
        batchId: {
          type: String,
          required: true,
          ref: "Batch",
        },
        subjectId: {
          type: String,
          required: true,
          ref: "Subject",
        },
        periodNumber: {
          type: Number,
          required: true,
        },
        day: {
          type: String,
          required: true,
        },
        date: {
          type: String,
          required: true,
        },
        present: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const StudentAttendance =
  models.StudentAttendance ||
  model("StudentAttendance", studentAttendanceSchema);
export default StudentAttendance;
