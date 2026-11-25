import { model, models, Schema } from "mongoose";
import Class from "./Class";
import Subject from "./Subject";
import User from "./User";
import Batch from "./Batch";

const attendanceSchema = new Schema(
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
    teacherId: {
      type: String,
      required: true,
      ref: "User",
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
      type: Date,
      required: true,
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
          default: false,
        },
        leaveReason: {
          type: String,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create a compound index for attendance records
attendanceSchema.index(
  { classId: 1, subjectId: 1, date: 1, periodNumber: 1 },
  { unique: true }
);
// Index for queries scoped by class + date (used by classAttendances API)
attendanceSchema.index({ classId: 1, date: 1 });
// Index for queries scoped by teacher + date (used by teacherAttendances API)
attendanceSchema.index({ teacherId: 1, date: 1 });

// Duplicate-prevention is handled at the API layer (POST checks for existing record
// before creation; the unique compound index on classId+subjectId+date+periodNumber
// also guards against races). The teacher-role and student-membership checks added
// significant DB overhead on every save; validation is done in the API route instead.

// Force model reload in development
if (process.env.NODE_ENV === "development") {
  delete models.Attendance;
}

const Attendance = models.Attendance || model("Attendance", attendanceSchema);
export default Attendance;
