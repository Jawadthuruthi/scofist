import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Period from "@/models/Period";
import Settings from "@/models/Settings";
import { resolvePeriodsPayload } from "@/lib/periods";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit"), 10) || Infinity;

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit") {
        filterParams[key] = value;
      }
    }

    const baseQuery = {};
    if (filterParams.periodNumber) {
      baseQuery.periodNumber = parseInt(filterParams.periodNumber, 10);
    }

    // Fetch minimal settings fields and periods in a single parallel round-trip
    const [settings, allPeriods] = await Promise.all([
      Settings.findOne()
        .select(
          "general.schedules general.activeSchedule general.isSpecialDay general.autoThursdaySchedule"
        )
        .lean(),
      Period.find(baseQuery).sort({ periodNumber: 1 }).limit(500).lean(),
    ]);

    const payload = resolvePeriodsPayload({
      settings,
      allPeriods,
      scheduleParam: filterParams.schedule,
      isSpecialDayParam: filterParams.isSpecialDay,
      dateParam: filterParams.date,
      page,
      limit,
    });

    return NextResponse.json(
      {
        ...payload,
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
      }).lean();

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
