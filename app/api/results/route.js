import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import ProgramRegistration from "@/models/ProgramRegistration";
import GradeScheme from "@/models/GradeScheme";

// Helper function to calculate grade from marks
function calculateGrade(totalMarks, gradeSchemes) {
  for (const scheme of gradeSchemes) {
    const [min, max] = scheme.markRange.split("-").map(Number);
    if (totalMarks >= min && totalMarks <= max) {
      return {
        grade: scheme.grade,
        points: scheme.points,
      };
    }
  }
  return { grade: "F", points: 0 };
}

// Helper function to calculate average marks
function calculateAverageMarks(marksByJudges) {
  if (!marksByJudges || marksByJudges.length === 0) return 0;
  const sum = marksByJudges.reduce((acc, mark) => acc + (mark || 0), 0);
  return Math.round(sum / marksByJudges.length);
}

// ----------------------------- GET - Fetch Results -----------------------------
export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    const divisionId = searchParams.get("divisionId");
    const programId = searchParams.get("programId");
    const isResultDeclared = searchParams.get("isResultDeclared");
    const type = searchParams.get("type");
    const category = searchParams.get("category");

    // Build query
    const query = {};
    if (programId) query.programId = programId;
    if (isResultDeclared !== null && isResultDeclared !== undefined) {
      query.isResultDeclared = isResultDeclared === "true";
    }

    // Get all results with program and division details
    const results = await Result.find(query)
      .populate({
        path: "programId",
        select: "name type category divisionId pointScheme",
        populate: {
          path: "divisionId",
          select: "name type",
        },
      })
      .populate({
        path: "participants.id",
        select: "name age chestNumber",
      })
      .sort({ createdAt: -1 });

    // Filter results based on additional criteria
    let filteredResults = results.filter((result) => {
      if (!result.programId) return false;

      const program = result.programId;
      const division = program.divisionId;

      if (divisionId && (!division || division._id.toString() !== divisionId)) {
        return false;
      }
      if (type && program.category !== type) {
        return false;
      }
      if (category && program.category !== category) {
        return false;
      }

      return true;
    });

    // Format results with detailed information
    const formattedResults = filteredResults.map((result) => ({
      _id: result._id,
      programId: result.programId._id,
      programName: result.programId.name,
      programCategory: result.programId.category,
      programCategory: result.programId.category,
      pointScheme: result.programId.pointScheme,
      divisionId: result.programId.divisionId?._id,
      divisionName: result.programId.divisionId?.name,
      participants: result.participants.map((p) => ({
        ...p.toObject(),
        participantDetails: p.id,
      })),
      isResultDeclared: result.isResultDeclared,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));

    const totalCount = filteredResults.length;
    const paginatedResults = formattedResults.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      results: paginatedResults,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// ----------------------------- POST - Generate Results -----------------------------
export async function POST(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { programId, userId, activeRole, userName } = body;

    if (!programId) {
      return NextResponse.json(
        { success: false, message: "Program ID is required" },
        { status: 400 }
      );
    }

    // Get grade schemes for calculation
    const gradeSchemes = await GradeScheme.find().sort({ points: -1 });

    // Get all registrations for this program
    const registrations = await ProgramRegistration.find({ programId })
      .populate("participants.id", "name age chestNumber")
      .populate("programId", "pointScheme");

    if (registrations.length === 0) {
      return NextResponse.json(
        { success: false, message: "No registrations found for this program" },
        { status: 404 }
      );
    }

    const pointsScheme =
      registrations[0].programId.pointScheme
        ?.split(",")
        .map((p) => parseInt(p)) || [];

    // Collect all participants with marks
    const allParticipants = [];
    registrations.forEach((reg) => {
      reg.participants.forEach((p) => {
        const averageMarks = calculateAverageMarks(p.marksByJudges);
        if (averageMarks > 0) {
          allParticipants.push({
            id: p.id._id,
            codeLetter: p.codeLetter,
            totalMarks: averageMarks,
            participantDetails: p.id,
          });
        }
      });
    });

    if (allParticipants.length === 0) {
      return NextResponse.json(
        { success: false, message: "No participants with marks found" },
        { status: 404 }
      );
    }

    // Sort by total marks (descending)
    allParticipants.sort((a, b) => b.totalMarks - a.totalMarks);

    // Calculate final results with grades and points
    const participants = allParticipants.map((p, index) => {
      const { grade, points } = calculateGrade(p.totalMarks, gradeSchemes);
      const positionBonus = pointsScheme[index] || 0;

      return {
        id: p.id,
        codeLetter: p.codeLetter,
        grade,
        points: points + positionBonus,
        rank: index + 1,
      };
    });

    // Create or update result
    let result = await Result.findOne({ programId });
    if (result) {
      result.participants = participants;
      result.isResultDeclared = false; // Reset declaration status
      await result.save();
    } else {
      result = await Result.create({
        programId,
        participants,
        isResultDeclared: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Results generated successfully",
      result: {
        _id: result._id,
        programId: result.programId,
        participants: result.participants,
        isResultDeclared: result.isResultDeclared,
      },
    });
  } catch (error) {
    console.error("Error generating results:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate results",
      },
      { status: 500 }
    );
  }
}

