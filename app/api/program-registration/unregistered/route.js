// app/api/registration-status/unregistered/route.js
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Program from "@/models/Program";
import ProgramRegistration from "@/models/ProgramRegistration";
import Team from "@/models/Team";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Filter parameters
    const programId = searchParams.get("programId");
    const divisionId = searchParams.get("divisionId");
    const programType = searchParams.get("programType");
    const programCategory = searchParams.get("programCategory");
    const teamId = searchParams.get("teamId");

    // Build program query
    const programQuery = {};
    if (programId) programQuery._id = programId;
    if (divisionId) programQuery.divisionId = divisionId;
    if (programType) programQuery.type = programType;
    if (programCategory) programQuery.category = programCategory;

    // Fetch all programs that match the filter criteria
    const allPrograms = await Program.find(programQuery)
      .populate({
        path: "divisionId",
        select: "name type",
      })
      .sort({ createdAt: -1 });

    // Get all registrations (optionally filter by team)
    const registrationQuery = teamId ? { teamId } : {};
    const registrations =
      await ProgramRegistration.find(registrationQuery).select(
        "programId teamId"
      );

    let unregisteredProgramsFull = [];

    if (teamId) {
      // Specific team view: programs not registered by this team
      const registeredProgramIds = new Set(
        registrations.map((reg) => reg.programId.toString())
      );

      unregisteredProgramsFull = allPrograms.filter(
        (program) => !registeredProgramIds.has(program._id.toString())
      );
    } else {
      // Program Committee view: programs with missing registrations from any team
      const allTeams = await Team.find({}).select("_id name");

      // Group registrations by program
      const registrationsByProgram = {};
      registrations.forEach((reg) => {
        const programId = reg.programId.toString();
        if (!registrationsByProgram[programId])
          registrationsByProgram[programId] = [];
        registrationsByProgram[programId].push(reg.teamId.toString());
      });

      // Create detailed unregistered data showing missing teams per program
      unregisteredProgramsFull = allPrograms
        .map((program) => {
          const programId = program._id.toString();
          const registeredTeamIds = registrationsByProgram[programId] || [];
          const missingTeamIds = allTeams.filter(
            (team) => !registeredTeamIds.includes(team._id.toString())
          );

          return {
            ...program.toObject(),
            missingTeams: missingTeamIds,
            registeredTeamsCount: registeredTeamIds.length,
            totalTeamsCount: allTeams.length,
            hasMissingRegistrations: missingTeamIds.length > 0,
          };
        })
        .filter((program) => program.hasMissingRegistrations);
    }

    // Apply pagination
    const total = unregisteredProgramsFull.length;
    const pageItems = unregisteredProgramsFull.slice(skip, skip + limit);

    const transformedData = pageItems.map((program, index) => {
      const baseData = {
        _id: program._id,
        serialNo: skip + index + 1,
        programId: program._id,
        programName: program.name,
        programType: program.type,
        programCategory: program.category,
        maxParticipants: program.maxParticipants,
        divisionId: program.divisionId?._id,
        divisionName: program.divisionId?.name || "Unknown",
        registrationStatus: "Not Registered",
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      };

      if (!teamId && program.missingTeams) {
        // For Program Committee view, add missing teams info
        const missingTeamNames = program.missingTeams.map((team) => team.name);
        return {
          ...baseData,
          missingTeamsCount: program.missingTeams.length,
          registeredTeamsCount: program.registeredTeamsCount,
          totalTeamsCount: program.totalTeamsCount,
          registrationStatus: `${missingTeamNames.join(", ")} Missing`,
        };
      }

      return baseData;
    });

    return NextResponse.json({
      success: true,
      unregisteredPrograms: transformedData,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit) || 1,
        total,
        hasNextPage: skip + limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching unregistered programs:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch unregistered programs",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
