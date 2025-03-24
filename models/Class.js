import { model, models, Schema } from "mongoose";
import User from "./User";

const classSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9-]+$/.test(v);
        },
        message: "Invalid ID format",
      },
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
      index: true,
      ref: "Batch",
    },
    teacherId: {
      type: String,
      required: [true, "Teacher is required"],
      index: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

classSchema.index({ batchId: 1 }, { unique: true });
classSchema.index({ teacherId: 1 }, { unique: true });

const Class = models?.Class || model("Class", classSchema);
export default Class;
