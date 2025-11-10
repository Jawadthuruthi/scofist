import { Schema, model, models } from "mongoose";
import User from "./User";

const studentsFundSchema = new Schema(
  {
    studentId: {
      type: String,
      ref: "User",
    },
    teacherId: {
      type: String,
      required: true,
      ref: "User",
    },
    batchId: {
      type: String,
      required: true,
      ref: "Batch",
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    transactions: [
      {
        amount: {
          type: Number,
          required: true,
        },
        type: {
          type: String,
          required: true,
          enum: ["Deposit", "Withdrawal"],
        },
        note: {
          type: String,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add a compound unique index for student-specific funds
studentsFundSchema.index(
  { studentId: 1, batchId: 1, teacherId: 1 },
  {
    unique: true,
    partialFilterExpression: { studentId: { $exists: true } },
  }
);

// Add a compound unique index for batch-specific funds
studentsFundSchema.index(
  { batchId: 1, teacherId: 1 },
  {
    unique: true,
    partialFilterExpression: { studentId: { $exists: false } },
  }
);

const StudentsFund =
  models.StudentsFund || model("StudentsFund", studentsFundSchema);

export default StudentsFund;
