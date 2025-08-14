import { model, models, Schema } from "mongoose";
import Participant from "./Participant";
import User from "./User";

const teamSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Team ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },
    leaderId: {
      type: String,
      required: true,
      unique: true,
      ref: "User",
    },
    membersId: {
      type: [String],
      required: true,
      ref: "Participant",
    },
    stagePoints: {
      type: Number,
      default: 0,
    },
    offStagePoints: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Team = models.Team || model("Team", teamSchema);

export default Team;
