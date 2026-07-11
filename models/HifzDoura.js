import { Schema, model, models } from "mongoose";

const HifzDouraSchema = new Schema(
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
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    pagesCount: {
      type: Number,
      required: [true, "Pages count is required"],
      min: [0, "Pages count cannot be negative"],
    },
    recordedBy: {
      type: String,
      ref: "User",
    },
    year: {
      type: String,
      required: [true, "Year is required"],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookups
HifzDouraSchema.index({ studentId: 1, date: 1 });
HifzDouraSchema.index({ classId: 1, date: 1 });
HifzDouraSchema.index({ year: 1, date: -1 });

if (process.env.NODE_ENV === "development") {
  delete models.HifzDoura;
}

const HifzDoura = models?.HifzDoura || model("HifzDoura", HifzDouraSchema);
export default HifzDoura;
