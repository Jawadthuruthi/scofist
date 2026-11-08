import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import Batch from "@/models/Batch";
import Subject from "@/models/Subject";
import User from "@/models/User";
import TimeTable from "@/models/TimeTable";
import DailyTimetableSnapshot from "@/models/DailyTimetableSnapshot";
import Period from "@/models/Period";
import Settings from "@/models/Settings";
import Attendance from "@/models/Attendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import { sortClasses } from "@/lib/utils";
import { apiResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

// Helper to get consistent YYYY-MM-DD from any Date source using IST Time
const getDS = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  // Convert to IST (+5:30)
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const filterParams = Object.fromEntries(url.searchParams.entries());
    const page = parseInt(filterParams.page || "0", 10);
    const limitParam = filterParams.limit;
    const limit = limitParam === "0" ? Infinity : (parseInt(limitParam, 10) || Infinity);

    // 1. Determine Date Range in IST format
    let startDateParam = filterParams.startDate || filterParams.date;
    let endDateParam = filterParams.endDate || filterParams.date;

    if (!startDateParam && filterParams.year && filterParams.month) {
      const year = parseInt(filterParams.year, 10);
      const month = parseInt(filterParams.month, 10);
      startDateParam = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      endDateParam = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    if (!startDateParam) {
      startDateParam = getDS(new Date());
      endDateParam = startDateParam;
    }

    const queryStartDate = new Date(startDateParam + "T00:00:00.000Z");
    const queryEndDate = new Date(endDateParam + "T23:59:59.999Z");
    // Expand by 24h buffer for MongoDB query to ensure cross-timezone stored records are never missed
    const bufferedStart = new Date(queryStartDate.getTime() - 24 * 3600 * 1000);
    const bufferedEnd = new Date(queryEndDate.getTime() + 24 * 3600 * 1000);

    // 2. Build Query for Active Classes
    const classQuery = { status: { $ne: "Closed" } };

    if (filterParams.classId) {
      const classIds = String(filterParams.classId).split(",").map((s) => s.trim());
      classQuery._id = { $in: classIds };
    }

    if (filterParams.batchId) {
      const batchIds = String(filterParams.batchId).split(",").map((s) => s.trim());
      classQuery.batchId = { $in: batchIds };
    }

    if (filterParams.name) {
      classQuery.name = { $regex: filterParams.name, $options: "i" };
    }

    // 3. Fetch Classes, Batches, Subjects, Teachers, TimeTables, Snapshots, Periods, Settings
    const [allClasses, allBatches, allSubjects, allTeachers, timeTables, snapshots, periods, settings] =
      await Promise.all([
        Class.find(classQuery)
          .select("_id name shortname batchId coreSubjects majorSubjects section status")
          .lean(),
        Batch.find({}).select("_id name endYear").lean(),
        Subject.find({}).select("_id name").lean(),
        User.find({ roles: "Teacher" }).select("_id name").lean(),
        TimeTable.find({}).lean(),
        DailyTimetableSnapshot.find({
          dateString: { $gte: startDateParam, $lte: endDateParam },
        }).lean(),
        Period.find({ schedule: "normal" }).select("periodNumber endTime").lean(),
        Settings.findOne({}).lean(),
      ]);

    if (!allClasses || allClasses.length === 0) {
      return NextResponse.json(
        {
          classAttendances: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
          message: "No active classes found",
        },
        { status: 200 }
      );
    }

    // Dictionaries for fast lookup
    const batchMap = {};
    allBatches.forEach((b) => {
      batchMap[String(b._id)] = b;
    });

    const subjectMap = {};
    allSubjects.forEach((s) => {
      subjectMap[String(s._id)] = s.name;
    });

    const teacherMap = {};
    allTeachers.forEach((t) => {
      teacherMap[String(t._id)] = t.name;
    });

    // Map snapshots by dateString
    const snapshotByDate = {};
    snapshots.forEach((s) => {
      snapshotByDate[s.dateString] = s;
    });

    // Map period end times for today's checks
    const periodEndTimeMap = {};
    (periods || []).forEach((p) => {
      periodEndTimeMap[p.periodNumber] = p.endTime;
    });

    const now = new Date();
    const nowIST = new Date(now.getTime() + 5.5 * 3600 * 1000);
    const nowHours = String(nowIST.getUTCHours()).padStart(2, "0");
    const nowMinutes = String(nowIST.getUTCMinutes()).padStart(2, "0");
    const nowTimeStr = `${nowHours}:${nowMinutes}`;

    // Sort active classes in the exact order of the dashboard using sortClasses
    allClasses.sort((a, b) => {
      const classCompare = sortClasses(a, b, (item) => item.name);
      if (classCompare !== 0) return classCompare;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    const activeClasses = allClasses.map((c) => {
      const bName = batchMap[String(c.batchId)]?.name;
      return {
        ...c,
        originalName: c.name,
        batchName: bName || "",
        displayName: bName ? `${c.name} (${bName})` : c.name,
      };
    });

    const activeClassIds = activeClasses.map((c) => c._id.toString());

    // Build class section map
    const classSectionMap = {};
    activeClasses.forEach((cls) => {
      let section = cls.section || "";
      let name = cls.name || "";
      if (section.toLowerCase().includes("senior") || name.toLowerCase().includes("senior")) {
        section = "Senior Da-awa";
      } else if (section.toLowerCase().includes("junior") || name.toLowerCase().includes("junior")) {
        section = "Junior Da-awa";
      }
      classSectionMap[String(cls._id)] = section;
    });

    // 4. Non-working day logic (IST based, consistent with teacherAttendances)
    const nonWorkingDaySet = new Set([
      ...(settings?.general?.nonWorkingDays || []).map((dt) => getDS(dt)),
      ...(settings?.general?.nonWorkingDaysLog || []).map((entry) => getDS(entry.date)),
    ]);
    const seniorDaawaNonWorkingDaySet = new Set([
      ...(settings?.general?.seniorDaawaNonWorkingDays || []).map((dt) => getDS(dt)),
      ...(settings?.general?.seniorDaawaNonWorkingDaysLog || []).map((entry) => getDS(entry.date)),
    ]);
    const juniorDaawaNonWorkingDaySet = new Set([
      ...(settings?.general?.juniorDaawaNonWorkingDays || []).map((dt) => getDS(dt)),
      ...(settings?.general?.juniorDaawaNonWorkingDaysLog || []).map((entry) => getDS(entry.date)),
    ]);

    const todayDS = getDS(new Date());

    const fillDynamicDays = (set, isOff, datesArray) => {
      if (isOff) {
        set.add(todayDS);
        if (datesArray && datesArray.length > 0) {
          const latestDate = new Date(Math.max(...datesArray.map((d) => new Date(d).getTime())));
          const latestDS = getDS(latestDate);
          let curr = new Date(latestDS + "T00:00:00.000Z");
          while (getDS(curr) <= todayDS) {
            set.add(getDS(curr));
            curr.setUTCDate(curr.getUTCDate() + 1);
          }
        }
      }
    };

    fillDynamicDays(nonWorkingDaySet, settings?.general?.isWorkingDay === false, settings?.general?.nonWorkingDays);
    fillDynamicDays(seniorDaawaNonWorkingDaySet, settings?.general?.seniorDaawa?.isWorkingDay === false, settings?.general?.seniorDaawaNonWorkingDays);
    fillDynamicDays(juniorDaawaNonWorkingDaySet, settings?.general?.juniorDaawa?.isWorkingDay === false, settings?.general?.juniorDaawaNonWorkingDays);

    // 5. Pre-process Live TimeTables into class-level schedule map (active slots only: !slot.validTo)
    const liveClassScheduleMap = {};
    timeTables.forEach((tt) => {
      const cId = String(tt.classId?._id || tt.classId);
      if (!liveClassScheduleMap[cId]) liveClassScheduleMap[cId] = {};
      (tt.timeSlots || []).forEach((slot) => {
        if (slot.validTo) return; // Skip invalidated slots
        const day = slot.day;
        if (!liveClassScheduleMap[cId][day]) liveClassScheduleMap[cId][day] = [];
        liveClassScheduleMap[cId][day].push(slot);
      });
    });

    // 6. Fetch actual Attendance and Leave Records for active classes with buffer
    const [conductedAttendances, leaveRecords] = await Promise.all([
      Attendance.find({
        classId: { $in: activeClassIds },
        date: { $gte: bufferedStart, $lte: bufferedEnd },
      })
        .select("classId batchId subjectId teacherId periodNumber day date leaveReason attendanceData")
        .lean(),
      TeachersLeaveRecord.find({
        classId: { $in: activeClassIds },
        date: { $gte: bufferedStart, $lte: bufferedEnd },
      })
        .select("teacherId classId periodNumber date leaveReason")
        .lean(),
    ]);

    // Build leaveReason lookup: teacherId_classId_periodNumber_dateKey and classId_periodNumber_dateKey
    const leaveReasonMap = {};
    leaveRecords.forEach((lr) => {
      const tId = lr.teacherId ? String(lr.teacherId?._id || lr.teacherId) : "";
      const cId = String(lr.classId?._id || lr.classId);
      const ds = getDS(lr.date);
      const key = `${tId}_${cId}_${lr.periodNumber}_${ds}`;
      const classPeriodKey = `${cId}_${lr.periodNumber}_${ds}`;
      if (lr.leaveReason) {
        leaveReasonMap[key] = lr.leaveReason;
        leaveReasonMap[classPeriodKey] = lr.leaveReason;
      }
    });

    // Group conducted attendance strictly within the requested IST date window
    const conductedByClass = {};
    conductedAttendances.forEach((att) => {
      const ds = getDS(att.date);
      if (ds < startDateParam || ds > endDateParam) return;
      const cId = String(att.classId?._id || att.classId);
      if (!conductedByClass[cId]) conductedByClass[cId] = [];
      conductedByClass[cId].push(att);
    });

    // For historical months: synthesize up to endDateParam. For the current month: up to todayDS.
    const maxDateDS = endDateParam < todayDS ? endDateParam : todayDS;

    // 7. Synthesize Class Attendance
    const formattedData = activeClasses.map((cls) => {
      const cId = String(cls._id);
      const records = [];
      const processedKeys = new Set();
      const slotSection = classSectionMap[cId] || "";

      // Step 7a: Process actual Attendance records marked by teachers
      (conductedByClass[cId] || []).forEach((att) => {
        if (filterParams.subjectId) {
          const subjectIds = String(filterParams.subjectId).split(",").map((s) => s.trim());
          if (!subjectIds.includes(String(att.subjectId?._id || att.subjectId))) return;
        }

        const ds = getDS(att.date);
        const key = `${ds}_${cId}_${att.periodNumber}`;
        if (processedKeys.has(key)) return;

        // Attendance marked by teacher counts as present (unless marked as leave reason)
        const hasAttendanceMarked = !att.leaveReason;

        const sId = String(att.subjectId?._id || att.subjectId);
        const sName = subjectMap[sId] || "Unknown Subject";
        const tId = att.teacherId ? String(att.teacherId?._id || att.teacherId) : "";
        const tName = tId ? teacherMap[tId] || "—" : "—";
        const dayStr = att.day || WEEKDAYS[new Date(att.date).getUTCDay()];

        records.push({
          _id: `att_${att._id}_${ds}_${att.periodNumber}`,
          classId: cId,
          className: cls.displayName || cls.name,
          subjectId: sId,
          subjectName: sName,
          teacherId: tId,
          teacherName: tName,
          periodNumber: att.periodNumber,
          date: new Date(att.date),
          day: dayStr,
          present: hasAttendanceMarked,
          leaveReason: att.leaveReason || null,
        });
        processedKeys.add(key);
      });

      // Step 7b: Synthesize scheduled timetable slots on working days
      let curr = new Date(queryStartDate);
      while (getDS(curr) <= maxDateDS) {
        const dateString = getDS(curr);
        const istDate = new Date(curr.getTime() + 5.5 * 3600 * 1000);
        const dayName = WEEKDAYS[istDate.getUTCDay()];

        // Friday is always non-working across the institution
        const isFriday = dayName === "Friday";
        const isGlobalHoliday = nonWorkingDaySet.has(dateString);
        const isSectionHoliday =
          slotSection === "Senior Da-awa"
            ? seniorDaawaNonWorkingDaySet.has(dateString)
            : slotSection === "Junior Da-awa"
            ? juniorDaawaNonWorkingDaySet.has(dateString)
            : false;

        const snap = snapshotByDate[dateString];
        const isSnapNonWorking = snap && !snap.isWorkingDay;

        const isWorkingDay = !isFriday && !isGlobalHoliday && !isSectionHoliday && !isSnapNonWorking;

        if (isWorkingDay) {
          // Scheduled slots for this class on this date:
          // Priority 1: Snapshot slots for this class (for past dates where snapshot exists)
          let scheduledSlots = [];
          if (snap && snap.isWorkingDay && dateString < todayDS) {
            const snapClassSlots = (snap.slots || []).filter(
              (s) => String(s.classId?._id || s.classId) === cId
            );
            if (snapClassSlots.length > 0) {
              scheduledSlots = snapClassSlots.map((s) => ({
                subjectId: String(s.subjectId?._id || s.subjectId),
                teacherId: s.teacherId ? String(s.teacherId?._id || s.teacherId) : "",
                periodNumber: s.periodNumber,
                day: dayName,
              }));
            }
          }

          // Priority 2: Live timetable slots
          if (scheduledSlots.length === 0) {
            scheduledSlots = (liveClassScheduleMap[cId] && liveClassScheduleMap[cId][dayName]) || [];
          }

          scheduledSlots.forEach((slot) => {
            if (!slot.subjectId) return;

            if (filterParams.subjectId) {
              const subjectIds = String(filterParams.subjectId).split(",").map((s) => s.trim());
              if (!subjectIds.includes(String(slot.subjectId?._id || slot.subjectId))) return;
            }

            const key = `${dateString}_${cId}_${slot.periodNumber}`;
            if (processedKeys.has(key)) return;

            // If it is today, only count as absent if period end time has already passed
            if (dateString === todayDS) {
              const pEnd = periodEndTimeMap[slot.periodNumber] || "16:00";
              if (nowTimeStr < pEnd) {
                // Period hasn't ended yet today - skip synthesizing as absent
                return;
              }
            }

            const sId = String(slot.subjectId?._id || slot.subjectId);
            const sName = subjectMap[sId] || "Unknown Subject";
            const tId = slot.teacherId ? String(slot.teacherId?._id || slot.teacherId) : "";
            const tName = tId ? teacherMap[tId] || "—" : "—";

            // Check if teacher had logged a leave reason
            const leaveKey = `${tId}_${cId}_${slot.periodNumber}_${dateString}`;
            const classLeaveKey = `${cId}_${slot.periodNumber}_${dateString}`;
            const leaveReason = leaveReasonMap[leaveKey] || leaveReasonMap[classLeaveKey] || null;

            records.push({
              _id: `synth_abs_${cId}_${dateString}_${slot.periodNumber}`,
              classId: cId,
              className: cls.displayName || cls.name,
              subjectId: sId,
              subjectName: sName,
              teacherId: tId,
              teacherName: tName,
              periodNumber: slot.periodNumber,
              date: new Date(curr),
              day: dayName,
              present: false, // Attendance was not marked by teachers
              leaveReason,
            });
            processedKeys.add(key);
          });
        }

        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      // Requirement 5: In date and day column, first date in top order (ascending chronological order)
      records.sort((a, b) => {
        const dDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dDiff !== 0) return dDiff;
        return (Number(a.periodNumber) || 0) - (Number(b.periodNumber) || 0);
      });

      // Requirement 7: Only include subjects that have at least 1 period assigned in records for this month
      const distinctSubjectIds = Array.from(new Set(records.map((r) => String(r.subjectId))));

      const subjectStats = distinctSubjectIds
        .flatMap((subId) => {
          const subRecords = records.filter((r) => String(r.subjectId) === subId);
          if (subRecords.length === 0) return [];

          const teacherGroups = Array.from(
            new Set(
              subRecords.map((r) => {
                const t = r.teacherName?.trim();
                return (t && t !== "—" && t !== "Unknown Teacher") ? t : "—";
              })
            )
          );

          if (teacherGroups.length > 1) {
            return teacherGroups.map((tName) => {
              const teacherRecords = subRecords.filter((r) => {
                const t = r.teacherName?.trim();
                const normalized = (t && t !== "—" && t !== "Unknown Teacher") ? t : "—";
                return normalized === tName;
              });
              const totalClass = teacherRecords.length;
              const present = teacherRecords.filter((r) => r.present).length;
              const absent = teacherRecords.filter((r) => !r.present).length;
              const percentage =
                totalClass > 0 ? `${((present / totalClass) * 100).toFixed(2)}%` : "0.00%";

              return {
                subjectId: subId,
                subjectName: subjectMap[subId] || "Subject",
                teacherName: tName !== "—" ? tName : "",
                teacherNames: tName !== "—" ? [tName] : [],
                totalClass,
                present,
                absent,
                percentage,
                records: teacherRecords,
              };
            });
          }

          const totalClass = subRecords.length;
          const present = subRecords.filter((r) => r.present).length;
          const absent = subRecords.filter((r) => !r.present).length;
          const percentage =
            totalClass > 0 ? `${((present / totalClass) * 100).toFixed(2)}%` : "0.00%";
          const tName = teacherGroups[0] || "";

          return [{
            subjectId: subId,
            subjectName: subjectMap[subId] || "Subject",
            teacherName: tName !== "—" ? tName : "",
            teacherNames: tName !== "—" ? [tName] : [],
            totalClass,
            present,
            absent,
            percentage,
            records: subRecords, // Records for drilldown
          }];
        })
        .filter((sub) => sub.totalClass > 0)
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName) || (a.teacherName || "").localeCompare(b.teacherName || ""));

      const totalClassCount = records.length;
      const presentCount = records.filter((r) => r.present).length;
      const absentCount = records.filter((r) => !r.present).length;
      const percentage =
        totalClassCount > 0
          ? `${((presentCount / totalClassCount) * 100).toFixed(2)}%`
          : "0.00%";

      return {
        _id: cId,
        classId: cId,
        name: cls.displayName || cls.name,
        originalName: cls.name,
        batchId: cls.batchId,
        batchName: cls.batchName,
        status: cls.status,
        totalClass: totalClassCount,
        present: presentCount,
        absent: absentCount,
        percentage,
        subjectStats,
        attendanceRecords: records,
      };
    });

    // 8. Sort formattedData to strictly match Students section order
    formattedData.sort((a, b) => {
      const classCompare = sortClasses(a, b, (item) => item.originalName || item.name);
      if (classCompare !== 0) return classCompare;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    // 9. Paginate and return
    const paginatedData =
      limit === Infinity
        ? formattedData
        : formattedData.slice(page * limit, (page + 1) * limit);

    return NextResponse.json(
      {
        classAttendances: paginatedData,
        pagination: {
          page,
          limit,
          total: formattedData.length,
          totalPages: limit === Infinity ? 1 : Math.ceil(formattedData.length / limit),
        },
        message: "Class attendance records synthesized successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching class attendances:", error);
    return apiResponse.error(error);
  }
}
