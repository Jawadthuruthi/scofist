import { model, models, Schema } from "mongoose";

const teacherNoteSchema = new Schema(
  {
    teacherId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, "Note title cannot exceed 120 characters"],
      default: "",
    },
    content: {
      type: String,
      required: [true, "Note content is required"],
      trim: true,
      maxlength: [5000, "Note content cannot exceed 5000 characters"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

teacherNoteSchema.index({ teacherId: 1, createdAt: -1 });
teacherNoteSchema.index({ teacherId: 1, updatedAt: -1 });

const TeacherNote =
  models?.TeacherNote || model("TeacherNote", teacherNoteSchema);

export default TeacherNote;
