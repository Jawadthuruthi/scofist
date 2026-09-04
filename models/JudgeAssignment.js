import { Schema, model, models } from "mongoose";

const judgeAssignmentSchema = new Schema(
  {
    judgeId: {
      type: String,
      required: true,
      ref: "User",
      trim: true,
    },
    judgeName: {
      type: String,
      trim: true,
    },
    programId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Program",
    },
    programName: {
      type: String,
      trim: true,
    },
    divisionId: {
      type: String,
      ref: "Division",
    },
    divisionName: {
      type: String,
      trim: true,
    },
    judgeNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    year: {
      type: String,
      required: true,
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isReady: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      ref: "User",
      trim: true,
    },
    alertMessage: {
      type: String,
      trim: true,
    },
    alertActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Uniqueness: one judge number per program per year
judgeAssignmentSchema.index({ programId: 1, judgeNumber: 1, year: 1 }, { unique: true });
judgeAssignmentSchema.index({ programId: 1, year: 1 });
judgeAssignmentSchema.index({ judgeId: 1, year: 1 });

delete models.JudgeAssignment;
const JudgeAssignment = model("JudgeAssignment", judgeAssignmentSchema);

export default JudgeAssignment;
