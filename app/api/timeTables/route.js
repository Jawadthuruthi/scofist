import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import TimeTable from "@/models/TimeTable";
import { NextResponse } from "next/server";

// Constants
const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 10;

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

// Check for teacher schedule conflicts
const checkTeacherScheduleConflicts = async (
  teacherId,
  periodNumber,
  day,
  classId
) => {
  // Find any timetable entries where this teacher is already scheduled
  // for the same day and period but in a different class
  const conflicts = await TimeTable.find({
    timeSlots: {
      $elemMatch: {
        teacherId: teacherId,
        periodNumber: periodNumber,
        day: day,
      },
    },
    classId: { $ne: classId }, // Exclude the current class
  })
    .populate("classId", "name")
    .populate("timeSlots.subjectId", "name")
    .lean();

  // Format conflicts for easier consumption
  const formattedConflicts = conflicts.map((conflict) => {
    const conflictSlot = conflict.timeSlots.find(
      (slot) =>
        slot.teacherId.toString() === teacherId.toString() &&
        slot.periodNumber === periodNumber &&
        slot.day === day
    );

    return {
      classId: conflict.classId._id,
      className: conflict.classId.name,
      subjectId: conflictSlot.subjectId._id,
      subjectName: conflictSlot.subjectId.name,
      day: conflictSlot.day,
      periodNumber: conflictSlot.periodNumber,
    };
  });

  return formattedConflicts;
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

    if (filterParams.teacherId) {
      query.timeSlots = {
        $elemMatch: { teacherId: filterParams.teacherId },
      };
    }

    // Use Promise.all for parallel queries
    const [timeTables, total] = await Promise.all([
      TimeTable.find(query, projections)
        .populate("classId", "name")
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
        message: "TimeTables fetched successfully",
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
    const { _id, classId, timeSlots } = body;

    // Input validation
    if (!classId) {
      return NextResponse.json(
        { message: "Class ID is required" },
        { status: 400 }
      );
    }

    if (
      !timeSlots ||
      !timeSlots.subjectId ||
      !timeSlots.teacherId ||
      !timeSlots.periodNumber ||
      !timeSlots.day
    ) {
      return NextResponse.json(
        { message: "Complete timeSlots data is required" },
        { status: 400 }
      );
    }

    // Check for teacher schedule conflicts
    const conflicts = await checkTeacherScheduleConflicts(
      timeSlots.teacherId,
      timeSlots.periodNumber,
      timeSlots.day,
      classId
    );

    // Return the conflicts to the client if any exist
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          conflicts,
          message: "Teacher schedule conflicts detected",
          hasConflicts: true,
        },
        { status: 409 }
      ); // Using 409 Conflict status code
    }

    const filter = _id ? { _id } : { classId };
    let updatedTimeTable;

    if (_id) {
      // Transaction-like operation: First remove existing slot, then add new one
      const existingTimeTable = await TimeTable.findOne(filter);

      if (!existingTimeTable) {
        return NextResponse.json(
          { message: "Time table not found" },
          { status: 404 }
        );
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

    // Fetch populated data to return
    const populatedTimeTable = await TimeTable.findById(updatedTimeTable._id)
      .populate("timeSlots.subjectId", "name")
      .populate("timeSlots.teacherId", "name")
      .lean();

    return NextResponse.json(
      {
        timeTable: populatedTimeTable,
        message: "Time Table Updated successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating time table:", error);
    return apiResponse.error(error);
  }
}

// Add an endpoint to specifically check for conflicts without making changes
export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { teacherId, periodNumber, day, classId } = body;

    // Input validation
    if (!teacherId || !periodNumber || !day || !classId) {
      return NextResponse.json(
        { message: "teacherId, periodNumber, day, and classId are required" },
        { status: 400 }
      );
    }

    // Check for conflicts
    const conflicts = await checkTeacherScheduleConflicts(
      teacherId,
      periodNumber,
      day,
      classId
    );

    return NextResponse.json(
      {
        conflicts,
        hasConflicts: conflicts.length > 0,
        message:
          conflicts.length > 0
            ? "Teacher schedule conflicts detected"
            : "No conflicts detected",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking for conflicts:", error);
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "Valid IDs are required" },
        { status: 400 }
      );
    }

    let result;
    let message;

    if (ids.length > 1) {
      result = await TimeTable.deleteMany({ _id: { $in: ids } });
      message = `${result.deletedCount} TimeTables deleted successfully`;
    } else {
      const _id = ids[0];
      result = await TimeTable.findByIdAndDelete(_id);

      if (!result) {
        return NextResponse.json(
          { message: "TimeTable not found" },
          { status: 404 }
        );
      }

      message = "TimeTable deleted successfully";
    }

    return NextResponse.json({ result, message }, { status: 200 });
  } catch (error) {
    console.error("Error deleting time tables:", error);
    return apiResponse.error(error);
  }
}
