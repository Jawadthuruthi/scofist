// app/api/program-registration/route.js
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import ProgramRegistration from "@/models/ProgramRegistration";
import Program from "@/models/Program";
import Participant from "@/models/Participant";
import Team from "@/models/Team";

// Helpers
const toId = (v) =>
  typeof v === "string" ? v : (v?.toString?.() ?? String(v));
const sameId = (a, b) => toId(a) === toId(b);

// ----------------------------- GET -----------------------------
export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const programId = searchParams.get("programId");
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status"); // "Registered" | "Evaluated"
    const divisionId = searchParams.get("divisionId");
    const isCodeLetter = searchParams.get("isCodeLetter") === "true";

    const query = {};
    if (programId) query.programId = programId;
    if (teamId) query.teamId = teamId;
    if (isCodeLetter)
      query["participants.codeLetter"] = { $exists: true, $ne: "" };

    // Fetch all results that match basic query, then filter by division/status in memory
    // (accurate pagination after filtering)
    const allRegs = await ProgramRegistration.find(query)
      .populate({
        path: "programId",
        select: "name type category maxParticipants divisionId",
        populate: { path: "divisionId", select: "name type" },
      })
      .populate({ path: "teamId", select: "name" })
      .populate({ path: "participants.id", select: "name chestNumber" })
      .sort({ createdAt: -1 });

    let filtered = allRegs;

    if (divisionId) {
      filtered = filtered.filter(
        (reg) => toId(reg.programId?.divisionId?._id) === toId(divisionId)
      );
    }

    if (status === "Evaluated") {
      filtered = filtered.filter((reg) =>
        reg.participants?.some((p) => (p.totalMarks || 0) > 0)
      );
    } else if (status === "Registered") {
      filtered = filtered.filter((reg) =>
        reg.participants?.every((p) => (p.totalMarks || 0) === 0)
      );
    }

    const totalCount = filtered.length;
    const pageItems = filtered.slice(skip, skip + limit);

    const transformedData = pageItems.map((reg, index) => ({
      _id: reg._id,
      serialNo: skip + index + 1,
      programId: reg.programId._id,
      programName: reg.programId.name,
      programType: reg.programId.type,
      programCategory: reg.programId.category,
      maxParticipants: reg.programId.maxParticipants,
      divisionId: reg.programId.divisionId?._id,
      divisionName: reg.programId.divisionId?.name,
      teamId: reg.teamId._id,
      teamName: reg.teamId?.name || "N/A",
      participants: (reg.participants || []).map((p) =>
        p?.id?._id ? toId(p.id._id) : toId(p.id)
      ),
      participantsDetails: (reg.participants || []).map((p) => ({
        id: p.id?._id || p.id,
        name: p.id?.name || "Unknown",
        chestNumber: p.id?.chestNumber,
        totalMarks: p.totalMarks,
        codeLetter: p.codeLetter || "",
        marksByJudges: p.marksByJudges || [],
      })),
      participantsCount: reg.participants?.length || 0,
      participantNames: (reg.participants || []).map((p) =>
        p?.id?.chestNumber
          ? `${p.id.chestNumber} - ${p.id?.name || "Unknown"}`
          : p?.id?.name || "Unknown"
      ),
      status: (reg.participants || []).some((p) => (p.totalMarks || 0) > 0)
        ? "Evaluated"
        : "Registered",
      createdAt: reg.createdAt,
      updatedAt: reg.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      registrations: transformedData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching program registrations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch program registrations" },
      { status: 500 }
    );
  }
}

