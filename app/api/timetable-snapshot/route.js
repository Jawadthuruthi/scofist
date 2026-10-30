import connectToDB from "@/lib/db";
import DailyTimetableSnapshot from "@/models/DailyTimetableSnapshot";
import TimeTable from "@/models/TimeTable";
import Settings from "@/models/Settings";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import User from "@/models/User";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper to get consistent YYYY-MM-DD from any Date source using IST Time
const getDS = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Era 1 stable baseline dates (pre-Oct 24, 2026) for each weekday
const ERA1_BASELINE_DATES = {
  Saturday: "2026-10-10",
  Sunday: "2026-10-04",
  Monday: "2026-10-05",
  Tuesday: "2026-10-06",
  Wednesday: "2026-10-07",
  Thursday: "2026-10-08",
};

/**
 * GET /api/timetable-snapshot?date=YYYY-MM-DD&populate=true
 *
 * Returns the stored timetable snapshot for a given date.
 * If no snapshot exists (date not yet covered), returns { snapshot: null }
 * so the frontend can fall back to the live validFrom/validTo timetable.
 */
export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // "YYYY-MM-DD"
    const shouldPopulate = searchParams.get("populate") === "true";

    if (!date) {
      return NextResponse.json({ error: "date param required" }, { status: 400 });
    }

    const applyPopulate = (q) => {
      if (!shouldPopulate) return q;
      return q
        .populate({
          path: "slots.classId",
          select: "name shortname batchId section",
          populate: { path: "batchId", select: "name" },
        })
        .populate("slots.subjectId", "name")
        .populate("slots.teacherId", "name");
    };

    let snapshot = await applyPopulate(
      DailyTimetableSnapshot.findOne({ dateString: date })
    ).lean();

    // If no snapshot exists OR snapshot has empty/truncated slots (<20 slots) on a working day in the past,
    // auto-reconstruct it so past dates always have full periods and never mix with current timetable!
    const isInvalidOrEmptyWorkingSnapshot =
      snapshot &&
      snapshot.isWorkingDay !== false &&
      (!snapshot.slots || snapshot.slots.length < 20);

    if (!snapshot || isInvalidOrEmptyWorkingSnapshot) {
      const todayDS = getDS(new Date());
      if (date < todayDS) {
        const [y, m, d] = date.split("-").map(Number);
        const dateUTC = new Date(Date.UTC(y, m - 1, d));
        // Derive weekday from the date string reliably
        const dayName = WEEKDAYS[dateUTC.getUTCDay()];

        const settings = await Settings.findOne({}).lean();
        const nonWorkingSet = new Set(
          (settings?.general?.nonWorkingDays || []).map((dt) => getDS(dt))
        );
        const isNonWorking = dayName === "Friday" || nonWorkingSet.has(date);

        if (isNonWorking) {
          await DailyTimetableSnapshot.updateOne(
            { dateString: date },
            { $set: { date: dateUTC, dateString: date, isWorkingDay: false, slots: [] } },
            { upsert: true }
          );
        } else if (date < "2026-10-24") {
          // Era 1 (dates prior to Oct 24, 2026): use stable Era 1 baseline snapshot for this weekday!
          const baselineDate = ERA1_BASELINE_DATES[dayName];
          const baselineSnap = baselineDate
            ? await DailyTimetableSnapshot.findOne({ dateString: baselineDate }).lean()
            : null;

          const slots = (baselineSnap?.slots || []).map((s) => ({
            classId: String(s.classId),
            teacherId: s.teacherId ? String(s.teacherId) : undefined,
            subjectId: s.subjectId ? String(s.subjectId) : undefined,
            periodNumber: s.periodNumber,
            day: dayName,
          }));

          await DailyTimetableSnapshot.updateOne(
            { dateString: date },
            { $set: { date: dateUTC, dateString: date, isWorkingDay: true, slots } },
            { upsert: true }
          );
        } else {
          // Era 3 (dates on or after Oct 24, 2026): reconstruct from TimeTable history for this specific date
          const timeTables = await TimeTable.find({}).lean();
          const slotMap = new Map();

          timeTables.forEach((tt) => {
            (tt.timeSlots || []).forEach((slot) => {
              if (slot.day !== dayName) return;
              if (!slot.teacherId && !slot.subjectId) return; // skip reset/empty slots

              const validFromDS = slot.validFrom ? getDS(slot.validFrom) : null;
              const vtDS = slot.validTo ? getDS(slot.validTo) : null;

              const isStarted = !validFromDS || validFromDS <= date;
              const isNotEnded = !vtDS || vtDS > date;

              if (isStarted && isNotEnded) {
                const key = `${String(tt.classId)}:${slot.periodNumber}`;
                const existing = slotMap.get(key);
                if (!existing) {
                  slotMap.set(key, {
                    classId:      String(tt.classId),
                    teacherId:    slot.teacherId ? String(slot.teacherId) : undefined,
                    subjectId:    slot.subjectId ? String(slot.subjectId) : undefined,
                    periodNumber: slot.periodNumber,
                    day:          dayName,
                    _validFromDS: validFromDS,
                  });
                } else if (validFromDS && (!existing._validFromDS || validFromDS > existing._validFromDS)) {
                  slotMap.set(key, {
                    classId:      String(tt.classId),
                    teacherId:    slot.teacherId ? String(slot.teacherId) : undefined,
                    subjectId:    slot.subjectId ? String(slot.subjectId) : undefined,
                    periodNumber: slot.periodNumber,
                    day:          dayName,
                    _validFromDS: validFromDS,
                  });
                }
              }
            });
          });

          const slots = Array.from(slotMap.values()).map(({ _validFromDS, ...s }) => s);

          await DailyTimetableSnapshot.updateOne(
            { dateString: date },
            { $set: { date: dateUTC, dateString: date, isWorkingDay: true, slots } },
            { upsert: true }
          );
        }

        // Return the freshly created/updated snapshot
        snapshot = await applyPopulate(
          DailyTimetableSnapshot.findOne({ dateString: date })
        ).lean();
      }
    }

    return NextResponse.json({ snapshot: snapshot || null });
  } catch (error) {
    console.error("Error fetching timetable snapshot:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/timetable-snapshot/backfill (called from the backfill route)
 * Reconstructs snapshots for all past dates using the validFrom/validTo data
 * already in the TimeTable collection.
 *
 * POST body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", cronSecret: "..." }
 * Skips dates that already have a snapshot.
 */
export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    if (body.cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startDateStr = body.startDate || "2026-01-01";
    const endDateStr   = body.endDate   || getDS(new Date());

    const startDate = new Date(startDateStr + "T00:00:00.000Z");
    const endDate   = new Date(endDateStr   + "T00:00:00.000Z");

    // Fetch all timetables and settings once
    const [timeTables, settings] = await Promise.all([
      TimeTable.find({}).lean(),
      Settings.findOne({}).lean(),
    ]);

    const nonWorkingDaySet = new Set(
      (settings?.general?.nonWorkingDays || []).map((dt) => getDS(dt))
    );

    let created = 0;
    let skipped = 0;

    const curr = new Date(startDate);
    while (curr <= endDate) {
      const ds = getDS(curr);
      const dayName = WEEKDAYS[curr.getUTCDay()];

      // Skip if snapshot already exists
      const existing = await DailyTimetableSnapshot.findOne({ dateString: ds }).lean();
      if (existing) {
        skipped++;
        curr.setUTCDate(curr.getUTCDate() + 1);
        continue;
      }

      const isNonWorking = dayName === "Friday" || nonWorkingDaySet.has(ds);
      const [y, m, d] = ds.split("-").map(Number);
      const dateUTC = new Date(Date.UTC(y, m - 1, d));

      if (isNonWorking) {
        await DailyTimetableSnapshot.updateOne(
          { dateString: ds },
          { $set: { date: dateUTC, dateString: ds, isWorkingDay: false, slots: [] } },
          { upsert: true }
        );
        created++;
        curr.setUTCDate(curr.getUTCDate() + 1);
        continue;
      }

      let slots = [];
      if (ds < "2026-10-24") {
        // Era 1
        const baselineDate = ERA1_BASELINE_DATES[dayName];
        const baselineSnap = baselineDate
          ? await DailyTimetableSnapshot.findOne({ dateString: baselineDate }).lean()
          : null;

        slots = (baselineSnap?.slots || []).map((s) => ({
          classId: String(s.classId),
          teacherId: s.teacherId ? String(s.teacherId) : undefined,
          subjectId: s.subjectId ? String(s.subjectId) : undefined,
          periodNumber: s.periodNumber,
          day: dayName,
        }));
      } else {
        // Era 3
        const slotMap = new Map();
        timeTables.forEach((tt) => {
          (tt.timeSlots || []).forEach((slot) => {
            if (slot.day !== dayName) return;
            if (!slot.teacherId && !slot.subjectId) return;

            const validFromDS = slot.validFrom ? getDS(slot.validFrom) : null;
            const validToDS   = slot.validTo ? getDS(slot.validTo) : null;

            const isStarted = !validFromDS || validFromDS <= ds;
            const isNotEnded = !validToDS || validToDS > ds;

            if (isStarted && isNotEnded) {
              const key = `${String(tt.classId)}:${slot.periodNumber}`;
              const existing = slotMap.get(key);
              if (!existing) {
                slotMap.set(key, {
                  classId:      String(tt.classId),
                  teacherId:    slot.teacherId ? String(slot.teacherId) : undefined,
                  subjectId:    slot.subjectId ? String(slot.subjectId) : undefined,
                  periodNumber: slot.periodNumber,
                  day:          dayName,
                  _validFromDS: validFromDS,
                });
              } else if (validFromDS && (!existing._validFromDS || validFromDS > existing._validFromDS)) {
                slotMap.set(key, {
                  classId:      String(tt.classId),
                  teacherId:    slot.teacherId ? String(slot.teacherId) : undefined,
                  subjectId:    slot.subjectId ? String(slot.subjectId) : undefined,
                  periodNumber: slot.periodNumber,
                  day:          dayName,
                  _validFromDS: validFromDS,
                });
              }
            }
          });
        });
        slots = Array.from(slotMap.values()).map(({ _validFromDS, ...s }) => s);
      }

      await DailyTimetableSnapshot.updateOne(
        { dateString: ds },
        { $set: { date: dateUTC, dateString: ds, isWorkingDay: true, slots } },
        { upsert: true }
      );
      created++;
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${created} snapshots created, ${skipped} already existed.`,
    });
  } catch (error) {
    console.error("Error in timetable-snapshot backfill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
