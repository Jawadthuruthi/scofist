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
      ref: "Batch",
    },
    teacherId: {
      type: String,
      required: [true, "Teacher is required"],
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Custom validation to prevent duplicate batch and teacher assignments
classSchema.pre("save", async function (next) {
  try {
    // Check for existing class with same batch
    const existingBatchClass = await this.constructor.findOne({
      batchId: this.batchId,
      _id: { $ne: this._id }, // Exclude current document during update
    });

    if (existingBatchClass) {
      return next(new Error("A class with this batch already exists"));
    }

    // Check for existing class with same teacher
    const existingTeacherClass = await this.constructor.findOne({
      teacherId: this.teacherId,
      _id: { $ne: this._id }, // Exclude current document during update
    });

    if (existingTeacherClass) {
      return next(
        new Error("This teacher is already assigned to another class")
      );
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Class = models?.Class || model("Class", classSchema);
export default Class;
