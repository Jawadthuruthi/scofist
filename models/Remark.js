import { Schema, model, models } from "mongoose";

const STATUSES = ["good", "bad", "Pending"];

const remarkSchema = new Schema(
  {
    studentId: {
      type: String,
      ref: "User",
      required: true,
    },
    classId: {
      type: String,
      ref: "Class",
      required: true,
    },
    teacherId: {
      type: String,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    comments: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Remark = models.Remark || model("Remark", remarkSchema);
export default Remark;
