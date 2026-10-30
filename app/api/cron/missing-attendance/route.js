import { NextResponse } from "next/server";
import webpush from "web-push";
import connectToDB from "@/lib/db";
import TimeTable from "@/models/TimeTable";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import Settings from "@/models/Settings";
import DailyTimetableSnapshot from "@/models/DailyTimetableSnapshot";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";


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

export async function GET(req) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@scofist.com",
      process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // 1. Verify cron secret from Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();


    // 1b. Check if today is a non-working day via Settings — skip entirely if so
    const settings = await Settings.findOne({}).lean();

    // Get today's IST date string for comparison with nonWorkingDays
    const nowForCheck = new Date();
    const todayISTDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(nowForCheck); // returns YYYY-MM-DD

    const isNonWorkingByToggle = !settings?.general?.isWorkingDay;
    const isNonWorkingByHistory = (settings?.general?.nonWorkingDays || []).some(
      (dt) => new Date(dt).toISOString().split("T")[0] === todayISTDateStr
    );

    if (isNonWorkingByToggle || isNonWorkingByHistory) {
      // If the college is closed by toggle but not yet in history, add it to the history
      if (isNonWorkingByToggle && !isNonWorkingByHistory) {
        const todayIST = new Date(nowForCheck.getTime() + 5.5 * 60 * 60 * 1000);
        const y = todayIST.getUTCFullYear();
        const m = String(todayIST.getUTCMonth() + 1).padStart(2, "0");
        const d = String(todayIST.getUTCDate()).padStart(2, "0");
        const todayMidnight = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
        
        await Settings.updateOne({}, {
          $addToSet: { 'general.nonWorkingDays': todayMidnight }
        });
      }

      // Save an empty snapshot so this date is permanently marked as a non-working day.
      // Future timetable changes won't make this date appear as a school day in history.
      const [istY, istM, istD] = todayISTDateStr.split("-").map(Number);
      const todayUTCMidnight = new Date(Date.UTC(istY, istM - 1, istD));
      await DailyTimetableSnapshot.updateOne(
        { dateString: todayISTDateStr },
        { $set: { date: todayUTCMidnight, dateString: todayISTDateStr, isWorkingDay: false, slots: [] } },
        { upsert: true }
      );

      return NextResponse.json(
        { message: `College is closed today (${todayISTDateStr} is a non-working day). No notifications sent.` },
        { status: 200 }
      );
    }

    // 2. Get today's day of week and date boundaries (all in IST)
    const today = new Date();

    // Use IST timezone for day-of-week checking since the school operates in IST
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    });
    const todayDay = formatter.format(today); // e.g., "Monday"
    const todayDS = getDS(today); // YYYY-MM-DD in IST

    // Compute IST midnight for today to build correct UTC date boundaries for DB queries.
    // IST is UTC+5:30, so IST midnight = UTC 18:30 of the previous day.
    // e.g. 2024-07-04 00:00 IST = 2024-07-03 18:30:00 UTC
    const [istYear, istMonth, istDay] = todayDS.split("-").map(Number);
    // IST midnight expressed in UTC
    const startOfDayIST = new Date(Date.UTC(istYear, istMonth - 1, istDay, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
    // IST end of day = IST midnight next day - 1ms
    const endOfDayIST = new Date(Date.UTC(istYear, istMonth - 1, istDay + 1, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000) - 1);

    const startOfDay = startOfDayIST;
    const endOfDay = endOfDayIST;

    const isSeniorOn = settings?.general?.seniorDaawa?.isWorkingDay !== false;
    const isJuniorOn = settings?.general?.juniorDaawa?.isWorkingDay !== false;

    // 3. Fetch timetables that have slots for today
    const timeTables = await TimeTable.find({
      "timeSlots.day": todayDay,
    }).populate("classId", "name section").lean();

    const expectedPeriods = [];
    
    timeTables.forEach((tt) => {
      tt.timeSlots.forEach((slot) => {
        if (slot.day === todayDay) {
          const validFromDS = slot.validFrom ? getDS(slot.validFrom) : null;
          const validToDS = slot.validTo ? getDS(slot.validTo) : null;

          if ((!validFromDS || todayDS >= validFromDS) && (!validToDS || todayDS < validToDS)) {
            const classSection = tt.classId?.section || "";
            if (classSection === "Senior Da-awa" && !isSeniorOn) return;
            if (classSection === "Junior Da-awa" && !isJuniorOn) return;

            expectedPeriods.push({
              classId: tt.classId._id.toString(),
              className: tt.classId.name,
              subjectId: slot.subjectId?.toString(),
              teacherId: slot.teacherId?.toString(),
              periodNumber: slot.periodNumber,
            });
          }
        }
      });
    });

    if (expectedPeriods.length === 0) {
      return NextResponse.json({ message: "No periods scheduled for today" });
    }

    // ── SNAPSHOT ──────────────────────────────────────────────────────────────
    // Permanently record today's active timetable so that future timetable
    // changes never alter how this date appears in "timetable view by date".
    // Uses upsert so re-running the cron is idempotent.
    const [istY, istM, istD] = todayDS.split("-").map(Number);
    const todayUTCMidnight = new Date(Date.UTC(istY, istM - 1, istD));
    await DailyTimetableSnapshot.updateOne(
      { dateString: todayDS },
      {
        // $setOnInsert: only writes if this is a new document (upsert creating one).
        // If a snapshot already exists for today (e.g., saved by the PUT handler when
        // the timetable was edited), this call is a no-op — the original state is preserved.
        $setOnInsert: {
          date: todayUTCMidnight,
          dateString: todayDS,
          isWorkingDay: true,
          // Only store slots that have at least a teacher or subject assigned.
          // Slots cleared/reset to null are omitted so the date-view shows them as empty.
          slots: expectedPeriods
            .filter(ep => ep.teacherId || ep.subjectId)
            .map(ep => ({
              classId:      ep.classId,
              teacherId:    ep.teacherId,
              subjectId:    ep.subjectId,
              periodNumber: ep.periodNumber,
              day:          todayDay,
            })),
        },
      },
      { upsert: true }
    );
    // ──────────────────────────────────────────────────────────────────────────

    // 4. Fetch today's attendance records
    const attendances = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // Create a set of marked periods for quick lookup
    // Format: classId_subjectId_periodNumber
    const markedPeriods = new Set(
      attendances.map(
        (att) => `${att.classId}_${att.subjectId}_${att.periodNumber}`
      )
    );

    // Fetch teachers leave records to exclude them from missing alerts
    const leaveRecords = await TeachersLeaveRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const markedLeaves = new Set(
      leaveRecords.map(
        (lr) => `${lr.teacherId}_${lr.classId}_${lr.periodNumber}`
      )
    );

    // 5. Find missing attendances
    const missingByTeacher = {};

    for (const expected of expectedPeriods) {
      // If any crucial ID is missing, skip
      if (!expected.teacherId || !expected.classId || !expected.subjectId) continue;

      const key = `${expected.classId}_${expected.subjectId}_${expected.periodNumber}`;
      const leaveKey = `${expected.teacherId}_${expected.classId}_${expected.periodNumber}`;
      
      if (!markedPeriods.has(key) && !markedLeaves.has(leaveKey)) {
        if (!missingByTeacher[expected.teacherId]) {
          missingByTeacher[expected.teacherId] = [];
        }
        missingByTeacher[expected.teacherId].push(expected);
      }
    }

    if (Object.keys(missingByTeacher).length === 0) {
      return NextResponse.json({ message: "All attendances marked for today!" });
    }

    // 6. Fetch subjects to display subject names
    const subjectIds = [...new Set(expectedPeriods.map(ep => ep.subjectId).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subjectMap = {};
    subjects.forEach(sub => {
      subjectMap[sub._id.toString()] = sub.name;
    });

    // 7. Send Push Notifications
    const teachers = await User.find({
      _id: { $in: Object.keys(missingByTeacher) },
    }).lean();

    let notificationCount = 0;

    const pushPromises = teachers.map(async (teacher) => {
      if (!teacher.pushSubscriptions || teacher.pushSubscriptions.length === 0) {
        return; // Skip if teacher hasn't subscribed
      }

      const missing = missingByTeacher[teacher._id.toString()];
      
      // Sort missing periods to keep them in order
      missing.sort((a, b) => a.periodNumber - b.periodNumber);
      
      const isMultiple = missing.length > 1;
      const title = isMultiple ? `Missing Attendance Alert 🚨 (${missing.length} periods)` : "Missing Attendance Alert 🚨";
      
      let bodyText = `You missed marking attendance ${missing.length} period${missing.length > 1 ? 's' : ''}.\n`;
      bodyText += missing.map((m, index) => `${index + 1}. Period: ${m.periodNumber} - ${m.className} (${subjectMap[m.subjectId] || 'Subject'})`).join("\n");

      const payload = JSON.stringify({
        title,
        body: bodyText,
        url: "/dashboard/my-periods"
      });

      // Deduplicate subscriptions by endpoint, keeping the newest one (last in the array)
      const uniqueSubs = [];
      const endpoints = new Set();
      for (let i = teacher.pushSubscriptions.length - 1; i >= 0; i--) {
        const sub = teacher.pushSubscriptions[i];
        if (!endpoints.has(sub.endpoint)) {
          endpoints.add(sub.endpoint);
          uniqueSubs.push(sub);
        }
      }

      // Send to all registered devices of the teacher
      const devicePromises = uniqueSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          notificationCount++;
        } catch (error) {
          console.error(`Failed to send push to teacher ${teacher.name}:`, error.body || error);
          // If status code is 410 or 404, the subscription has expired or is no longer valid.
          if (error.statusCode === 410 || error.statusCode === 404) {
            try {
              await User.findByIdAndUpdate(teacher._id, {
                $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
              });
              console.log(`Removed expired push subscription for ${teacher.name}`);
            } catch (dbError) {
              console.error(`Failed to remove expired subscription for ${teacher.name}:`, dbError);
            }
          }
        }
      });

      await Promise.all(devicePromises);
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ 
      success: true, 
      message: `Sent ${notificationCount} push notifications to teachers with missing attendance.` 
    });

  } catch (error) {
    console.error("Error in missing-attendance cron:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
