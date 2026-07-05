/**
 * One-time backfill script for DailyTimetableSnapshot.
 * Run with: node scripts/backfill-snapshots.mjs
 *
 * Requires MONGODB_URI in .env.local (or set it in environment).
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// ── Load .env.local ────────────────────────────────────────────────────────
try {
  const envContent = readFileSync(join(projectRoot, ".env.local"), "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
} catch (e) {
  console.warn("Could not load .env.local:", e.message);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment or .env.local");
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────
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

// ── Mongoose Schemas (minimal) ─────────────────────────────────────────────
const timeTableSchema = new mongoose.Schema({
  classId: String,
  timeSlots: [{
    subjectId:    String,
    teacherId:    String,
    periodNumber: Number,
    day:          String,
    validFrom:    Date,
    validTo:      Date,
  }],
}, { timestamps: true });

const snapshotSchema = new mongoose.Schema({
  date:        Date,
  dateString:  { type: String, unique: true, index: true },
  isWorkingDay:{ type: Boolean, default: true },
  slots: [{
    classId:      String,
    teacherId:    String,
    subjectId:    String,
    periodNumber: Number,
    day:          String,
  }],
}, { timestamps: true });

const settingsSchema = new mongoose.Schema({ general: mongoose.Schema.Types.Mixed });

// ── Main ───────────────────────────────────────────────────────────────────
(async () => {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const TimeTable = mongoose.models.TimeTable || mongoose.model("TimeTable", timeTableSchema);
  const DailyTimetableSnapshot = mongoose.models.DailyTimetableSnapshot || mongoose.model("DailyTimetableSnapshot", snapshotSchema);
  const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

  const [timeTables, settings] = await Promise.all([
    TimeTable.find({}).lean(),
    Settings.findOne({}).lean(),
  ]);

  const nonWorkingDaySet = new Set(
    (settings?.general?.nonWorkingDays || []).map((dt) => getDS(dt))
  );

  // Backfill from Jan 1 2026 through yesterday
  const startDate = new Date("2026-01-01T00:00:00.000Z");
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 1); // yesterday (today is handled by cron)

  let created = 0, skipped = 0;
  const curr = new Date(startDate);

  while (curr <= endDate) {
    const ds = getDS(curr);
    const dayName = WEEKDAYS[curr.getUTCDay()];

    const existing = await DailyTimetableSnapshot.findOne({ dateString: ds }).lean();
    if (existing) {
      skipped++;
      curr.setUTCDate(curr.getUTCDate() + 1);
      continue;
    }

    const [y, m, d] = ds.split("-").map(Number);
    const dateUTC = new Date(Date.UTC(y, m - 1, d));
    const isNonWorking = nonWorkingDaySet.has(ds);

    if (isNonWorking) {
      await DailyTimetableSnapshot.updateOne(
        { dateString: ds },
        { $set: { date: dateUTC, dateString: ds, isWorkingDay: false, slots: [] } },
        { upsert: true }
      );
      console.log(`[NON-WORKING] ${ds}`);
      created++;
      curr.setUTCDate(curr.getUTCDate() + 1);
      continue;
    }

    const slots = [];
    timeTables.forEach((tt) => {
      (tt.timeSlots || []).forEach((slot) => {
        if (slot.day !== dayName) return;
        if (!slot.teacherId || !slot.subjectId) return;

        const effectiveVF = slot.validFrom || tt.updatedAt || tt.createdAt;
        const validFromDS = effectiveVF ? getDS(effectiveVF) : null;
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
    console.log(`[SNAPSHOT] ${ds} — ${slots.length} slots`);
    created++;
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}`);
  await mongoose.disconnect();
})();
