import { model, models, Schema } from "mongoose";

import Team from "./Team";
import Division from "./Division";
import Program from "./Program";
import User from "./User";

const participantSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Participant ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    chestNumber: {
      type: Number,
    },

    teamId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Team",
    },
    divisionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Division",
    },
    programs: [
      {
        id: {
          type: Schema.Types.ObjectId,
          ref: "Program",
        },
        rank: {
          type: Number,
          default: 0,
          min: [0, "Rank must be a positive value"],
        },
        points: {
          type: Number,
          default: 0,
          min: [0, "Points must be a positive value"],
        },
      },
    ],
    stagePoints: {
      type: Number,
      default: 0,
      min: [0, "Stage points must be a positive value"],
    },
    offStagePoints: {
      type: Number,
      default: 0,
      min: [0, "Off-stage points must be a positive value"],
    },
  },
  {
    timestamps: true,
  }
);

const Participant =
  models.Participant || model("Participant", participantSchema);

export default Participant;
