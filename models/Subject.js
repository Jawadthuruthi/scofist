import { model } from "mongoose";
import { models, Schema } from "mongoose";

const subjectSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[A-Z0-9]+$/.test(v),
        message: "Subject id must be a valid code",
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minLength: [2, "Subject name must be at least 2 characters long"],
      maxLength: [50, "Subject name cannot exceed 50 characters"],
    },
  },
  {
    timestamps: true,
  }
);

const Subject = models.Subject || model("Subject", subjectSchema);
export default Subject;
