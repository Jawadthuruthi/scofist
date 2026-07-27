import Participant from "@/models/Participant";
import Team from "@/models/Team";

export async function undeclareResultData(result) {
  if (!result || !result.participants || !result.programId) return;

  const teamPointsSubtractor = new Map();

  const participantUpdatePromises = result.participants.map(async (participantResult) => {
    const participantId = participantResult.id;
    const programId = result.programId._id || result.programId;
    const programCategory = result.programId.category;
    const programType = result.programId.type;

    if (!programCategory || !programType) return; // Needs populated programId

    const participant = await Participant.findById(participantId);
    if (participant) {
      participant.programs = participant.programs.filter(
        (p) => p.id.toString() !== programId.toString()
      );

      if (programCategory === "Stage" && programType === "Individual") {
        participant.stagePoints = Math.max(0, (participant.stagePoints || 0) - (participantResult.points || 0));
      } else if (programCategory === "Off-Stage" && programType === "Individual") {
        participant.offStagePoints = Math.max(0, (participant.offStagePoints || 0) - (participantResult.points || 0));
      }
      await participant.save();

      const teamId = participant.teamId.toString();
      if (!teamPointsSubtractor.has(teamId)) {
        teamPointsSubtractor.set(teamId, { stagePoints: 0, offStagePoints: 0 });
      }

      const teamSubtractor = teamPointsSubtractor.get(teamId);
      if (programCategory === "Stage") {
        teamSubtractor.stagePoints += (participantResult.points || 0);
      } else {
        teamSubtractor.offStagePoints += (participantResult.points || 0);
      }
    }
  });

  await Promise.all(participantUpdatePromises);

  const teamUpdatePromises = Array.from(teamPointsSubtractor.entries()).map(async ([teamId, pointsToSubtract]) => {
    const team = await Team.findById(teamId);
    if (team) {
      team.stagePoints = Math.max(0, (team.stagePoints || 0) - pointsToSubtract.stagePoints);
      team.offStagePoints = Math.max(0, (team.offStagePoints || 0) - pointsToSubtract.offStagePoints);
      await team.save();
    }
  });

  await Promise.all(teamUpdatePromises);
}
