import { model, models, Schema } from "mongoose";
import Program from "./Program";

const scheduleSchema = new Schema(
  {
    programId: {
      type: String,
      ref: "Program",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    stageNumber: {
      type: Number,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Schedule = models.Schedule || model("Schedule", scheduleSchema);

export default Schedule;
