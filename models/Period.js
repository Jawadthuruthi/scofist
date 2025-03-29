import { model, models, Schema } from "mongoose";

const periodSchema = new Schema(
  {
    periodNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    startTime: {
      type: String,
      trim: true,
      required: true,
      validate: {
        validator: (v) => {
          const startTime = new Date(`2000-01-01T${v}`);
          const endTime = new Date(`2000-01-01T${this.endTime}`);
          return startTime < endTime;
        },
        message: "Start time must be before end time",
      },
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => {
          const startTime = new Date(`2000-01-01T${this.startTime}`);
          const endTime = new Date(`2000-01-01T${v}`);
          return startTime < endTime;
        },
        message: "End time must be after start time",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

periodSchema.virtual("duration").get(function () {
  const startTime = new Date(`2000-01-01T${this.startTime}`);
  const endTime = new Date(`2000-01-01T${this.endTime}`);
  const duration = endTime - startTime;
  const minutes = Math.floor(duration / 60000);
  return `${minutes} minutes`;
});

periodSchema.virtual("12HourTime").get(function () {
  const startTime = new Date(`2000-01-01T${this.startTime}`);
  const hours = startTime.getHours();
  const minutes = startTime.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
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

      // First check for duplicate period number
      const duplicatePeriod = await this.constructor.findOne({
        periodNumber: this.periodNumber,
        _id: { $ne: this._id },
      });

      if (duplicatePeriod) {
        return next(new Error("Period number already exists"));
      }

      // Then check for time overlaps by fetching all periods
      // We exclude the current document if it exists
      const allPeriods = await this.constructor.find({
        _id: { $ne: this._id },
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

const Period = models.period || model("Period", periodSchema);

export default Period;
