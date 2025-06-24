import { model, models, Schema } from "mongoose";
import User from "./User";
import Batch from "./Batch";
import Subject from "./Subject";

const classSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Class ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
      uppercase: true,
      minlength: [2, "Class name must be at least 2 characters"],
      maxlength: [50, "Class name cannot exceed 50 characters"],
    },
    batchId: {
      type: String,
      required: [true, "Batch is required"],
      ref: "Batch",
    },
    teacherId: {
      type: String,
      required: [true, "Teacher is required"],
      ref: "User",
    },
    subjects: [
      {
        type: String,
        ref: "Subject",
      },
    ],
  },
  {
    timestamps: true,
  }
);

classSchema.pre("save", async function (next) {
  try {
    if (this.isNew || this.isModified("teacherId")) {
      const existingTeacherClass = await this.constructor
        .findOne({
          teacherId: this.teacherId,
          _id: { $ne: this?._id },
        })
        .lean();

      if (existingTeacherClass) {
        console.log("Validation failed: Duplicate teacher");
        return next(
          new Error(
            `Teacher ${this.teacherId} is already assigned to class ${existingTeacherClass?._id}`
          )
        );
      }
    }

    next();
  } catch (error) {
    console.error("Pre-save validation error:", error);
    return next(error);
  }
});

const Class = models?.Class || model("Class", classSchema);
export default Class;
