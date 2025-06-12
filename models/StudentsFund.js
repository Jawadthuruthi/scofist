import { Schema, model, models } from "mongoose";
import User from "./User";

const studentsFundSchema = new Schema(
  {
    studentId: {
      type: String,
      required: true,
      ref: "User",
      unique: true,
      index: true,
    },
    transactions: [
      {
        teacherId: {
          type: String,
          required: true,
          ref: "User",
        },
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
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const StudentsFund =
  models.StudentsFund || model("StudentsFund", studentsFundSchema);

export default StudentsFund;
