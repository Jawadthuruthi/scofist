import { model, models, Schema } from "mongoose";
import Division from "./Division";

const festSettingSchema = new Schema(
  {
    printHeader: {
      url: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || /^(http|https):\/\/[^ "]+$/.test(v),
          message: "Invalid URL format",
        },
      },
      publicId: {
        type: String,
      },
    },
    resultPosterLayouts: [
      {
        url: {
          type: String,
          trim: true,
          validate: {
            validator: (v) => !v || /^(http|https):\/\/[^ "]+$/.test(v),
            message: "Invalid URL format",
          },
        },
        publicId: {
          type: String,
        },
        divisionId: {
          type: Schema.Types.ObjectId,
          ref: "Division",
        },
      },
    ],
    submissionDeadline: {
      type: Date,
      validate: {
        validator: function (v) {
          return v > new Date();
        },
        message: "Submission deadline must be in the future.",
      },
    },
  },
  {
    timestamps: true,
  }
);

const FestSetting =
  models.FestSetting || model("FestSetting", festSettingSchema);

export default FestSetting;
