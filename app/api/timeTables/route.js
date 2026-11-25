import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import TimeTable from "@/models/TimeTable";
import DailyTimetableSnapshot from "@/models/DailyTimetableSnapshot";
import Settings from "@/models/Settings";
import Subject from "@/models/Subject";
import { NextResponse } from "next/server";

// Helper — get YYYY-MM-DD in IST from any date
const getISTDateString = (date = new Date()) => {
  const d = new Date(date);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dy = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dy}`;
};

const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/**
 * Locks today's snapshot BEFORE any timetable mutation.
 *
 * Uses $setOnInsert so it is fully idempotent — if a snapshot already exists
 * for today (e.g., cron already ran, or this is the second edit of the day)
 * the document is never overwritten. Only the very first call per day writes
 * a new snapshot.
 */
const ensureTodaySnapshotExists = async () => {
  try {
    const todayDS  = getISTDateString();
    const todayDay = WEEKDAYS[new Date().getUTCDay()]; // UTC day matches IST weekday for snapshot purposes

    // Use IST weekday for accuracy
    const nowIST   = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
    const dayName  = WEEKDAYS[nowIST.getUTCDay()];

    // Check if snapshot already exists — skip the expensive read if so
    const exists = await DailyTimetableSnapshot.countDocuments({ dateString: todayDS });
    if (exists > 0) return; // Already locked — nothing to do

    // Check non-working day via Settings
    const settings = await Settings.findOne({}).lean();
    const nonWorkingSet = new Set(
      (settings?.general?.nonWorkingDays || []).map(getISTDateString)
    );
    const isNonWorking =
      !settings?.general?.isWorkingDay || nonWorkingSet.has(todayDS);

    const [istY, istM, istD] = todayDS.split("-").map(Number);
    const todayUTCMidnight   = new Date(Date.UTC(istY, istM - 1, istD));

    if (isNonWorking) {
      // Permanently mark as a non-working day with empty slots
      await DailyTimetableSnapshot.updateOne(
        { dateString: todayDS },
        { $setOnInsert: { date: todayUTCMidnight, dateString: todayDS, isWorkingDay: false, slots: [] } },
        { upsert: true }
      );
      return;
    }

    // Build today's active slots from the live timetable
    const timeTables = await TimeTable.find({}).lean();
    const slots = [];

    timeTables.forEach((tt) => {
      (tt.timeSlots || []).forEach((slot) => {
        if (slot.day !== dayName) return;
        if (!slot.teacherId && !slot.subjectId) return; // skip empty/reset slots

        const validFromDS = slot.validFrom ? getISTDateString(slot.validFrom) : null;
        const vtDS = slot.validTo  ? getISTDateString(slot.validTo)  : null;

        const isStarted  = !validFromDS || validFromDS <= todayDS;
        const isNotEnded = !vtDS || vtDS >  todayDS;

        if (isStarted && isNotEnded) {
          slots.push({
            classId:      String(tt.classId),
            teacherId:    slot.teacherId ? String(slot.teacherId) : undefined,
            subjectId:    slot.subjectId ? String(slot.subjectId) : undefined,
            periodNumber: slot.periodNumber,
            day:          dayName,
          });
        }
      });
    });

    // $setOnInsert guarantees this never overwrites an existing snapshot
    await DailyTimetableSnapshot.updateOne(
      { dateString: todayDS },
      { $setOnInsert: { date: todayUTCMidnight, dateString: todayDS, isWorkingDay: true, slots } },
      { upsert: true }
    );
  } catch (err) {
    // Non-fatal — log and continue so the timetable update itself isn't blocked
    console.error("[ensureTodaySnapshotExists] Failed to lock today's snapshot:", err.message);
  }
};


// Constants
const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 10;
const MONGODB_MAX_BATCH_SIZE = 500; // MongoDB has limits on transaction size

// Helper functions
const extractQueryParams = (url) => {
  const page = parseInt(
    url.searchParams.get("page") || DEFAULT_PAGE.toString()
  );
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === "0" ? Infinity : (parseInt(limitParam) || DEFAULT_LIMIT);
    
  // Convert to number for DB operations
  const dbLimit = limit === Infinity ? 0 : limit;

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
  const { classId, timeSlots } = item;

  // Input validation
  if (!classId) {
    throw new Error("Class ID is required");
  }

  // Always find by classId to avoid stale _id issues (e.g., after a reset)
  // Each class should have exactly one TimeTable document
  const existingTimeTable = await TimeTable.findOne({ classId });
  let updatedTimeTable;

  if (existingTimeTable) {
    const now = new Date();
    // Instead of deleting the old slot, we set its validTo to now
    let slotUpdated = false;
    
    // Find the currently active slot for this period and day
    const activeOldSlotIndex = existingTimeTable.timeSlots.findIndex(
      (slot) =>
        slot.day === timeSlots.day &&
        slot.periodNumber === timeSlots.periodNumber &&
        !slot.validTo // Ensure we only invalidate the currently active one
    );

    if (activeOldSlotIndex !== -1) {
      // If the subject or teacher didn't change, we shouldn't create a new record
      const oldSlot = existingTimeTable.timeSlots[activeOldSlotIndex];
      const sameSubject = (oldSlot.subjectId?.toString() || "") === (timeSlots.subjectId?.toString() || "");
      const sameTeacher = (oldSlot.teacherId?.toString() || "") === (timeSlots.teacherId?.toString() || "");
      
      if (sameSubject && sameTeacher) {
        return existingTimeTable; // No changes needed
      }
      
      // Invalidate old slot
      existingTimeTable.timeSlots[activeOldSlotIndex].validTo = now;
      slotUpdated = true;
    }

    // Add new slot with validFrom
    existingTimeTable.timeSlots.push({
      ...timeSlots,
      validFrom: now,
    });
    
    updatedTimeTable = await existingTimeTable.save();
  } else {
    // Create new document for this class
    updatedTimeTable = await TimeTable.create({
      classId,
      timeSlots: [{
        ...timeSlots,
        validFrom: new Date(),
      }],
    });
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

    const filterSlots = filterParams.filterSlots === "true";

    // Force a reasonable limit if none provided to prevent massive payload
    const dbLimit = limit === Infinity ? 0 : limit;
    const needsCount = page > 0 || limit !== Infinity;

    let findQuery = TimeTable.find(query, projections).populate({
      path: "classId",
      select: "name shortname batchId section",
      populate: { path: "batchId", select: "name" },
    });

    if (!filterSlots) {
      findQuery = findQuery
        .populate("timeSlots.subjectId", "name")
        .populate("timeSlots.teacherId", "name");
    }

    findQuery = findQuery
      .skip(limit === Infinity ? 0 : page * limit)
      .limit(dbLimit)
      .sort({ updatedAt: -1 })
      .lean();

    // Use Promise.all for parallel queries
    const [rawTimeTables, countedTotal] = await Promise.all([
      findQuery,
      needsCount ? TimeTable.countDocuments(query) : Promise.resolve(null),
    ]);

    let timeTables = rawTimeTables;
    if (filterSlots) {
      timeTables = rawTimeTables
        .map((tt) => {
          const slots = (tt.timeSlots || []).filter((slot) => {
            if (filterParams.teacherId && String(slot.teacherId) !== filterParams.teacherId) {
              return false;
            }
            if (filterParams.day && slot.day !== filterParams.day) {
              return false;
            }
            return true;
          });
          return { ...tt, timeSlots: slots };
        })
        .filter((tt) => tt.timeSlots.length > 0);

      const subjectIds = Array.from(
        new Set(
          timeTables.flatMap((tt) =>
            tt.timeSlots
              .map((s) => (s.subjectId ? String(s.subjectId) : ""))
              .filter(Boolean)
          )
        )
      );
      if (subjectIds.length > 0) {
        const subjectsList = await Subject.find({ _id: { $in: subjectIds } })
          .select("name")
          .lean();
        const subjectMap = new Map(subjectsList.map((s) => [String(s._id), s]));
        timeTables.forEach((tt) => {
          tt.timeSlots.forEach((s) => {
            if (s.subjectId) {
              const matched = subjectMap.get(String(s.subjectId));
              if (matched) s.subjectId = matched;
            }
          });
        });
      }
    }

    const total = countedTotal ?? timeTables.length;

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

    // Lock today's timetable as an immutable snapshot BEFORE applying any change.
    // Uses $setOnInsert so subsequent edits on the same day never overwrite it.
    await ensureTodaySnapshotExists();

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
