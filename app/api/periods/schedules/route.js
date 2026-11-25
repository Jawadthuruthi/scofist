import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Period from "@/models/Period";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

const DEFAULT_SCHEDULES = [
  { id: "normal", name: "Normal Schedule", isDefault: true },
  { id: "thursday", name: "Thursday Schedule", isDefault: true },
];

function getMergedSchedules(settings) {
  const savedSchedules = settings?.general?.schedules || [];
  const map = new Map();
  DEFAULT_SCHEDULES.forEach((s) => map.set(s.id, s));
  savedSchedules.forEach((s) => {
    map.set(s.id, {
      id: s.id,
      name: s.name,
      description: s.description,
      isDefault: Boolean(s.isDefault),
    });
  });
  return Array.from(map.values());
}

export async function GET() {
  try {
    await connectToDB();

    const settings = await Settings.findOne().lean();
    const schedules = getMergedSchedules(settings);

    let activeSchedule = settings?.general?.activeSchedule;
    if (!activeSchedule) {
      activeSchedule = settings?.general?.isSpecialDay ? "thursday" : "normal";
    }

    const activeObj = schedules.find((s) => s.id === activeSchedule) || schedules[0];

    // Compute period counts for each schedule in parallel (one Promise per schedule)
    const countResults = await Promise.all(
      schedules.map((s) =>
        Period.countDocuments({
          $or: [
            { schedule: s.id },
            ...(s.id === "normal"
              ? [{ schedule: { $exists: false }, isSpecialDay: { $ne: true } }]
              : s.id === "thursday"
                ? [{ schedule: { $exists: false }, isSpecialDay: true }]
                : []),
          ],
        })
      )
    );
    const periodCounts = {};
    schedules.forEach((s, i) => {
      periodCounts[s.id] = countResults[i];
    });

    return NextResponse.json(
      {
        schedules: schedules.map((s) => ({
          ...s,
          periodsCount: periodCounts[s.id] || 0,
        })),
        activeSchedule,
        activeScheduleName: activeObj?.name || "Normal Schedule",
        isSpecialDayActive: activeSchedule !== "normal",
        autoThursdaySchedule: Boolean(settings?.general?.autoThursdaySchedule),
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

    const { name, copyFromScheduleId } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { message: "Schedule name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const settings = await Settings.findOne();
    if (!settings) {
      return NextResponse.json(
        { message: "Settings not found" },
        { status: 404 }
      );
    }

    if (!settings.general) {
      settings.general = {};
    }
    if (!settings.general.schedules || settings.general.schedules.length === 0) {
      settings.general.schedules = [...DEFAULT_SCHEDULES];
    }

    const existingSchedules = getMergedSchedules(settings);

    // Check for duplicate name (case-insensitive)
    const duplicate = existingSchedules.find(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { message: `A schedule named "${trimmedName}" already exists` },
        { status: 400 }
      );
    }

    // Generate unique ID / slug
    let baseSlug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!baseSlug) baseSlug = `schedule-${Date.now()}`;

    let uniqueId = baseSlug;
    let counter = 1;
    while (existingSchedules.some((s) => s.id === uniqueId)) {
      uniqueId = `${baseSlug}-${counter++}`;
    }

    const newSchedule = {
      id: uniqueId,
      name: trimmedName,
      isDefault: false,
      createdAt: new Date(),
    };

    settings.general.schedules.push(newSchedule);
    await settings.save();

    // If copyFromScheduleId is provided, clone periods from that schedule
    if (copyFromScheduleId) {
      const sourceFilter = {
        $or: [
          { schedule: copyFromScheduleId },
          ...(copyFromScheduleId === "normal"
            ? [{ schedule: { $exists: false }, isSpecialDay: { $ne: true } }]
            : copyFromScheduleId === "thursday"
              ? [{ schedule: { $exists: false }, isSpecialDay: true }]
              : []),
        ],
      };

      const sourcePeriods = await Period.find(sourceFilter).sort({ periodNumber: 1 });

      if (sourcePeriods.length > 0) {
        const clonedPeriods = sourcePeriods.map((p) => ({
          periodNumber: p.periodNumber,
          startTime: p.startTime,
          endTime: p.endTime,
          schedule: uniqueId,
          isSpecialDay: true,
        }));
        await Period.insertMany(clonedPeriods);
      }
    }

    const updatedSchedules = getMergedSchedules(settings);

    return NextResponse.json(
      {
        message: `Schedule "${trimmedName}" created successfully!`,
        schedule: newSchedule,
        schedules: updatedSchedules,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { activeSchedule, id, name } = body;

    const settings = await Settings.findOne();
    if (!settings) {
      return NextResponse.json(
        { message: "Settings not found" },
        { status: 404 }
      );
    }

    if (!settings.general) {
      settings.general = {};
    }
    if (!settings.general.schedules || settings.general.schedules.length === 0) {
      settings.general.schedules = [...DEFAULT_SCHEDULES];
    }

    const schedules = getMergedSchedules(settings);

    // Toggle auto Thursday schedule
    if (body.autoThursdaySchedule !== undefined) {
      settings.general.autoThursdaySchedule = Boolean(body.autoThursdaySchedule);
      await settings.save();

      return NextResponse.json(
        {
          message: `Thursday Schedule auto-activation is ${settings.general.autoThursdaySchedule ? "ON" : "OFF"}`,
          autoThursdaySchedule: settings.general.autoThursdaySchedule,
        },
        { status: 200 }
      );
    }

    // 1. Changing active schedule
    if (activeSchedule !== undefined) {
      const targetSchedule = schedules.find((s) => s.id === activeSchedule);
      if (!targetSchedule) {
        return NextResponse.json(
          { message: `Schedule "${activeSchedule}" does not exist` },
          { status: 400 }
        );
      }

      settings.general.activeSchedule = activeSchedule;
      settings.general.isSpecialDay = activeSchedule !== "normal";
      await settings.save();

      return NextResponse.json(
        {
          message: `Active schedule set to "${targetSchedule.name}"`,
          activeSchedule,
          activeScheduleName: targetSchedule.name,
          isSpecialDayActive: activeSchedule !== "normal",
        },
        { status: 200 }
      );
    }

    // 2. Renaming a custom schedule
    if (id && name) {
      if (id === "normal" || id === "thursday") {
        return NextResponse.json(
          { message: "Cannot rename default schedules" },
          { status: 400 }
        );
      }

      const scheduleEntry = settings.general.schedules.find((s) => s.id === id);
      if (!scheduleEntry) {
        return NextResponse.json(
          { message: "Schedule not found" },
          { status: 404 }
        );
      }

      scheduleEntry.name = name.trim();
      await settings.save();

      return NextResponse.json(
        {
          message: "Schedule renamed successfully",
          schedule: scheduleEntry,
          schedules: getMergedSchedules(settings),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Invalid update payload" },
      { status: 400 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Schedule id is required" },
        { status: 400 }
      );
    }

    if (id === "normal") {
      return NextResponse.json(
        { message: "Cannot delete Normal Schedule" },
        { status: 400 }
      );
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return NextResponse.json(
        { message: "Settings not found" },
        { status: 404 }
      );
    }

    // Remove periods belonging to this schedule
    await Period.deleteMany({ schedule: id });

    // Remove from settings schedules
    if (settings.general?.schedules) {
      settings.general.schedules = settings.general.schedules.filter(
        (s) => s.id !== id
      );
    }

    // If the active schedule was the deleted one, fallback to normal schedule
    if (settings.general?.activeSchedule === id) {
      settings.general.activeSchedule = "normal";
      settings.general.isSpecialDay = false;
    }

    await settings.save();

    return NextResponse.json(
      {
        message: "Schedule and its configured periods deleted successfully",
        schedules: getMergedSchedules(settings),
        activeSchedule: settings.general?.activeSchedule || "normal",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

