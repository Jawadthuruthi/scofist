import { model, models, Schema } from "mongoose";

/**
 * DailyTimetableSnapshot
 *
 * Stores a permanent, immutable record of the active timetable for each calendar day.
 * Saved by the cron job every morning so that future timetable changes never alter
 * how past dates appear in "timetable view by date".
 *
 * Shape mirrors the TimeTable.timeSlots structure so the frontend can use it
 * directly without any transformation.
 */
const dailyTimetableSnapshotSchema = new Schema(
  {
    // IST date stored as UTC midnight for consistent MongoDB range queries
    date: {
      type: Date,
      required: true,
    },
    // "YYYY-MM-DD" in IST — primary lookup key (unique, indexed)
    dateString: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Whether this was a working day (false = holiday / non-working day)
    isWorkingDay: {
      type: Boolean,
      default: true,
    },
    // All timetable slots active on this date
    slots: [
      {
        classId: { type: String, ref: "Class" },
        teacherId: { type: String, ref: "User" },
        subjectId: { type: String, ref: "Subject" },
        periodNumber: { type: Number },
        day: { type: String }, // "Monday", "Tuesday", etc.
      },
    ],
  },
  {
    timestamps: true,
  }
);

const DailyTimetableSnapshot =
  models.DailyTimetableSnapshot ||
  model("DailyTimetableSnapshot", dailyTimetableSnapshotSchema);

export default DailyTimetableSnapshot;
