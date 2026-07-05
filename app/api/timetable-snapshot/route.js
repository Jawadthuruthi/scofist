import connectToDB from "@/lib/db";
import DailyTimetableSnapshot from "@/models/DailyTimetableSnapshot";
import TimeTable from "@/models/TimeTable";
import Settings from "@/models/Settings";
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

/**
 * GET /api/timetable-snapshot?date=YYYY-MM-DD
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

    if (!date) {
      return NextResponse.json({ error: "date param required" }, { status: 400 });
    }

    const snapshot = await DailyTimetableSnapshot.findOne({ dateString: date }).lean();
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

      const isNonWorking = nonWorkingDaySet.has(ds);
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

      // Build slots active on this date (same logic as timetable view by date)
      const slots = [];
      timeTables.forEach((tt) => {
        (tt.timeSlots || []).forEach((slot) => {
          if (slot.day !== dayName) return;
          if (!slot.teacherId || !slot.subjectId) return;

          const effectiveValidFrom = slot.validFrom || tt.updatedAt || tt.createdAt;
          const validFromDS = effectiveValidFrom ? getDS(effectiveValidFrom) : null;
          const validToDS   = slot.validTo ? getDS(slot.validTo) : null;

          const isStarted  = !validFromDS || validFromDS <= ds;
          const isNotEnded = !validToDS   || validToDS   >  ds;

          if (isStarted && isNotEnded) {
            slots.push({
              classId:      String(tt.classId),
              teacherId:    String(slot.teacherId),
              subjectId:    String(slot.subjectId),
              periodNumber: slot.periodNumber,
              day:          dayName,
            });
          }
        });
      });

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
