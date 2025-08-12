import { model, models, Schema } from "mongoose";
import Participant from "./Participant";
import User from "./User";

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    leaderId: {
      type: String,
      required: true,
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
