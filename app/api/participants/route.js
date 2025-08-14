import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Participant from "@/models/Participant";
import Division from "@/models/Division";
import User from "@/models/User";

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
      .populate("batchId", ["_id", "name"])
      .populate("teamId", ["_id", "name"])
      .populate("divisionId", ["_id", "name"])
      .populate("programs.id", ["_id", "name"])
      .skip(page * limit)
      .limit(limit)
      .sort({ batchId: 1, _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

    // Get total count for pagination info
    const total = await Participant.countDocuments(query);

    const formattedParticipants = participants.map((participant) => ({
      ...participant.toObject(),
      batchId: participant.batchId?._id,
      batchName: participant.batchId?.name || "Unknown",
      teamId: participant.teamId?._id,
      teamName: participant.teamId?.name || "Unknown",
      divisionId: participant.divisionId?._id,
      divisionName: participant.divisionId?.name || "Unknown",
      programsCount: participant.programs?.length || 0,
      totalPoints:
        (participant.stagePoints || 0) + (participant.offStagePoints || 0),
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

// Helper function to reassign all chest numbers in a division
async function reassignAllChestNumbers(divisionId) {
  // Get division to find chest number range
  const division = await Division.findById(divisionId);
  if (!division || !division.chestNumberRange) {
    throw new Error("Division not found or chest number range not defined");
  }

  const { from, to } = division.chestNumberRange;

  // Get ALL participants in this division sorted by batch and ID
  const allParticipants = await Participant.find({
    divisionId: divisionId,
  })
    .populate("batchId", "name")
    .sort({ batchId: 1, _id: 1 });

  // Check if we have enough chest numbers
  if (allParticipants.length > to - from + 1) {
    throw new Error(
      `Not enough chest numbers available. Need ${allParticipants.length} but range only allows ${to - from + 1} (${from}-${to})`
    );
  }

  // Prepare bulk update operations
  const bulkOps = [];

  allParticipants.forEach((participant, index) => {
    const newChestNumber = from + index;
    bulkOps.push({
      updateOne: {
        filter: { _id: participant._id },
        update: { $set: { chestNumber: newChestNumber } },
      },
    });
  });

  // Perform bulk update for better performance
  if (bulkOps.length > 0) {
    await Participant.bulkWrite(bulkOps);
  }

  // Return the chest number assignments for reference
  const chestNumberAssignments = {};
  allParticipants.forEach((participant, index) => {
    chestNumberAssignments[participant._id] = from + index;
  });

  return chestNumberAssignments;
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

    // Create participant documents (without chest numbers initially)
    const participantsToCreate = users.map((user) => ({
      _id: user._id,
      name: user.name,
      batchId,
      teamId,
      divisionId,
      chestNumber: null,
      stagePoints,
      offStagePoints,
      programs: [],
    }));

    // Create all participants first
    const participants = await Participant.insertMany(participantsToCreate);

    // Now reassign ALL chest numbers in this division to maintain proper order
    const chestNumberAssignments = await reassignAllChestNumbers(divisionId);

    return NextResponse.json(
      {
        message: `${participants.length} participant(s) created successfully! All chest numbers have been updated.`,
        participants,
        chestNumberAssignments,
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

    // If division is being changed, reassign all chest numbers in both divisions
    if (updateData.divisionId) {
      const participant = await Participant.findById(participantId);
      if (!participant) {
        return NextResponse.json(
          { message: "Participant not found" },
          { status: 404 }
        );
      }

      const oldDivisionId = participant.divisionId.toString();
      const newDivisionId = updateData.divisionId;

      // Update the participant first
      const updatedParticipant = await Participant.findOneAndUpdate(
        { _id: participantId },
        { $set: updateData },
        { new: true }
      );

      // If division changed, reassign chest numbers in both divisions
      if (oldDivisionId !== newDivisionId) {
        // Reassign chest numbers in the old division
        await reassignAllChestNumbers(oldDivisionId);

        // Reassign chest numbers in the new division
        await reassignAllChestNumbers(newDivisionId);

        return NextResponse.json(
          {
            message:
              "Participant updated successfully! Chest numbers have been updated in both divisions.",
            participant: updatedParticipant,
          },
          { status: 200 }
        );
      }
    }

    const participant = await Participant.findOneAndUpdate(
      { _id: participantId },
      { $set: updateData },
      { new: true }
    );

    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Participant updated successfully!", participant },
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

    if (deletedParticipants.deletedCount === 0) {
      return NextResponse.json(
        { message: "No participants found to delete" },
        { status: 404 }
      );
    }

    // Reassign chest numbers in all affected divisions
    for (const divisionId of affectedDivisionIds) {
      await reassignAllChestNumbers(divisionId);
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
