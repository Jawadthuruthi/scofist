import { model, models, Schema } from "mongoose";

const periodSchema = new Schema(
  {
    periodNumber: {
      type: Number,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      trim: true,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    isSpecialDay: {
      type: Boolean,
      default: false,
      index: true,
    },
    schedule: {
      type: String,
      trim: true,
      default: "normal",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index so periodNumber is unique per schedule
periodSchema.index({ periodNumber: 1, schedule: 1 }, { unique: true });

// Validate times at the schema level instead of individual fields
periodSchema.path("startTime").validate(function (value) {
  if (!this.endTime) return true; // Skip validation if endTime isn't set yet

  const startTime = new Date(`2000-01-01T${value}`);
  const endTime = new Date(`2000-01-01T${this.endTime}`);
  return startTime < endTime;
}, "Start time must be before end time");

periodSchema.path("endTime").validate(function (value) {
  if (!this.startTime) return true; // Skip validation if startTime isn't set yet

  const startTime = new Date(`2000-01-01T${this.startTime}`);
  const endTime = new Date(`2000-01-01T${value}`);
  return startTime < endTime;
}, "End time must be after start time");

periodSchema.virtual("duration").get(function () {
  const startTime = new Date(`2000-01-01T${this.startTime}`);
  const endTime = new Date(`2000-01-01T${this.endTime}`);
  const duration = endTime - startTime;
  const minutes = Math.floor(duration / 60000);
  return `${minutes} minutes`;
});

periodSchema.virtual("formattedTime").get(function () {
  const startTime = new Date(`2000-01-01T${this.startTime}`);
  const startTimeHours = startTime.getHours();
  const startTimeMinutes = startTime.getMinutes().toString().padStart(2, "0");
  const startTimePeriod = startTimeHours >= 12 ? "PM" : "AM";
  const formattedStartHours = startTimeHours % 12 || 12;

  const endTime = new Date(`2000-01-01T${this.endTime}`);
  const endTimeHours = endTime.getHours();
  const endTimeMinutes = endTime.getMinutes().toString().padStart(2, "0");
  const endTimePeriod = endTimeHours >= 12 ? "PM" : "AM";
  const formattedEndHours = endTimeHours % 12 || 12;

  const formattedStartTime = `${formattedStartHours}:${startTimeMinutes} ${startTimePeriod}`;
  const formattedEndTime = `${formattedEndHours}:${endTimeMinutes} ${endTimePeriod}`;

  return `${formattedStartTime} - ${formattedEndTime}`;
});

periodSchema.virtual("formattedStartTime").get(function () {
  if (!this.startTime) return "";
  const startTime = new Date(`2000-01-01T${this.startTime}`);
  if (isNaN(startTime.getTime())) return this.startTime;
  const startTimeHours = startTime.getHours();
  const startTimeMinutes = startTime.getMinutes().toString().padStart(2, "0");
  const startTimePeriod = startTimeHours >= 12 ? "PM" : "AM";
  const formattedStartHours = startTimeHours % 12 || 12;
  return `${formattedStartHours}:${startTimeMinutes} ${startTimePeriod}`;
});

periodSchema.virtual("formattedEndTime").get(function () {
  if (!this.endTime) return "";
  const endTime = new Date(`2000-01-01T${this.endTime}`);
  if (isNaN(endTime.getTime())) return this.endTime;
  const endTimeHours = endTime.getHours();
  const endTimeMinutes = endTime.getMinutes().toString().padStart(2, "0");
  const endTimePeriod = endTimeHours >= 12 ? "PM" : "AM";
  const formattedEndHours = endTimeHours % 12 || 12;
  return `${formattedEndHours}:${endTimeMinutes} ${endTimePeriod}`;
});

periodSchema.pre("save", async function (next) {
  if (this.startTime && this.endTime) {
    try {
      // Validate that start time is before end time
      const thisStart = new Date(`2000-01-01T${this.startTime}`);
      const thisEnd = new Date(`2000-01-01T${this.endTime}`);

      if (thisStart >= thisEnd) {
        return next(new Error("Start time must be before end time"));
      }

      const sched = this.schedule || (this.isSpecialDay ? "thursday" : "normal");
      this.schedule = sched;
      this.isSpecialDay = sched !== "normal";

      const scheduleFilter = {
        $or: [
          { schedule: sched },
          ...(sched === "normal"
            ? [{ schedule: { $exists: false }, isSpecialDay: { $ne: true } }]
            : sched === "thursday"
            ? [{ schedule: { $exists: false }, isSpecialDay: true }]
            : []),
        ],
      };

      // First check for duplicate period number within the same schedule
      const duplicatePeriod = await this.constructor.findOne({
        periodNumber: this.periodNumber,
        ...scheduleFilter,
        _id: { $ne: this?._id },
      });

      if (duplicatePeriod) {
        return next(
          new Error(
            `Period number ${this.periodNumber} already exists for this schedule`
          )
        );
      }

      // Check period number ordering (periods with lower numbers should start earlier)
      if (this.periodNumber > 1) {
        const earlierPeriods = await this.constructor.find({
          periodNumber: { $lt: this.periodNumber },
          ...scheduleFilter,
          _id: { $ne: this?._id },
        });

        for (const earlierPeriod of earlierPeriods) {
          const earlierStart = new Date(
            `2000-01-01T${earlierPeriod.startTime}`
          );

          // If this period starts before any period with a lower number
          if (thisStart < earlierStart) {
            return next(
              new Error(
                `Period ${this.periodNumber} cannot start before period ${earlierPeriod.periodNumber}`
              )
            );
          }
        }
      }

      // Then check for time overlaps by fetching all periods within the same schedule
      const allPeriods = await this.constructor.find({
        ...scheduleFilter,
        _id: { $ne: this?._id },
      });

      // Check each period for overlap
      for (const period of allPeriods) {
        const periodStart = new Date(`2000-01-01T${period.startTime}`);
        const periodEnd = new Date(`2000-01-01T${period.endTime}`);

        // Check if periods overlap
        if (thisStart < periodEnd && thisEnd > periodStart) {
          return next(
            new Error(`Period time overlaps with period ${period.periodNumber}`)
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Refresh model if schema updated during hot-reload
if (
  models.Period &&
  (!models.Period.schema.path("isSpecialDay") ||
    !models.Period.schema.path("schedule"))
) {
  delete models.Period;
}

const Period = models.Period || model("Period", periodSchema);

// Safely drop legacy unique indexes if they exist in the MongoDB collection
if (Period.collection) {
  Period.collection.dropIndex("periodNumber_1").catch(() => {});
  Period.collection.dropIndex("periodNumber_1_isSpecialDay_1").catch(() => {});
}

export default Period;
