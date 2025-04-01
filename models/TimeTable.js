import { model, models, Schema } from "mongoose";

const timeTableSchema = new Schema(
  {
    classId: {
      type: String,
      required: true,
      ref: "Class",
    },

    timeSlots: [
      {
        subjectId: {
          type: String,
          required: true,
          ref: "Subject",
        },
        teacherId: {
          type: String,
          required: true,
          ref: "User",
        },
        periodNumber: {
          type: Number,
          required: true,
        },
        day: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const TimeTable = models.TimeTable || model("TimeTable", timeTableSchema);
export default TimeTable;
