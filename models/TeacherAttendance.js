import { model, models, Schema } from "mongoose";
import User from "./User";
import Class from "./Class";
import Subject from "./Subject";

const teacherAttendanceSchema = new Schema(
  {
    teacherId: {
      type: String,
      required: true,
      ref: "User",
    },
    date: {
      type: String,
      required: true,
    },
    attendanceRecords: [
      {
        classId: {
          type: String,
          required: true,
          ref: "Class",
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
        present: {
          type: Boolean,
          default: false,
        },
        autoMarked: {
          type: Boolean,
          default: true,
        },
        markedAt: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create a compound index for teacher attendance records
teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

// Pre-save validation to ensure teacherId has Teacher role
teacherAttendanceSchema.pre("save", async function (next) {
  try {
    const teacher = await models.User.findById(this.teacherId);
    if (!teacher || !teacher.roles.includes("Teacher")) {
      return next(new Error("Only teachers can have attendance records"));
    }
    next();
  } catch (error) {
    next(error);
  }
});

const TeacherAttendance =
  models.TeacherAttendance ||
  model("TeacherAttendance", teacherAttendanceSchema);
export default TeacherAttendance;
