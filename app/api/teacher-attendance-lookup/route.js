import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Attendance from "@/models/Attendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import TimeTable from "@/models/TimeTable";
import DailyTimetableSnapshot from "@/models/DailyTimetableSnapshot";
import Settings from "@/models/Settings";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import { models } from "mongoose";

// Helper to get consistent YYYY-MM-DD using IST
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
        await connectToDB();

        const url = new URL(req.url);
        const teacherId = url.searchParams.get("teacherId");
        const monthParam = parseInt(url.searchParams.get("month"), 10);
        const yearParam = parseInt(url.searchParams.get("year"), 10);
        const specificDate = url.searchParams.get("date"); // YYYY-MM-DD

        if (!teacherId) {
            return NextResponse.json({ message: "teacherId is required" }, { status: 400 });
        }

        // 1. Determine Date Range
        let startDate = null;
        let endDate = null;
        
        if (specificDate) {
            const parts = specificDate.split("-");
            if (parts.length === 3) {
                startDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                endDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
            }
        } else if (monthParam && yearParam) {
            startDate = new Date(Date.UTC(yearParam, monthParam - 1, 1));
            endDate = new Date(Date.UTC(yearParam, monthParam, 0, 23, 59, 59, 999));
        } else if (yearParam) {
            startDate = new Date(Date.UTC(yearParam, 0, 1));
            endDate = new Date(Date.UTC(yearParam, 11, 31, 23, 59, 59, 999));
        } else {
            // Default to current month if nothing provided
            const now = new Date();
            startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
            endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
        }

        const startDS = getDS(startDate);
        const endDS = getDS(endDate);
        const todayDS = getDS(new Date());

        // 2. Fetch dependencies
        const [timeTables, settings, holidays, markedAttendance, snapshots] = await Promise.all([
            TimeTable.find({ "timeSlots.teacherId": teacherId }).lean(),
            Settings.findOne({}).lean(),
            models.AcademicCalendar ? models.AcademicCalendar.find({
                date: { $gte: startDate, $lte: endDate },
                type: "Holiday"
            }).lean() : [],
            Attendance.find({
                teacherId,
                date: { $gte: startDate, $lte: endDate }
            }).populate({ path: "classId", select: "name" })
              .populate({ path: "subjectId", select: "name" })
              .lean(),
            DailyTimetableSnapshot.find({
                dateString: { $gte: startDS, $lte: endDS },
                "slots.teacherId": teacherId
            }).lean(),
        ]);

        // 3. Pre-process data for synthesis
        const holidayMap = new Map();
        holidays.forEach(h => holidayMap.set(getDS(h.date), true));

        const snapshotByDate = {};
        (snapshots || []).forEach(snap => {
            snapshotByDate[snap.dateString] = snap;
        });

        const isTodayGlobalWorking = settings?.general?.isWorkingDay !== false;

        const scheduleSlots = [];
        timeTables.forEach(tt => {
            (tt.timeSlots || []).forEach(slot => {
                if (String(slot.teacherId) === teacherId) {
                    scheduleSlots.push({
                        classId: tt.classId,
                        subjectId: slot.subjectId,
                        periodNumber: slot.periodNumber,
                        day: slot.day,
                        validFrom: slot.validFrom || tt.updatedAt || tt.createdAt,
                        validTo: slot.validTo
                    });
                }
            });
        });

        const markedMap = new Map();
        markedAttendance.forEach(att => {
            const dateKey = getDS(att.date);
            const key = `${dateKey}_${String(att.classId?._id || att.classId)}_${String(att.subjectId?._id || att.subjectId)}_${att.periodNumber}`;
            markedMap.set(key, att);
        });

        // 4. Synthesis
        const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const records = [];
        const processedKeys = new Set();

        let curr = new Date(startDate);
        while (curr <= endDate) {
            const dateDS = getDS(curr);
            const dayName = WEEKDAYS[curr.getUTCDay()];
            
            const isHoliday = holidayMap.has(dateDS);
            const isImplicitHoliday = (dateDS >= "2026-04-01" && dateDS <= "2026-04-10") || (dateDS >= "2026-05-25" && dateDS <= "2026-06-05") || (dateDS >= "2026-02-12" && dateDS <= "2026-02-28");
            const isWorkingDay = !isHoliday && !isImplicitHoliday && isTodayGlobalWorking;

            if (dayName !== "Friday") {
                // Determine day slots: for historical dates with snapshots, prefer snapshot slots
                let daySlots = [];
                const snap = snapshotByDate[dateDS];
                if (snap && snap.isWorkingDay && dateDS < todayDS) {
                    const snapTeacherSlots = (snap.slots || []).filter(s => String(s.teacherId) === teacherId);
                    if (snapTeacherSlots.length > 0) {
                        daySlots = snapTeacherSlots.map(s => ({
                            classId: String(s.classId?._id || s.classId),
                            subjectId: String(s.subjectId?._id || s.subjectId),
                            periodNumber: s.periodNumber,
                            day: dayName,
                            validFrom: null,
                            validTo: null
                        }));
                    }
                }

                if (daySlots.length === 0) {
                    daySlots = scheduleSlots.filter(s => s.day === dayName);
                }

                daySlots.forEach(slot => {
                    const key = `${dateDS}_${String(slot.classId)}_${String(slot.subjectId)}_${slot.periodNumber}`;
                    if (processedKeys.has(key)) return;
                    processedKeys.add(key);

                    const actual = markedMap.get(key);
                    const validFromDS = slot.validFrom ? getDS(slot.validFrom) : null;
                    const validToDS = slot.validTo ? getDS(slot.validTo) : null;

                    if (actual) {
                        const isLeave = !!actual.leaveReason;
                        records.push({
                            date: actual.date,
                            classId: String(actual.classId?._id || actual.classId || slot.classId),
                            subjectId: String(actual.subjectId?._id || actual.subjectId || slot.subjectId),
                            subjectName: actual.subjectId?.name || "Unknown",
                            className: actual.classId?.name || "Unknown",
                            periodNumber: actual.periodNumber,
                            present: !isLeave,
                            synthetic: false,
                            leaveReason: actual.leaveReason || null
                        });
                    } else if (isWorkingDay && dateDS <= todayDS && (!validFromDS || dateDS >= validFromDS) && (!validToDS || dateDS < validToDS)) {
                        records.push({
                            date: new Date(curr),
                            classId: slot.classId,
                            subjectId: slot.subjectId,
                            periodNumber: slot.periodNumber,
                            present: dateDS === todayDS ? null : false,
                            synthetic: true
                        });
                    }
                });
            }

            curr.setUTCDate(curr.getUTCDate() + 1);
        }

        // 4b. Include any actual marked attendances that were not matched to current timetable slots
        markedAttendance.forEach((att) => {
            const dateKey = getDS(att.date);
            const key = `${dateKey}_${String(att.classId?._id || att.classId)}_${String(att.subjectId?._id || att.subjectId)}_${att.periodNumber}`;
            if (!processedKeys.has(key)) {
                processedKeys.add(key);
                const isLeave = !!att.leaveReason;
                records.push({
                    date: att.date,
                    classId: String(att.classId?._id || att.classId),
                    subjectId: String(att.subjectId?._id || att.subjectId),
                    subjectName: att.subjectId?.name || "Unknown",
                    className: att.classId?.name || "Unknown",
                    periodNumber: att.periodNumber,
                    present: !isLeave,
                    synthetic: false,
                    leaveReason: att.leaveReason || null
                });
            }
        });

        // 5. Populate names for synthetic records or missing populated names
        const missingClassIds = [...new Set(records.filter(r => r.synthetic || !r.className || r.className === "Unknown").map(r => String(r.classId)))];
        const missingSubIds = [...new Set(records.filter(r => r.synthetic || !r.subjectName || r.subjectName === "Unknown").map(r => String(r.subjectId)))];

        const [classes, subjects] = await Promise.all([
            missingClassIds.length > 0 ? Class.find({ _id: { $in: missingClassIds } }, "name").lean() : [],
            missingSubIds.length > 0 ? Subject.find({ _id: { $in: missingSubIds } }, "name").lean() : []
        ]);

        const classMap = Object.fromEntries(classes.map(c => [String(c._id), c.name]));
        const subjectMap = Object.fromEntries(subjects.map(s => [String(s._id), s.name]));

        records.forEach(r => {
            if (!r.className || r.className === "Unknown") {
                r.className = classMap[String(r.classId)] || "Unknown";
            }
            if (!r.subjectName || r.subjectName === "Unknown") {
                r.subjectName = subjectMap[String(r.subjectId)] || "Unknown";
            }
        });

        // 6. Join leaveReason from TeachersLeaveRecord
        const leaveRecordDocs = await TeachersLeaveRecord.find({
            teacherId,
            date: { $gte: startDate, $lte: endDate },
        }, "classId periodNumber date leaveReason").lean();

        const toStr = (v) => (v?._id || v || "").toString().trim();

        const leaveMap = {};
        leaveRecordDocs.forEach(lr => {
            const dateKey = getDS(lr.date);
            const key = `${toStr(lr.classId)}_${lr.periodNumber}_${dateKey}`;
            if (lr.leaveReason) leaveMap[key] = lr.leaveReason;
        });

        // Fetch Periods for timing information
        const Period = (await import("@/models/Period")).default;
        const periods = await Period.find({}).lean();
        const periodTimeMap = {};
        periods.forEach(p => {
            periodTimeMap[p.periodNumber] = p.formattedTime;
        });

        records.forEach(r => {
            const dateKey = getDS(r.date);
            const key = `${toStr(r.classId)}_${r.periodNumber}_${dateKey}`;
            if (!r.leaveReason && r.present === false && leaveMap[key]) {
                r.leaveReason = leaveMap[key];
            } else if (!r.leaveReason && r.present !== true && leaveMap[key]) {
                r.leaveReason = leaveMap[key];
                r.present = false;
            }
            r.periodTime = periodTimeMap[r.periodNumber] || null;
        });

        // Final sort: latest date first
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        return NextResponse.json({ records }, { status: 200 });

    } catch (error) {
        console.error("teacher-attendance-lookup error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