// ----------------------------- POST -----------------------------
export async function POST(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { programId, participants, userId, activeRole } = body;

    if (
      !programId ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return NextResponse.json(
        { success: false, message: "Program ID and participants are required" },
        { status: 400 }
      );
    }

    // Fetch program
    const program = await Program.findById(programId).populate("divisionId");
    if (!program) {
      return NextResponse.json(
        { success: false, message: "Program not found" },
        { status: 404 }
      );
    }
    const division = program.divisionId;
    if (!division) {
      return NextResponse.json(
        { success: false, message: "Division not found" },
        { status: 404 }
      );
    }

    // Fetch participants with their teamId
    const participantDocs = await Participant.find({
      _id: { $in: participants },
    }).populate("divisionId");
    if (participantDocs.length !== participants.length) {
      return NextResponse.json(
        { success: false, message: "Some participants not found" },
        { status: 404 }
      );
    }

    // Verify division match
    const wrongDivision = participantDocs.filter(
      (p) => p.divisionId._id.toString() !== division._id.toString()
    );
    if (wrongDivision.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Participants must belong to the ${division.name} division`,
        },
        { status: 400 }
      );
    }

    // If Program Leader — check team ownership
    let allowedTeamIds = [];
    if (activeRole === "Program Leader") {
      const leaderTeams = await Team.find({ leaderId: userId }).select("_id");
      allowedTeamIds = leaderTeams.map((t) => t._id.toString());
      const invalid = participantDocs.filter(
        (p) => !allowedTeamIds.includes(p.teamId.toString())
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only register participants from your own teams",
          },
          { status: 403 }
        );
      }
    }

    // Group participants by teamId from DB
    const grouped = {};
    participantDocs.forEach((p) => {
      const tid = p.teamId.toString();
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(p._id.toString());
    });

    const createdRegs = [];
    for (const [teamId, teamParticipants] of Object.entries(grouped)) {
      // Capacity checks
      if (teamParticipants.length > program.maxParticipants) {
        return NextResponse.json(
          {
            success: false,
            message: `Maximum ${program.maxParticipants} participants allowed for this program`,
          },
          { status: 400 }
        );
      }

      // Prevent duplicate registration for team
      const exists = await ProgramRegistration.findOne({ programId, teamId });
      if (exists) {
        return NextResponse.json(
          {
            success: false,
            message: `Team ${teamId} already registered for this program`,
          },
          { status: 400 }
        );
      }

      // For Primary divisions, check individual stage/off-stage event limits
      if (division.type === "Primary" && program.type === "Individual") {
        for (const participantId of participants) {
          const participant = participantDocs.find(
            (p) => p._id === participantId
          );

          // Count current registrations for this participant in the same category
          const currentRegistrations = await ProgramRegistration.find({
            "participants.id": participantId,
          }).populate({
            path: "programId",
            select: "category type",
          });

          const currentCategoryCount = currentRegistrations.filter(
            (reg) =>
              reg.programId.category === program.category &&
              reg.programId.type === "Individual"
          ).length;

          let maxAllowed;
          if (program.category === "Stage") {
            maxAllowed = division.stageEvents || 0;
          } else if (program.category === "Off-Stage") {
            maxAllowed = division.offStageEvents || 0;
          }

          if (maxAllowed > 0 && currentCategoryCount >= maxAllowed) {
            return NextResponse.json(
              {
                success: false,
                message: `Participant ${participant.name} has reached maximum limit of ${maxAllowed} individual ${program.category.toLowerCase()} events`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Create registration for this team
      const participantData = teamParticipants.map((id) => ({
        id,
        codeLetter: "",
        marksByJudges: [],
        totalMarks: 0,
      }));
      const reg = await ProgramRegistration.create({
        programId,
        teamId,
        participants: participantData,
      });
      createdRegs.push(reg);

      // Add program to participants
      await Participant.updateMany(
        { _id: { $in: teamParticipants } },
        { $addToSet: { programs: { id: programId, rank: 0, points: 0 } } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Program registrations created successfully",
        data: createdRegs,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating program registration:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create program registration" },
      { status: 500 }
    );
  }
}

// ----------------------------- PUT -----------------------------
export async function PUT(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { ids, participants, userId, activeRole } = body;

    const id = Array.isArray(ids) ? ids[0] : ids;

    if (!id || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration ID and participants are required",
        },
        { status: 400 }
      );
    }

    const existingReg =
      await ProgramRegistration.findById(id).populate("programId");
    if (!existingReg) {
      return NextResponse.json(
        { success: false, message: "Registration not found" },
        { status: 404 }
      );
    }

    const program = await Program.findById(existingReg.programId).populate(
      "divisionId"
    );
    const division = program.divisionId;

    // Fetch participants with team info
    const participantDocs = await Participant.find({
      _id: { $in: participants },
    }).populate("divisionId");
    if (participantDocs.length !== participants.length) {
      return NextResponse.json(
        { success: false, message: "Some participants not found" },
        { status: 404 }
      );
    }

    // Division match
    const wrongDivision = participantDocs.filter(
      (p) => p.divisionId._id.toString() !== division._id.toString()
    );
    if (wrongDivision.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Participants must belong to the ${division.name} division`,
        },
        { status: 400 }
      );
    }

    // If leader, verify teams
    let allowedTeamIds = [];
    if (activeRole === "Program Leader") {
      const leaderTeams = await Team.find({ leaderId: userId }).select("_id");
      allowedTeamIds = leaderTeams.map((t) => t._id.toString());
      const invalid = participantDocs.filter(
        (p) => !allowedTeamIds.includes(p.teamId.toString())
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only update your own team's registrations",
          },
          { status: 403 }
        );
      }
    }

    // Group participants by teamId
    const grouped = {};
    participantDocs.forEach((p) => {
      const tid = p.teamId.toString();
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(p._id.toString());
    });

    const updatedRegs = [];

    for (const [teamId, teamParticipants] of Object.entries(grouped)) {
      if (teamParticipants.length > program.maxParticipants) {
        return NextResponse.json(
          {
            success: false,
            message: `Maximum ${program.maxParticipants} participants allowed for this program`,
          },
          { status: 400 }
        );
      }

      if (division.type === "Primary" && program.type === "Individual") {
        for (const participantId of participants) {
          const participant = participantDocs.find(
            (p) => p._id === participantId
          );

          // Count current registrations excluding this one
          const currentRegistrations = await ProgramRegistration.find({
            _id: { $ne: id },
            "participants.id": participantId,
          }).populate({
            path: "programId",
            select: "category type",
          });

          const currentCategoryCount = currentRegistrations.filter(
            (reg) =>
              reg.programId.category === program.category &&
              reg.programId.type === "Individual"
          ).length;

          let maxAllowed;
          if (program.category === "Stage") {
            maxAllowed = division.stageEvents || 0;
          } else if (program.category === "Off-Stage") {
            maxAllowed = division.offStageEvents || 0;
          }

          if (maxAllowed > 0 && currentCategoryCount >= maxAllowed) {
            return NextResponse.json(
              {
                success: false,
                message: `Participant ${participant.name} has reached maximum limit of ${maxAllowed} individual ${program.category.toLowerCase()} events`,
              },
              { status: 400 }
            );
          }
        }
      }

      const reg = await ProgramRegistration.findOne({
        programId: program._id,
        teamId,
      });

      if (reg) {
        // Update existing reg
        reg.participants = teamParticipants.map((id) => ({
          id,
          codeLetter: "",
          marksByJudges: [],
          totalMarks: 0,
        }));
        await reg.save();
        updatedRegs.push(reg);
      } else {
        // Create new reg for this team
        const newReg = await ProgramRegistration.create({
          programId: program._id,
          teamId,
          participants: teamParticipants.map((id) => ({
            id,
            codeLetter: "",
            marksByJudges: [],
            totalMarks: 0,
          })),
        });
        updatedRegs.push(newReg);
      }

      // Update participant program lists
      await Participant.updateMany(
        { _id: { $in: teamParticipants } },
        { $addToSet: { programs: { id: program._id, rank: 0, points: 0 } } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Program registrations updated successfully",
        data: updatedRegs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating program registration:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update program registration" },
      { status: 500 }
    );
  }
}

