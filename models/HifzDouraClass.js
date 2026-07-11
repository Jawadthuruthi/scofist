import { Schema, model, models } from "mongoose";

const HifzDouraClassSchema = new Schema(
  {
    studentId: {
      type: String,
      ref: "User",
      required: [true, "Student is required"],
    },
    classId: {
      type: String,
      ref: "Class",
      required: [true, "Class is required"],
    },
    teacherId: {
      type: String,
      ref: "User",
    },
    year: {
      type: String,
      trim: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index to ensure one continuous enrollment per student
HifzDouraClassSchema.index({ studentId: 1 }, { unique: true });

if (process.env.NODE_ENV === "development") {
  delete models.HifzDouraClass;
}

const HifzDouraClass =
  models?.HifzDouraClass || model("HifzDouraClass", HifzDouraClassSchema);
export default HifzDouraClass;
