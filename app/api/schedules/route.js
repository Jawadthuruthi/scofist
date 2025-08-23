import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Schedule from "@/models/Schedule";
import Program from "@/models/Program";

// Helper function to format time for display (12-hour format)
const formatTimeForDisplay = (time24) => {
  const [hours, minutes] = time24.split(":");
  const hour12 = ((parseInt(hours) + 11) % 12) + 1;
  const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper function to validate business hours (optional - uncomment if needed)
const validateBusinessHours = (startTime, endTime) => {
  const start = parseInt(startTime.split(":")[0]);
  const end = parseInt(endTime.split(":")[0]);

  // Business hours: 6 AM to 10 PM (22:00)
  if (start < 6 || start > 22 || end < 6 || end > 22) {
    return {
      valid: false,
      message:
        "Schedule times must be between 6:00 AM (06:00) and 10:00 PM (22:00)",
    };
  }

  return { valid: true };
};

// Helper function to add minutes to time
const addMinutes = (timeStr, minutes) => {
  const [hours, mins] = timeStr.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;
};

// Helper function to subtract minutes from time
const subtractMinutes = (timeStr, minutes) => {
  const [hours, mins] = timeStr.split(":").map(Number);
  const totalMinutes = hours * 60 + mins - minutes;

  if (totalMinutes < 0) {
    return "00:00";
  }

  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;
};

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
    if (filterParams.programId) {
      query.programId = filterParams.programId;
    }
    if (filterParams.date) {
      const filterDate = new Date(filterParams.date);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.date = {
        $gte: filterDate,
        $lt: nextDay,
      };
    }
    if (filterParams.dateRange) {
      const [startDate, endDate] = filterParams.dateRange.split(",");
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (filterParams.stageNumber) {
      query.stageNumber = parseInt(filterParams.stageNumber);
    }
    if (filterParams.isPublished !== undefined) {
      query.isPublished = filterParams.isPublished === "true";
    }

    // Execute query with pagination
    const schedules = await Schedule.find(query, projections)
      .populate("programId", ["_id", "name", "type", "category", "divisionId"])
      .populate({
        path: "programId",
        populate: {
          path: "divisionId",
          select: "_id name",
        },
      })
      .skip(page * limit)
      .limit(limit)
      .sort({ date: 1, startTime: 1, stageNumber: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

    // Get total count for pagination info
    const total = await Schedule.countDocuments(query);

    const formattedSchedules = schedules.map((schedule) => ({
      ...schedule.toObject(),
      programId: schedule.programId?._id || "Unknown",
      programName: schedule.programId?.name || "Unknown Program",
      programType: schedule.programId?.type || "Unknown",
      programCategory: schedule.programId?.category || "Unknown",
      divisionName: schedule.programId?.divisionId?.name || "Unknown",
      divisionId: schedule.programId?.divisionId?._id || "Unknown",
      dateFormatted: schedule.date.toLocaleDateString(),
      timeRange: `${formatTimeForDisplay(schedule.startTime)} - ${formatTimeForDisplay(schedule.endTime)}`,
    }));

    return NextResponse.json(
      {
        schedules: formattedSchedules,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Schedules fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    // Validate required fields
    const requiredFields = [
      "programId",
      "date",
      "startTime",
      "endTime",
      "stageNumber",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate program exists
    const program = await Program.findById(data.programId);
    if (!program) {
      return NextResponse.json(
        { message: "Program not found" },
        { status: 404 }
      );
    }

    // Validate date is not in the past
    const scheduleDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduleDate < today) {
      return NextResponse.json(
        { message: "Cannot schedule events in the past" },
        { status: 400 }
      );
    }

    // Enhanced time format validation for 24-hour format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
      return NextResponse.json(
        { message: "Invalid time format. Use 24-hour format (HH:MM)" },
        { status: 400 }
      );
    }

    // Optional: Validate business hours (uncomment if needed)
    // const businessHoursCheck = validateBusinessHours(data.startTime, data.endTime);
    // if (!businessHoursCheck.valid) {
    //   return NextResponse.json(
    //     { message: businessHoursCheck.message },
    //     { status: 400 }
    //   );
    // }

    // Validate start time is before end time
    const startTime = new Date(`2000-01-01T${data.startTime}:00`);
    const endTime = new Date(`2000-01-01T${data.endTime}:00`);

    if (startTime >= endTime) {
      return NextResponse.json(
        { message: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Validate stage number
    if (data.stageNumber < 1) {
      return NextResponse.json(
        { message: "Stage number must be at least 1" },
        { status: 400 }
      );
    }

    // Check for time conflicts on the same stage and date
    const conflictingSchedule = await Schedule.findOne({
      date: scheduleDate,
      stageNumber: data.stageNumber,
      _id: { $ne: data._id }, // Exclude current schedule if updating
      $or: [
        {
          $and: [
            { startTime: { $lte: data.startTime } },
            { endTime: { $gt: data.startTime } },
          ],
        },
        {
          $and: [
            { startTime: { $lt: data.endTime } },
            { endTime: { $gte: data.endTime } },
          ],
        },
        {
          $and: [
            { startTime: { $gte: data.startTime } },
            { endTime: { $lte: data.endTime } },
          ],
        },
      ],
    }).populate("programId", "name");

    if (conflictingSchedule) {
      return NextResponse.json(
        {
          message: `Time conflict with "${conflictingSchedule.programId.name}" on Stage ${data.stageNumber} from ${formatTimeForDisplay(conflictingSchedule.startTime)} to ${formatTimeForDisplay(conflictingSchedule.endTime)}`,
        },
        { status: 409 }
      );
    }

    // Create new schedule
    const schedule = await Schedule.create({
      ...data,
      date: scheduleDate,
      isPublished: data.isPublished === "true",
    });

    // Populate the created schedule for response
    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate("programId", "name type category divisionId")
      .populate({
        path: "programId",
        populate: {
          path: "divisionId",
          select: "name",
        },
      });

    return NextResponse.json(
      {
        message: "Schedule created successfully!",
        schedule: populatedSchedule,
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

    const scheduleId = ids[0];
    const updateData = { ...data, isPublished: data.isPublished === "true" };
    delete updateData.ids;

    // Validate program exists if programId is being updated
    if (updateData.programId) {
      const program = await Program.findById(updateData.programId);
      if (!program) {
        return NextResponse.json(
          { message: "Program not found" },
          { status: 404 }
        );
      }
    }

    // Validate date is not in the past if date is being updated
    if (updateData.date) {
      const scheduleDate = new Date(updateData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (scheduleDate < today) {
        return NextResponse.json(
          { message: "Cannot schedule events in the past" },
          { status: 400 }
        );
      }
      updateData.date = scheduleDate;
    }

    // Enhanced time format validation for 24-hour format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (updateData.startTime && !timeRegex.test(updateData.startTime)) {
      return NextResponse.json(
        { message: "Invalid start time format. Use 24-hour format (HH:MM)" },
        { status: 400 }
      );
    }
    if (updateData.endTime && !timeRegex.test(updateData.endTime)) {
      return NextResponse.json(
        { message: "Invalid end time format. Use 24-hour format (HH:MM)" },
        { status: 400 }
      );
    }

    // Get current schedule for validation
    const currentSchedule = await Schedule.findById(scheduleId);
    if (!currentSchedule) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    // Prepare final values for validation
    const finalStartTime = updateData.startTime || currentSchedule.startTime;
    const finalEndTime = updateData.endTime || currentSchedule.endTime;
    const finalDate = updateData.date || currentSchedule.date;
    const finalStageNumber =
      updateData.stageNumber || currentSchedule.stageNumber;

    // Optional: Validate business hours (uncomment if needed)
    // const businessHoursCheck = validateBusinessHours(finalStartTime, finalEndTime);
    // if (!businessHoursCheck.valid) {
    //   return NextResponse.json(
    //     { message: businessHoursCheck.message },
    //     { status: 400 }
    //   );
    // }

    // Validate start time is before end time
    const startTime = new Date(`2000-01-01T${finalStartTime}:00`);
    const endTime = new Date(`2000-01-01T${finalEndTime}:00`);

    if (startTime >= endTime) {
      return NextResponse.json(
        { message: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Validate stage number
    if (finalStageNumber < 1) {
      return NextResponse.json(
        { message: "Stage number must be at least 1" },
        { status: 400 }
      );
    }

    // Check for time conflicts on the same stage and date
    const conflictingSchedule = await Schedule.findOne({
      date: finalDate,
      stageNumber: finalStageNumber,
      _id: { $ne: scheduleId },
      $or: [
        {
          $and: [
            { startTime: { $lte: finalStartTime } },
            { endTime: { $gt: finalStartTime } },
          ],
        },
        {
          $and: [
            { startTime: { $lt: finalEndTime } },
            { endTime: { $gte: finalEndTime } },
          ],
        },
        {
          $and: [
            { startTime: { $gte: finalStartTime } },
            { endTime: { $lte: finalEndTime } },
          ],
        },
      ],
    }).populate("programId", "name");

    if (conflictingSchedule) {
      return NextResponse.json(
        {
          message: `Time conflict with "${conflictingSchedule.programId.name}" on Stage ${finalStageNumber} from ${formatTimeForDisplay(conflictingSchedule.startTime)} to ${formatTimeForDisplay(conflictingSchedule.endTime)}`,
        },
        { status: 409 }
      );
    }

    if (ids.length > 1) {
      await Schedule.updateMany({ _id: { $in: ids } }, { $set: updateData });
    }

    const schedule = await Schedule.findOneAndUpdate(
      { _id: scheduleId },
      { $set: updateData },
      { new: true }
    )
      .populate("programId", "name type category divisionId")
      .populate({
        path: "programId",
        populate: {
          path: "divisionId",
          select: "name",
        },
      });

    if (!schedule) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Schedule updated successfully!", schedule },
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

    // Check if any schedules are published
    const publishedSchedules = await Schedule.find({
      _id: { $in: ids },
      isPublished: true,
    }).populate("programId", "name");

    if (publishedSchedules.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete published schedules: ${publishedSchedules.map((s) => s.programId.name).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const deletedSchedules = await Schedule.deleteMany({ _id: { $in: ids } });

    if (deletedSchedules.deletedCount === 0) {
      return NextResponse.json(
        { message: "No schedules found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `${deletedSchedules.deletedCount} schedule(s) deleted successfully!`,
        deletedSchedules,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
