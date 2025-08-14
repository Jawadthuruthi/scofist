import { Schema } from "mongoose";
import { model, models } from "mongoose";
import Program from "./Program";
import Participant from "./Participant";
import Team from "./Team";

const programRegistrationSchema = new Schema(
  {
    programId: {
      type: String,
      ref: "Program",
      required: true,
    },
    teamId: {
      type: String,
      ref: "Team",
    },
    participants: [
      {
        id: {
          type: String,
          required: true,
          trim: true,
          ref: "Participant",
        },
        codeLetter: {
          type: String,
          trim: true,
        },
        marksByJudges: {
          type: [Number],
          default: [],
        },
        totalMarks: {
          type: Number,
          default: 0,
          min: [0, "Total marks must be a positive value"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ProgramRegistration =
  models.ProgramRegistration ||
  model("ProgramRegistration", programRegistrationSchema);

export default ProgramRegistration;
