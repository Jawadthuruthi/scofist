import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import ProgramRegistration from "@/models/ProgramRegistration";
import Program from "@/models/Program";
import Team from "@/models/Team";
import Participant from "@/models/Participant";
import Division from "@/models/Division";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;
    const userId = url.searchParams.get("userId");
    const activeRole = url.searchParams.get("activeRole");

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination and auth parameters
      if (
        !["page", "limit", "projection", "userId", "activeRole"].includes(key)
      ) {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams._id;
    }
    if (filterParams.programId) {
      query.programId = filterParams.programId;
    }
    if (filterParams.teamId) {
      query.teamId = filterParams.teamId;
    }

    // Role-based filtering for GET
    if (activeRole === "Program Leader" && userId) {
      // Program Leader can only see their team's registrations
      const userTeam = await Team.findOne({ leaderId: userId });
      if (userTeam) {
        query.teamId = userTeam._id;
      } else {
        // No team found, return empty results
        return NextResponse.json(
          {
            registrations: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
            message: "No registrations found for this Program Leader",
          },
          { status: 200 }
        );
      }
    }
    // Program Committee can see all registrations (no additional filtering needed)

    if (filterParams.status) {
      // Custom status filter based on registration state
      if (filterParams.status === "registered") {
        query["participants.0"] = { $exists: true };
      } else if (filterParams.status === "evaluated") {
        query["participants.totalMarks"] = { $gt: 0 };
      } else if (filterParams.status === "in-progress") {
        query["participants.marksByJudges"] = { $not: { $size: 0 } };
      }
    }

    // Execute query with pagination
    const registrations = await ProgramRegistration.find(query, projections)
      .populate("programId", [
        "_id",
        "name",
        "maxParticipants",
        "type",
        "pointScheme",
        "category",
        "divisionId",
      ])
      .populate("teamId", ["_id", "name"])
      .populate("participants.id", ["_id", "name", "chestNumber"])
      .skip(page * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination info
    const total = await ProgramRegistration.countDocuments(query);

    const formattedRegistrations = registrations.map((registration) => {
      const participantNames = registration.participants.map((p) =>
        p.id?.chestNumber
          ? `${p.id.chestNumber} - ${p.id?.name || "Unknown"}`
          : p.id?.name || "Unknown"
      );

      let status = "Registered";
      if (registration.participants.some((p) => p.totalMarks > 0)) {
        status = "Evaluated";
      } else if (
        registration.participants.some(
          (p) => p.marksByJudges && p.marksByJudges.length > 0
        )
      ) {
        status = "In Progress";
      }

      return {
        ...registration.toObject(),
        programId: registration.programId?._id || "Unknown",
        teamId: registration.teamId?._id || "Unknown",
        programName: registration.programId?.name || "Unknown",
        teamName: registration.teamId?.name || "Unknown",
        participantsCount: registration.participants.length,
        participantNames: participantNames,
        participants: registration.participants.map(
          (p) => p.id?._id || "Unknown"
        ),
        status: status,
      };
    });

    return NextResponse.json(
      {
        registrations: formattedRegistrations,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Program registrations fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching program registrations:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const {
      programId,
      teamId,
      participants: participantIds,
      userId,
      activeRole,
    } = data;

    // Validate required fields
    if (
      !programId ||
      !participantIds ||
      !Array.isArray(participantIds) ||
      participantIds.length === 0
    ) {
      return NextResponse.json(
        { message: "Program and participants are required" },
        { status: 400 }
      );
    }

    // Get program details to validate
    const program = await Program.findById(programId).populate("divisionId");
    if (!program) {
      return NextResponse.json(
        { message: "Program not found" },
        { status: 404 }
      );
    }

    // Get division to validate stage/off-stage event limits
    const division = await Division.findById(program.divisionId);
    if (!division) {
      return NextResponse.json(
        { message: "Division not found for this program" },
        { status: 404 }
      );
    }

    // Validate participant count against program max participants
    if (participantIds.length > program.maxParticipants) {
      return NextResponse.json(
        {
          message: `Too many participants. Maximum allowed: ${program.maxParticipants}`,
        },
        { status: 400 }
      );
    }

    let finalTeamId = teamId;

    // Handle role-based logic
    if (activeRole === "Program Leader") {
      // For Program Leader, get their team ID
      if (!userId) {
        return NextResponse.json(
          { message: "User ID is required for Program Leader" },
          { status: 400 }
        );
      }

      const userTeam = await Team.findOne({ leaderId: userId });
      if (!userTeam) {
        return NextResponse.json(
          { message: "No team found for this Program Leader" },
          { status: 403 }
        );
      }

      finalTeamId = userTeam._id;

      // Validate that all selected participants belong to this team
      const teamParticipants = await Participant.find({
        _id: { $in: participantIds },
        teamId: finalTeamId,
      });

      if (teamParticipants.length !== participantIds.length) {
        return NextResponse.json(
          { message: "You can only register participants from your own team" },
          { status: 403 }
        );
      }
    } else if (activeRole === "Program Committee") {
      // For Program Committee, teamId must be provided
      if (!teamId) {
        return NextResponse.json(
          { message: "Team ID is required" },
          { status: 400 }
        );
      }

      // Program Committee can register any participants from any team
      // No need to validate team ownership for committee
      finalTeamId = teamId;
    } else {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Check for existing registration
    const existingRegistration = await ProgramRegistration.findOne({
      programId: programId,
      teamId: finalTeamId,
    });

    if (existingRegistration) {
      return NextResponse.json(
        { message: "Team is already registered for this program" },
        { status: 409 }
      );
    }

    // Validate division event limits
    // Count existing registrations for each participant in this division
    for (const participantId of participantIds) {
      const participant = await Participant.findById(participantId).populate({
        path: "programs.id",
        select: "type divisionId",
      });

      if (!participant) {
        return NextResponse.json(
          { message: `Participant ${participantId} not found` },
          { status: 404 }
        );
      }

      // Count stage and off-stage events in the same division
      let stageEventCount = 0;
      let offStageEventCount = 0;

      for (const prog of participant.programs) {
        if (prog.id && prog.id.divisionId?.toString() === division._id) {
          if (prog.id.type === "Stage") {
            stageEventCount++;
          } else if (prog.id.type === "Off Stage") {
            offStageEventCount++;
          }
        }
      }

      // Check if adding this program would exceed limits
      if (program.type === "Stage") {
        if (division.stageEvents && stageEventCount >= division.stageEvents) {
          return NextResponse.json(
            {
              message: `Participant ${participant.name} has already reached the maximum of ${division.stageEvents} stage events in this division`,
            },
            { status: 400 }
          );
        }
      } else if (program.type === "Off Stage") {
        if (
          division.offStageEvents &&
          offStageEventCount >= division.offStageEvents
        ) {
          return NextResponse.json(
            {
              message: `Participant ${participant.name} has already reached the maximum of ${division.offStageEvents} off-stage events in this division`,
            },
            { status: 400 }
          );
        }
      }
    }

    const participants = participantIds.map((participantId) => ({
      id: participantId,
      codeLetter: "", // A, B, C, etc.
      marksByJudges: [],
      totalMarks: 0,
    }));

    // Create new program registration
    const registration = await ProgramRegistration.create({
      programId,
      teamId: finalTeamId,
      participants,
    });

    // Update participants' programs array
    await Promise.all(
      participantIds.map(async (participantId) => {
        await Participant.findByIdAndUpdate(participantId, {
          $push: {
            programs: {
              id: programId,
              rank: 0,
              points: 0,
            },
          },
        });
      })
    );

    return NextResponse.json(
      {
        message: "Program registration created successfully!",
        registration,
        _id: registration._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating program registration:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const {
      ids,
      participants: updatedParticipants,
      userId,
      activeRole,
      programId,
      teamId,
      participants: newParticipantIds,
    } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const registrationId = ids[0];

    // Get existing registration
    const registration =
      await ProgramRegistration.findById(registrationId).populate("programId");
    if (!registration) {
      return NextResponse.json(
        { message: "Registration not found" },
        { status: 404 }
      );
    }

    // Role-based authorization
    if (activeRole === "Program Leader") {
      const userTeam = await Team.findOne({ leaderId: userId });
      if (
        !userTeam ||
        userTeam._id.toString() !== registration.teamId.toString()
      ) {
        return NextResponse.json(
          { message: "You can only update your own team's registrations" },
          { status: 403 }
        );
      }
    } else if (activeRole !== "Program Committee") {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Store old participants for cleanup
    const oldParticipantIds = registration.participants.map((p) => p.id);

    // Update participants if provided (for form-based updates)
    if (newParticipantIds && Array.isArray(newParticipantIds)) {
      // Get program and division for validation
      const program =
        registration.programId || (await Program.findById(programId));
      if (!program) {
        return NextResponse.json(
          { message: "Program not found" },
          { status: 404 }
        );
      }

      const division = await Division.findById(program.divisionId);
      if (!division) {
        return NextResponse.json(
          { message: "Division not found for this program" },
          { status: 404 }
        );
      }

      // Validate participant count
      if (newParticipantIds.length > program.maxParticipants) {
        return NextResponse.json(
          {
            message: `Too many participants. Maximum allowed: ${program.maxParticipants}`,
          },
          { status: 400 }
        );
      }

      // Validate based on role
      if (activeRole === "Program Leader") {
        const userTeam = await Team.findOne({ leaderId: userId });
        if (!userTeam) {
          return NextResponse.json(
            { message: "No team found for this Program Leader" },
            { status: 403 }
          );
        }

        // Validate that all participants belong to the leader's team
        const teamParticipants = await Participant.find({
          _id: { $in: newParticipantIds },
          teamId: userTeam._id,
        });

        if (teamParticipants.length !== newParticipantIds.length) {
          return NextResponse.json(
            {
              message:
                "You can only update with participants from your own team",
            },
            { status: 403 }
          );
        }
      }
      // Program Committee can update with any participants (no validation needed)

      // Validate division event limits for new participants
      const newParticipantsToCheck = newParticipantIds.filter(
        (id) => !oldParticipantIds.includes(id)
      );

      for (const participantId of newParticipantsToCheck) {
        const participant = await Participant.findById(participantId).populate({
          path: "programs.id",
          select: "type divisionId",
        });

        if (!participant) {
          return NextResponse.json(
            { message: `Participant ${participantId} not found` },
            { status: 404 }
          );
        }

        // Count stage and off-stage events in the same division
        let stageEventCount = 0;
        let offStageEventCount = 0;

        for (const prog of participant.programs) {
          if (prog.id && prog.id.divisionId?.toString() === division._id) {
            if (prog.id.type === "Stage") {
              stageEventCount++;
            } else if (prog.id.type === "Off Stage") {
              offStageEventCount++;
            }
          }
        }

        // Check if adding this program would exceed limits
        if (program.type === "Stage") {
          if (division.stageEvents && stageEventCount >= division.stageEvents) {
            return NextResponse.json(
              {
                message: `Participant ${participant.name} has already reached the maximum of ${division.stageEvents} stage events in this division`,
              },
              { status: 400 }
            );
          }
        } else if (program.type === "Off Stage") {
          if (
            division.offStageEvents &&
            offStageEventCount >= division.offStageEvents
          ) {
            return NextResponse.json(
              {
                message: `Participant ${participant.name} has already reached the maximum of ${division.offStageEvents} off-stage events in this division`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Update participants with new structure
      registration.participants = newParticipantIds.map((participantId) => ({
        id: participantId,
        codeLetter: "",
        marksByJudges: [],
        totalMarks: 0,
      }));

      // Clean up old participant programs
      await Promise.all(
        oldParticipantIds.map(async (participantId) => {
          await Participant.findByIdAndUpdate(participantId, {
            $pull: {
              programs: { id: registration.programId._id },
            },
          });
        })
      );

      // Update new participants' programs array
      await Promise.all(
        newParticipantIds.map(async (participantId) => {
          // Check if participant already has this program
          const participant = await Participant.findById(participantId);
          const hasProgram = participant.programs.some(
            (p) => p.id.toString() === registration.programId._id.toString()
          );

          if (!hasProgram) {
            await Participant.findByIdAndUpdate(participantId, {
              $push: {
                programs: {
                  id: registration.programId._id,
                  rank: 0,
                  points: 0,
                },
              },
            });
          }
        })
      );
    }

    // Update participants for scoring/evaluation (when updatedParticipants is provided)
    if (updatedParticipants && Array.isArray(updatedParticipants)) {
      registration.participants = updatedParticipants.map((p) => ({
        id: p,
        codeLetter: "",
        totalMarks: 0,
        marksByJudges: [],
      }));
    }

    const updatedRegistration = await registration.save();

    return NextResponse.json(
      {
        message: "Program registration updated successfully!",
        registration: updatedRegistration,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating program registration:", error);
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    console.log(data);
    const { ids, userId, activeRole } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Get registrations to be deleted for cleanup
    const registrationsToDelete = await ProgramRegistration.find({
      _id: { $in: ids },
    });

    if (registrationsToDelete.length === 0) {
      return NextResponse.json(
        { message: "No registrations found to delete" },
        { status: 404 }
      );
    }

    // Role-based authorization for deletion
    if (activeRole === "Program Leader") {
      const userTeam = await Team.findOne({ leaderId: userId });
      if (!userTeam) {
        return NextResponse.json(
          { message: "No team found for this Program Leader" },
          { status: 403 }
        );
      }

      // Check if all registrations belong to the user's team
      const unauthorizedRegistrations = registrationsToDelete.filter(
        (reg) => reg.teamId.toString() !== userTeam._id.toString()
      );

      if (unauthorizedRegistrations.length > 0) {
        return NextResponse.json(
          { message: "You can only delete your own team's registrations" },
          { status: 403 }
        );
      }
    }
    // Program Committee can delete any registrations (no additional check needed)

    // Clean up participants' programs array
    for (const registration of registrationsToDelete) {
      const participantIds = registration.participants.map((p) => p.id);

      // Remove program from participants
      await Promise.all(
        participantIds.map(async (participantId) => {
          await Participant.findByIdAndUpdate(participantId, {
            $pull: {
              programs: { id: registration.programId },
            },
          });
        })
      );
    }

    // Delete the registrations
    const deletedRegistrations = await ProgramRegistration.deleteMany({
      _id: { $in: ids },
    });

    return NextResponse.json(
      {
        message: `${deletedRegistrations.deletedCount} registration(s) deleted successfully!`,
        deletedRegistrations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting program registration:", error);
    return apiResponse.error(error);
  }
}
