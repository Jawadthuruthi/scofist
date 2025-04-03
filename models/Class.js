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
    // Skip validation if this document is not being saved (might be other operations)
    if (
      !this.isNew &&
      !this.isModified("batchId") &&
      !this.isModified("teacherId")
    ) {
      return next();
    }

    // Store original batchId if we're updating an existing class
    let oldBatchId = null;
    if (!this.isNew && this.isModified("batchId")) {
      const existingClass = await this.constructor.findById(this._id).lean();
      if (existingClass) {
        oldBatchId = existingClass.batchId;
      }
    }

    // Only check for duplicates if relevant fields are modified
    if (this.isNew || this.isModified("batchId")) {
      const existingBatch = await this.constructor
        .findOne({
          batchId: this.batchId,
          _id: { $ne: this._id },
        })
        .lean();

      if (existingBatch) {
        console.log("Validation failed: Duplicate batch");
        return next(
          new Error(
            `Batch ${this.batchId} is already assigned to class ${existingBatch._id}`
          )
        );
      }

      // Update students with the new classId when batchId is assigned or changed
      console.log(
        `Updating students for batch ${this.batchId} to class ${this._id}`
      );

      await User.updateMany(
        { "studentSpecificField.batchId": this.batchId },
        { $set: { "studentSpecificField.classId": this._id } }
      );

      // If this is an update and batchId changed, clear classId for students in old batch
      if (oldBatchId) {
        console.log(
          `Removing class assignment for students in previous batch ${oldBatchId}`
        );
        await User.updateMany(
          {
            "studentSpecificField.batchId": oldBatchId,
            "studentSpecificField.classId": this._id,
          },
          { $unset: { "studentSpecificField.classId": "" } }
        );
      }
    }

    if (this.isNew || this.isModified("teacherId")) {
      const existingTeacherClass = await this.constructor
        .findOne({
          teacherId: this.teacherId,
          _id: { $ne: this._id },
        })
        .lean();

      if (existingTeacherClass) {
        console.log("Validation failed: Duplicate teacher");
        return next(
          new Error(
            `Teacher ${this.teacherId} is already assigned to class ${existingTeacherClass._id}`
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
