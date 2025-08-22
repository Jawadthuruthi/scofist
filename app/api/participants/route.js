import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Participant from "@/models/Participant";
import Division from "@/models/Division";
import User from "@/models/User";
import Team from "@/models/Team";
import ProgramRegistration from "@/models/ProgramRegistration";
import Result from "@/models/Result";

async function assignChestNumbers(divisionId, participantCount) {
  try {
    // Get division with chest number range
    const division = await Division.findById(divisionId);
    if (!division || !division.chestNumberRange) {
      throw new Error("Division or chest number range not found");
    }

    const { from, to } = division.chestNumberRange;
    const rangeSize = to - from + 1;

    // Check if we have enough space in the range
    if (participantCount > rangeSize) {
      throw new Error(
        `Not enough chest numbers available. Range: ${from}-${to} (${rangeSize} numbers), Requested: ${participantCount}`
      );
    }

    // Get all existing chest numbers in this division
    const existingParticipants = await Participant.find(
      { divisionId, chestNumber: { $ne: null } },
      { chestNumber: 1 }
    ).sort({ chestNumber: 1 });

    const usedChestNumbers = new Set(
      existingParticipants.map((p) => p.chestNumber)
    );

    // Find the highest assigned chest number
    let highestChestNumber = 0;
    for (const participant of existingParticipants) {
      if (participant.chestNumber > highestChestNumber) {
        highestChestNumber = participant.chestNumber;
      }
    }

    const assignedNumbers = [];
    let currentNumber = highestChestNumber;

    // First, try to assign consecutive numbers after the highest
    for (let i = 0; i < participantCount; i++) {
      // If we haven't reached the end of range, try next number
      if (currentNumber < to) {
        currentNumber++;
        if (!usedChestNumbers.has(currentNumber)) {
          assignedNumbers.push(currentNumber);
          usedChestNumbers.add(currentNumber);
          continue;
        }
      }

      // If we can't assign consecutively or reached the end, find gaps
      let foundGap = false;

      // First check from the beginning of range for gaps
      for (let num = from; num <= to; num++) {
        if (!usedChestNumbers.has(num)) {
          assignedNumbers.push(num);
          usedChestNumbers.add(num);
          foundGap = true;
          break;
        }
      }

      if (!foundGap) {
        throw new Error(
          `No available chest numbers in range ${from}-${to}. Range is full.`
        );
      }
    }

    return assignedNumbers.sort((a, b) => a - b);
  } catch (error) {
    throw error;
  }
}

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
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
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.batchId) {
      query.batchId = filterParams.batchId;
    }
    if (filterParams.teamId) {
      query.teamId = filterParams.teamId;
    }
    if (filterParams.divisionId) {
      query.divisionId = filterParams.divisionId;
    }
    if (filterParams.chestNumber) {
      query.chestNumber = parseInt(filterParams.chestNumber);
    }

    // Execute query with pagination
    const participants = await Participant.find(query, projections)
      .populate("_id", ["_id", "name", "profilePic"])
      .populate("batchId", ["_id", "name"])
      .populate("teamId", ["_id", "name"])
      .populate("divisionId", ["_id", "name"])
      .populate("programs.id", ["_id", "name"])
      .skip(page * limit)
      .limit(limit)
      .sort({ chestNumber: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

    // Get total count for pagination info
    const total = await Participant.countDocuments(query);

    const formattedParticipants = participants.map((participant) => ({
      ...participant.toObject(),
      _id: participant._id?._id,
      profilePic: participant._id?.profilePic,
      batchId: participant.batchId?._id,
      batchName: participant.batchId?.name || "Unknown",
      teamId: participant.teamId?._id,
      teamName: participant.teamId?.name || "Unknown",
      divisionId: participant.divisionId?._id,
      divisionName: participant.divisionId?.name || "Unknown",
      programsCount: participant.programs?.length || 0,
      totalPoints:
        (participant.stagePoints || 0) + (participant.offStagePoints || 0),
      programs: participant.programs.map((program) => ({
        ...program.toObject(),
        id: program?.id?._id,
        name: program?.id?.name,
      })),
    }));

    return NextResponse.json(
      {
        participants: formattedParticipants,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Participants fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching participants:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const {
      participantIds,
      batchId,
      teamId,
      divisionId,
      stagePoints = 0,
      offStagePoints = 0,
    } = data;

    // Validate required fields
    if (
      !participantIds ||
      !Array.isArray(participantIds) ||
      participantIds.length === 0
    ) {
      return NextResponse.json(
        { message: "At least one participant must be selected" },
        { status: 400 }
      );
    }

    if (!teamId || !divisionId) {
      return NextResponse.json(
        { message: " Team, and Division are required" },
        { status: 400 }
      );
    }

    // Get user details for the selected participant IDs
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
      return NextResponse.json(
        { message: "Some selected users were not found" },
        { status: 400 }
      );
    }

    // Check if any participants already exist
    const existingParticipants = await Participant.find({
      _id: { $in: participantIds },
    });
    if (existingParticipants.length > 0) {
      const existingIds = existingParticipants.map((p) => p._id);

      return NextResponse.json(
        { message: `Participants already exist: ${existingIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Assign chest numbers for the new participants
    let assignedChestNumbers;
    try {
      assignedChestNumbers = await assignChestNumbers(
        divisionId,
        participantIds.length
      );
    } catch (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    // Create participant documents with assigned chest numbers
    const participantsToCreate = users.map((user, index) => ({
      _id: user._id,
      name: user.name,
      batchId,
      teamId,
      divisionId,
      chestNumber: assignedChestNumbers[index],
      stagePoints,
      offStagePoints,
      programs: [],
    }));

    // Create all participants first
    const participants = await Participant.insertMany(participantsToCreate);

    const participantIdsCreated = participants.map((p) => String(p._id));

    await Promise.all([
      Division.updateOne(
        { _id: divisionId },
        { $addToSet: { participantsId: { $each: participantIdsCreated } } }
      ),
      Team.updateOne(
        { _id: teamId },
        { $addToSet: { membersId: { $each: participantIdsCreated } } }
      ),
    ]);

    return NextResponse.json(
      {
        message: `${participants.length} participant(s) created successfully! All chest numbers have been updated.`,
        participants,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const data = await req.json();
    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const participantId = ids[0];
    const updateData = { ...data };
    delete updateData.ids;

    // Get the existing participant
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      );
    }

    const oldDivisionId = participant.divisionId.toString();
    const oldTeamId = participant.teamId.toString();

    // Update the participant
    const updatedParticipant = await Participant.findOneAndUpdate(
      { _id: participantId },
      { $set: updateData },
      { new: true }
    );

    // If division changed
    if (updateData.divisionId && updateData.divisionId !== oldDivisionId) {
      await Promise.all([
        Division.updateOne(
          { _id: oldDivisionId },
          { $pull: { participantsId: participantId } }
        ),
        Division.updateOne(
          { _id: updateData.divisionId },
          { $addToSet: { participantsId: participantId } }
        ),
        ProgramRegistration.updateMany(
          { "participants.id": participantId },
          { $pull: { participants: { id: participantId } } }
        ),
        Result.updateMany(
          { "participants.id": participantId },
          { $pull: { participants: { id: participantId } } }
        ),
      ]);
    }

    // If team changed
    if (updateData.teamId && updateData.teamId !== oldTeamId) {
      await Promise.all([
        Team.updateOne(
          { _id: oldTeamId },
          { $pull: { membersId: participantId } }
        ),
        Team.updateOne(
          { _id: updateData.teamId },
          { $addToSet: { membersId: participantId } }
        ),
      ]);
    }

    return NextResponse.json(
      {
        message: "Participant updated successfully!",
        participant: updatedParticipant,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Get the division IDs of participants being deleted to reassign chest numbers later
    const participantsToDelete = await Participant.find({
      _id: { $in: ids },
    }).select("divisionId");
    const affectedDivisionIds = [
      ...new Set(participantsToDelete.map((p) => p.divisionId.toString())),
    ];

    // Delete participants
    const deletedParticipants = await Participant.deleteMany({
      _id: { $in: ids },
    });

    await Promise.all([
      Division.updateMany(
        { participantsId: { $in: ids } },
        { $pull: { participantsId: { $in: ids } } }
      ),
      Team.updateMany(
        { membersId: { $in: ids } },
        { $pull: { membersId: { $in: ids } } }
      ),
      ProgramRegistration.updateMany(
        { "participants.id": { $in: ids } },
        { $pull: { participants: { id: { $in: ids } } } }
      ),
      Result.updateMany(
        { "participants.id": { $in: ids } },
        { $pull: { participants: { id: { $in: ids } } } }
      ),
    ]);

    if (deletedParticipants.deletedCount === 0) {
      return NextResponse.json(
        { message: "No participants found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `${deletedParticipants.deletedCount} participant(s) deleted successfully! Chest numbers have been updated.`,
        deletedParticipants,
        affectedDivisions: affectedDivisionIds.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
