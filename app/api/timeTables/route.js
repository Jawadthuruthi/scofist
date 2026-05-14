import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import TimeTable from "@/models/TimeTable";
import { NextResponse } from "next/server";

// Constants
const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 10;
const MONGODB_MAX_BATCH_SIZE = 500; // MongoDB has limits on transaction size

// Helper functions
const extractQueryParams = (url) => {
  const page = parseInt(
    url.searchParams.get("page") || DEFAULT_PAGE.toString()
  );
  const limit = parseInt(
    url.searchParams.get("limit") || DEFAULT_LIMIT.toString()
  );

  const filterParams = {};
  const projections = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "page" && key !== "limit" && key !== "projection") {
      filterParams[key] = value;
    }
  }

  const projectionParam = url.searchParams.get("projection");
  if (projectionParam) {
    projectionParam.split(",").forEach((field) => {
      projections[field] = 1;
    });
  }

  return { page, limit, filterParams, projections };
};

// Process a single timetable update to prevent duplicating code
const processSingleUpdate = async (item) => {
  const { _id, classId, timeSlots } = item;

  // Input validation
  if (!classId) {
    throw new Error("Class ID is required");
  }

  const filter = _id ? { _id } : { classId };
  let updatedTimeTable;

  if (_id) {
    // Transaction-like operation: First remove existing slot, then add new one
    const existingTimeTable = await TimeTable.findOne(filter);

    if (!existingTimeTable) {
      return null; // Skip this item if timetable not found
    }

    // Remove slot with same day and period
    existingTimeTable.timeSlots = existingTimeTable.timeSlots.filter(
      (slot) =>
        !(
          slot.day === timeSlots.day &&
          slot.periodNumber === timeSlots.periodNumber
        )
    );

    // Add new slot
    existingTimeTable.timeSlots.push(timeSlots);
    updatedTimeTable = await existingTimeTable.save();
  } else {
    // Check if a timetable already exists for this class
    const existingTimeTable = await TimeTable.findOne({ classId });

    if (existingTimeTable) {
      // Remove slot with same day and period if exists
      existingTimeTable.timeSlots = existingTimeTable.timeSlots.filter(
        (slot) =>
          !(
            slot.day === timeSlots.day &&
            slot.periodNumber === timeSlots.periodNumber
          )
      );

      // Add new slot
      existingTimeTable.timeSlots.push(timeSlots);
      updatedTimeTable = await existingTimeTable.save();
    } else {
      // Create new document
      updatedTimeTable = await TimeTable.create({
        classId,
        timeSlots: [timeSlots],
      });
    }
  }

  return updatedTimeTable;
};

// API handlers
export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const { page, limit, filterParams, projections } = extractQueryParams(url);

    const query = {};
    if (filterParams.classId) {
      query.classId = filterParams.classId;
    }

    const timeSlotMatch = {};
    if (filterParams.teacherId) {
      timeSlotMatch.teacherId = filterParams.teacherId;
    }
    if (filterParams.day) {
      timeSlotMatch.day = filterParams.day;
    }

    if (Object.keys(timeSlotMatch).length > 0) {
      query.timeSlots = { $elemMatch: timeSlotMatch };
    }

    // Force a reasonable limit if none provided to prevent massive payload
    const effectiveLimit = limit === 0 ? 100 : limit;

    // Use Promise.all for parallel queries
    const [timeTables, total] = await Promise.all([
      TimeTable.find(query, projections)
        .populate({
          path: "classId",
          select: "name batchId",
          populate: { path: "batchId", select: "name" },
        })
        .populate("timeSlots.subjectId", "name")
        .populate("timeSlots.teacherId", "name")
        .skip(page * limit)
        .limit(limit > 0 ? limit : undefined)
        .sort({ updatedAt: -1 })
        .lean(),
      TimeTable.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        timeTables,
        pagination: {
          page,
          limit,
          total,
          totalPages: limit > 0 ? Math.ceil(total / limit) - 1 : 0,
        },
        message: "TimeTables fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching time tables:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();

    const body = await req.json();

    // Validate request
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { message: "Expected an array of updates" },
        { status: 400 }
      );
    }

    // Limit batch size to prevent timeouts
    const batchSize = Math.min(body.length, MONGODB_MAX_BATCH_SIZE);
    const updateBatch = body.slice(0, batchSize);

    const results = [];
    const conflicts = [];

    // Process each change in the batch sequentially
    for (const item of updateBatch) {
      try {
        // Process the update
        const updatedTimeTable = await processSingleUpdate(item);

        if (updatedTimeTable) {
          // Fetch populated data to return
          const populatedTimeTable = await TimeTable.findById(
            updatedTimeTable._id
          )
            .populate("timeSlots.subjectId", "name")
            .populate("timeSlots.teacherId", "name")
            .lean();

          results.push(populatedTimeTable);
        }
      } catch (error) {
        console.error(`Error processing update for item:`, item, error);
        // Continue with other updates even if one fails
      }
    }

    return NextResponse.json(
      {
        timeTables: results,
        conflicts: conflicts,
        hasConflicts: conflicts.length > 0,
        processedCount: results.length,
        totalCount: body.length,
        isComplete: results.length === body.length,
        message:
          conflicts.length > 0
            ? `Time Tables updated with ${conflicts.length} conflicts detected`
            : "Time Tables updated successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating time table:", error);
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids, resetAll } = await req.json();
    console.log("Delete request:", { ids, resetAll });

    if (resetAll === true) {
      const result = await TimeTable.deleteMany({});
      return NextResponse.json(
        { message: `All ${result.deletedCount} TimeTables cleared successfully!` },
        { status: 200 }
      );
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "Valid IDs or resetAll flag are required" },
        { status: 400 }
      );
    }

    const result = await TimeTable.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "No TimeTables found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: `${result.deletedCount} TimeTables deleted successfully!` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting time tables:", error);
    return apiResponse.error(error);
  }
}