// ----------------------------- PUT - Declare Results -----------------------------
export async function PUT(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { resultId, isResultDeclared, userId, activeRole, userName } = body;

    if (!resultId) {
      return NextResponse.json(
        { success: false, message: "Result ID is required" },
        { status: 400 }
      );
    }

    // Find and update the result
    const result = await Result.findById(resultId).populate({
      path: "programId",
      select: "name type category divisionId",
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Result not found" },
        { status: 404 }
      );
    }

    const newDeclarationStatus =
      isResultDeclared !== undefined
        ? isResultDeclared
        : !result.isResultDeclared;

    // Import models here to avoid circular dependency issues
    const Participant = (await import("@/models/Participant")).default;
    const Team = (await import("@/models/Team")).default;

    if (newDeclarationStatus) {
      // DECLARING RESULT - Update participant and team records
      const updatePromises = result.participants.map(
        async (participantResult) => {
          const participantId = participantResult.id;
          const programId = result.programId._id;
          const programCategory = result.programId.category;
          const programType = result.programId.type;

          // Update participant's program entry
          const participant = await Participant.findById(participantId);
          if (participant) {
            // Find existing program entry or create new one
            const existingProgramIndex = participant.programs.findIndex(
              (p) => p.id.toString() === programId.toString()
            );

            const programEntry = {
              id: programId,
              rank: participantResult.rank,
              grade: participantResult.grade,
              points: participantResult.points,
            };

            if (existingProgramIndex >= 0) {
              participant.programs[existingProgramIndex] = programEntry;
            } else {
              participant.programs.push(programEntry);
            }

            // Update stage/off-stage points
            if (programCategory === "Stage" && programType === "Individual") {
              participant.stagePoints =
                (participant.stagePoints || 0) + participantResult.points;
            } else if (
              programCategory === "Off-Stage" &&
              programType === "Individual"
            ) {
              participant.offStagePoints =
                (participant.offStagePoints || 0) + participantResult.points;
            }

            await participant.save();

            // Update team points
            const team = await Team.findById(participant.teamId);
            if (team) {
              if (programCategory === "Stage") {
                team.stagePoints =
                  (team.stagePoints || 0) + participantResult.points;
              } else {
                team.offStagePoints =
                  (team.offStagePoints || 0) + participantResult.points;
              }
              await team.save();
            }
          }
        }
      );

      await Promise.all(updatePromises);
    } else {
      // UNDECLARING RESULT - Remove participant and team records
      const updatePromises = result.participants.map(
        async (participantResult) => {
          const participantId = participantResult.id;
          const programId = result.programId._id;
          const programCategory = result.programId.category;
          const programType = result.programId.type;

          // Update participant's program entry
          const participant = await Participant.findById(participantId);
          if (participant) {
            // Remove the program entry
            participant.programs = participant.programs.filter(
              (p) => p.id.toString() !== programId.toString()
            );

            // Subtract stage/off-stage points
            if (programCategory === "Stage" && programType === "Individual") {
              participant.stagePoints = Math.max(
                0,
                (participant.stagePoints || 0) - participantResult.points
              );
            } else if (
              programCategory === "Off-Stage" &&
              programType === "Individual"
            ) {
              participant.offStagePoints = Math.max(
                0,
                (participant.offStagePoints || 0) - participantResult.points
              );
            }

            await participant.save();

            // Update team points
            const team = await Team.findById(participant.teamId);
            if (team) {
              if (programCategory === "Stage") {
                team.stagePoints = Math.max(
                  0,
                  (team.stagePoints || 0) - participantResult.points
                );
              } else {
                team.offStagePoints = Math.max(
                  0,
                  (team.offStagePoints || 0) - participantResult.points
                );
              }
              await team.save();
            }
          }
        }
      );

      await Promise.all(updatePromises);
    }

    // Update result declaration status
    result.isResultDeclared = newDeclarationStatus;
    await result.save();

    return NextResponse.json({
      success: true,
      message: `Result ${result.isResultDeclared ? "declared" : "undeclared"} successfully`,
      result: {
        _id: result._id,
        programId: result.programId._id,
        programName: result.programId.name,
        isResultDeclared: result.isResultDeclared,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating result declaration:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update result declaration",
      },
      { status: 500 }
    );
  }
}

// ----------------------------- DELETE - Delete Results -----------------------------
export async function DELETE(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const resultId = searchParams.get("resultId");
    const programId = searchParams.get("programId");

    if (!resultId && !programId) {
      return NextResponse.json(
        { success: false, message: "Result ID or Program ID is required" },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    if (resultId) {
      const result = await Result.findByIdAndDelete(resultId);
      deletedCount = result ? 1 : 0;
    } else if (programId) {
      const deleteResult = await Result.deleteMany({ programId });
      deletedCount = deleteResult.deletedCount;
    }

    if (deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "No results found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `${deletedCount} result(s) deleted successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting results:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete results",
      },
      { status: 500 }
    );
  }
}
