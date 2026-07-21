import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import JudgeAssignment from "@/models/JudgeAssignment";
import ProgramRegistration from "@/models/ProgramRegistration";
import GradeScheme from "@/models/GradeScheme";
import Result from "@/models/Result";
import { getYear } from "@/lib/getYear";

function calculateGrade(totalMarks, gradeSchemes) {
  for (const scheme of gradeSchemes) {
    const [min, max] = scheme.markRange.split("-").map(Number);
    if (totalMarks >= min && totalMarks <= max) {
      return { grade: scheme.grade, points: scheme.points };
    }
  }
  return { grade: "F", points: 0 };
}

function calculateAverageMarks(marksByJudges) {
  if (!marksByJudges || marksByJudges.length === 0) return 0;
  const valid = marksByJudges.filter((m) => m !== undefined && m !== null && m > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// POST - Judge submits marks for their assigned program
export async function POST(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { assignmentId, marksData } = body;
    // marksData: [{ registrationId, participantId, marks, comment }]

    if (!assignmentId || !Array.isArray(marksData) || marksData.length === 0) {
      return NextResponse.json(
        { success: false, message: "assignmentId and marksData are required" },
        { status: 400 }
      );
    }

    // Fetch the assignment
    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    const judgeIdx = assignment.judgeNumber - 1; // 0-based index

    // Get grade schemes
    const gradeSchemes = await GradeScheme.find().sort({ points: -1 });

    // Group marks by registrationId
    const byRegistration = {};
    for (const { registrationId, participantId, marks, comment } of marksData) {
      if (!byRegistration[registrationId]) {
        byRegistration[registrationId] = [];
      }
      byRegistration[registrationId].push({ participantId, marks, comment });
    }

    const affectedProgramIds = new Set();

    // Process each registration
    for (const [registrationId, participantUpdates] of Object.entries(byRegistration)) {
      const registration = await ProgramRegistration.findById(registrationId);
      if (!registration) continue;

      affectedProgramIds.add(registration.programId.toString());

      const bulkOps = [];
      for (const { participantId, marks, comment } of participantUpdates) {
        const participantIndex = registration.participants.findIndex(
          (p) => p.id.toString() === participantId.toString()
        );
        if (participantIndex === -1) continue;

        const currentParticipant = registration.participants[participantIndex];
        const currentMarksByJudges = [...(currentParticipant.marksByJudges || [])];

        // Ensure array is long enough
        while (currentMarksByJudges.length <= judgeIdx) {
          currentMarksByJudges.push(0);
        }
        currentMarksByJudges[judgeIdx] = Math.max(0, Math.min(100, Number(marks) || 0));

        const currentCommentsByJudges = [...(currentParticipant.commentsByJudges || [])];
        while (currentCommentsByJudges.length <= judgeIdx) {
          currentCommentsByJudges.push("");
        }
        currentCommentsByJudges[judgeIdx] = comment || "";

        const averageMarks = calculateAverageMarks(currentMarksByJudges);

        bulkOps.push({
          updateOne: {
            filter: {
              _id: registrationId,
              [`participants.${participantIndex}.id`]: participantId,
            },
            update: {
              $set: {
                [`participants.${participantIndex}.marksByJudges`]: currentMarksByJudges,
                [`participants.${participantIndex}.commentsByJudges`]: currentCommentsByJudges,
                [`participants.${participantIndex}.totalMarks`]: averageMarks,
              },
            },
          },
        });
      }

      if (bulkOps.length > 0) {
        await ProgramRegistration.bulkWrite(bulkOps);
      }
    }

    // Regenerate results for affected programs
    const activeYear = await getYear(request);

    for (const programId of affectedProgramIds) {
      const registrations = await ProgramRegistration.find({ programId })
        .populate("participants.id", "name age chestNumber")
        .populate("programId", "pointScheme");

      if (registrations.length === 0) continue;

      const pointsScheme =
        registrations[0].programId?.pointScheme
          ?.split(",")
          .map((p) => parseInt(p)) || [];

      const allParticipants = [];
      registrations.forEach((reg) => {
        reg.participants.forEach((p) => {
          if (p.totalMarks > 0) {
            allParticipants.push({
              id: p.id._id,
              codeLetter: p.codeLetter,
              totalMarks: p.totalMarks,
            });
          }
        });
      });

      if (allParticipants.length === 0) continue;

      allParticipants.sort((a, b) => b.totalMarks - a.totalMarks);

      const participants = allParticipants.map((p, index) => {
        const { grade, points } = calculateGrade(p.totalMarks, gradeSchemes);
        return {
          id: p.id,
          codeLetter: p.codeLetter,
          grade,
          points: points + (pointsScheme[index] || 0),
          rank: index + 1,
        };
      });

      let result = await Result.findOne({ programId, year: activeYear });
      if (result) {
        result.participants = participants;
        result.isResultDeclared = false;
        await result.save();
      } else {
        await Result.create({ programId, participants, isResultDeclared: false, year: activeYear });
      }
    }

    // Mark assignment as completed
    assignment.isCompleted = true;
    await assignment.save();

    return NextResponse.json({
      success: true,
      message: "Marks submitted successfully! Assignment marked as completed.",
    });
  } catch (error) {
    console.error("Error submitting judge marks:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit marks" },
      { status: 500 }
    );
  }
}
