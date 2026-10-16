import { Schema, model, models } from "mongoose";

const rankAchieverSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    rank: {
      type: String,
      trim: true,
      default: "",
    },
    year: {
      type: String,
      required: [true, "Year is required"],
      trim: true,
    },
    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
    },
    college: {
      type: String,
      trim: true,
      default: "",
    },
    photo: {
      url: {
        type: String,
        trim: true,
        default: "",
      },
      publicId: {
        type: String,
        trim: true,
        default: "",
      },
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

if (models.RankAchiever) {
  delete models.RankAchiever;
}

const RankAchiever =
  models.RankAchiever || model("RankAchiever", rankAchieverSchema);

export default RankAchiever;