// ----------------------------- DELETE -----------------------------
export async function DELETE(request) {
  try {
    await connectToDB();

    const body = await request.json();
    const { ids, userId, activeRole } = body;

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Registration ID(s) are required" },
        { status: 400 }
      );
    }

    if (activeRole === "Program Leader") {
      const leaderTeam = await Team.findOne({ leaderId: userId });
      if (!leaderTeam) {
        return NextResponse.json(
          { success: false, message: "Team not found for this program leader" },
          { status: 404 }
        );
      }

      const regs = await ProgramRegistration.find({ _id: { $in: ids } });
      const unauthorized = regs.filter(
        (reg) => !sameId(reg.teamId, leaderTeam._id)
      );
      if (unauthorized.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only delete your team's registrations",
          },
          { status: 403 }
        );
      }
    }

    const regsWithMarks = await ProgramRegistration.find({
      _id: { $in: ids },
      "participants.totalMarks": { $gt: 0 },
    });
    if (regsWithMarks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete registrations that have marks assigned",
        },
        { status: 400 }
      );
    }

    // Capture participant-program pairs so we can clean up participants.programs later
    const regsToDelete = await ProgramRegistration.find({
      _id: { $in: ids },
    }).select("participants programId");
    const pairs = [];
    regsToDelete.forEach((reg) => {
      reg.participants.forEach((p) => {
        pairs.push({
          participantId: toId(p.id),
          programId: toId(reg.programId),
        });
      });
    });

    const result = await ProgramRegistration.deleteMany({ _id: { $in: ids } });

    // Remove program references from participants
    for (const pair of pairs) {
      await Participant.updateOne(
        { _id: pair.participantId },
        { $pull: { programs: { id: pair.programId } } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} registration(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting program registrations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete program registrations" },
      { status: 500 }
    );
  }
}
