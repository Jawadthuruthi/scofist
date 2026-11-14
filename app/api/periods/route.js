import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Period from "@/models/Period";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDB();

    // Auto-migrate legacy periods missing the schedule field
    await Period.updateMany(
      { isSpecialDay: true, $or: [{ schedule: { $exists: false } }, { schedule: null }] },
      { $set: { schedule: "thursday" } }
    );
    await Period.updateMany(
      { isSpecialDay: { $ne: true }, $or: [{ schedule: { $exists: false } }, { schedule: null }] },
      { $set: { schedule: "normal" } }
    );

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit") {
        filterParams[key] = value;
      }
    }

    const query = {};

    if (filterParams.periodNumber) {
      query.periodNumber = parseInt(filterParams.periodNumber);
    }

    // Determine settings & active schedule
    const settings = await Settings.findOne().lean();

    const savedSchedules = settings?.general?.schedules || [];
    const defaultSchedules = [
      { id: "normal", name: "Normal Schedule", isDefault: true },
      { id: "thursday", name: "Thursday Schedule", isDefault: true },
    ];
    const schedulesMap = new Map();
    defaultSchedules.forEach((s) => schedulesMap.set(s.id, s));
    savedSchedules.forEach((s) => {
      schedulesMap.set(s.id, {
        id: s.id,
        name: s.name,
        description: s.description,
        isDefault: Boolean(s.isDefault),
      });
    });
    const allSchedules = Array.from(schedulesMap.values());

    let activeScheduleId = settings?.general?.activeSchedule;
    if (!activeScheduleId) {
      activeScheduleId = settings?.general?.isSpecialDay ? "thursday" : "normal";
    }

    // Auto-Thursday Schedule Check: if enabled, Thursday Schedule is active for all Thursdays
    const autoThursday = Boolean(settings?.general?.autoThursdaySchedule);
    let isTargetThursday = false;
    if (filterParams.date) {
      const parts = String(filterParams.date).split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        isTargetThursday = d.getDay() === 4;
      }
    } else {
      const now = new Date();
      const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      isTargetThursday = istNow.getUTCDay() === 4;
    }

    if (autoThursday && isTargetThursday) {
      activeScheduleId = "thursday";
    }

    const activeScheduleObj =
      allSchedules.find((s) => s.id === activeScheduleId) || allSchedules[0];

    const scheduleParam = filterParams.schedule;
    const isSpecialDayParam = filterParams.isSpecialDay;

    if (scheduleParam) {
      if (scheduleParam === "all") {
        // Query both without filter
      } else if (scheduleParam === "normal") {
        query.$or = [
          { schedule: "normal" },
          { schedule: { $exists: false }, isSpecialDay: { $ne: true } },
        ];
      } else if (scheduleParam === "thursday") {
        query.$or = [
          { schedule: "thursday" },
          { schedule: { $exists: false }, isSpecialDay: true },
        ];
      } else {
        query.schedule = scheduleParam;
      }
    } else if (isSpecialDayParam !== undefined) {
      if (isSpecialDayParam === "true" || isSpecialDayParam === true) {
        query.$or = [
          { isSpecialDay: true },
          { schedule: { $ne: "normal" } },
        ];
      } else if (isSpecialDayParam === "false" || isSpecialDayParam === false) {
        query.$or = [
          { schedule: "normal" },
          { schedule: { $exists: false }, isSpecialDay: { $ne: true } },
        ];
      } else if (isSpecialDayParam === "all") {
        // Query all without filter
      }
    } else {
      // Default behavior (e.g., when called from dashboard or my-periods without explicit param):
      // Return periods for the currently active schedule
      const activeFilter = {
        $or: [
          { schedule: activeScheduleId },
          ...(activeScheduleId === "normal"
            ? [{ schedule: { $exists: false }, isSpecialDay: { $ne: true } }]
            : activeScheduleId === "thursday"
            ? [{ schedule: { $exists: false }, isSpecialDay: true }]
            : []),
        ],
      };

      const activeCount = await Period.countDocuments({
        ...activeFilter,
        ...(query.periodNumber ? { periodNumber: query.periodNumber } : {}),
      });

      if (activeCount > 0) {
        Object.assign(query, activeFilter);
      } else {
        // If no periods configured for this active schedule yet, fallback to normal periods
        query.$or = [
          { schedule: "normal" },
          { schedule: { $exists: false }, isSpecialDay: { $ne: true } },
        ];
      }
    }

    const [periods, total] = await Promise.all([
      Period.find(query)
        .skip(page * limit)
        .limit(limit)
        .sort({ periodNumber: 1 })
        .lean(),
      Period.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        periods,
        schedules: allSchedules,
        activeSchedule: activeScheduleId,
        activeScheduleName: activeScheduleObj?.name || "Normal Schedule",
        isSpecialDayActive: activeScheduleId !== "normal",
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Periods fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    await connectToDB();

    const { periodNumber, startTime, endTime, isSpecialDay, schedule } = await req.json();
    const effectiveSchedule = schedule || (isSpecialDay ? "thursday" : "normal");

    const newPeriod = await Period.create({
      periodNumber: parseInt(periodNumber),
      startTime,
      endTime,
      schedule: effectiveSchedule,
      isSpecialDay: effectiveSchedule !== "normal",
    });

    return NextResponse.json(
      { newPeriod, message: "Period created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();

    const body = await req.json();

    // Batch save/sync periods for a specific schedule
    if (body.schedule && Array.isArray(body.periods)) {
      const scheduleId = body.schedule;
      const periodsData = body.periods;

      // Validate each period
      for (const p of periodsData) {
        if (!p.periodNumber || !p.startTime || !p.endTime) {
          return NextResponse.json(
            { message: "Each period must have periodNumber, startTime, and endTime" },
            { status: 400 }
          );
        }

        const sDate = new Date(`2000-01-01T${p.startTime}`);
        const eDate = new Date(`2000-01-01T${p.endTime}`);
        if (sDate >= eDate) {
          return NextResponse.json(
            { message: `Period ${p.periodNumber}: Start time must be before end time` },
            { status: 400 }
          );
        }
      }

      // Check for duplicate period numbers
      const periodNumbers = periodsData.map((p) => parseInt(p.periodNumber, 10));
      const hasDuplicates = new Set(periodNumbers).size !== periodNumbers.length;
      if (hasDuplicates) {
        return NextResponse.json(
          { message: "Duplicate period numbers are not allowed" },
          { status: 400 }
        );
      }

      // Check for overlapping periods within the schedule
      const sortedPeriods = [...periodsData].sort(
        (a, b) => parseInt(a.periodNumber, 10) - parseInt(b.periodNumber, 10)
      );
      for (let i = 1; i < sortedPeriods.length; i++) {
        const prev = sortedPeriods[i - 1];
        const curr = sortedPeriods[i];
        const prevEnd = new Date(`2000-01-01T${prev.endTime}`);
        const currStart = new Date(`2000-01-01T${curr.startTime}`);
        if (currStart < prevEnd) {
          return NextResponse.json(
            {
              message: `Period ${curr.periodNumber} cannot start before Period ${prev.periodNumber} ends (${prev.endTime})`,
            },
            { status: 400 }
          );
        }
      }

      const scheduleFilter = {
        $or: [
          { schedule: scheduleId },
          ...(scheduleId === "normal"
            ? [{ schedule: { $exists: false }, isSpecialDay: { $ne: true } }]
            : scheduleId === "thursday"
            ? [{ schedule: { $exists: false }, isSpecialDay: true }]
            : []),
        ],
      };

      await Period.deleteMany(scheduleFilter);

      if (sortedPeriods.length > 0) {
        const docs = sortedPeriods.map((p) => ({
          periodNumber: parseInt(p.periodNumber, 10),
          startTime: p.startTime,
          endTime: p.endTime,
          schedule: scheduleId,
          isSpecialDay: scheduleId !== "normal",
        }));
        await Period.insertMany(docs);
      }

      const updatedPeriods = await Period.find(scheduleFilter).sort({
        periodNumber: 1,
      });

      return NextResponse.json(
        {
          periods: updatedPeriods,
          message: `Periods for schedule "${scheduleId}" saved successfully!`,
        },
        { status: 200 }
      );
    }

    const { ids, periodNumber, startTime, endTime, isSpecialDay, schedule } = body;

    const _id = ids ? ids[0] : body._id;

    const updateData = {};
    if (periodNumber !== undefined) updateData.periodNumber = parseInt(periodNumber);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (schedule !== undefined) {
      updateData.schedule = schedule;
      updateData.isSpecialDay = schedule !== "normal";
    } else if (isSpecialDay !== undefined) {
      updateData.isSpecialDay = Boolean(isSpecialDay);
      updateData.schedule = updateData.isSpecialDay ? "thursday" : "normal";
    }

    if (ids && ids.length > 1) {
      const updatedPeriods = await Period.updateMany(
        { _id: { $in: ids } },
        { $set: updateData }
      );
      return NextResponse.json(
        { updatedPeriods, message: "Periods Updated successfully!" },
        { status: 200 }
      );
    }

    const existingDoc = await Period.findById(_id);
    if (!existingDoc) {
      return NextResponse.json({ message: "Period not found" }, { status: 404 });
    }

    Object.assign(existingDoc, updateData);
    await existingDoc.save();

    return NextResponse.json(
      { updatedPeriod: existingDoc, message: "Period Updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids ? ids[0] : null;

    if (ids && ids.length > 1) {
      const deletedPeriods = await Period.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedPeriods, message: "Periods deleted successfully!" },
        { status: 200 }
      );
    }

    const deletedPeriod = await Period.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedPeriod, message: "Period deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
