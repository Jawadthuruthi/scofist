import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import Attendance from '@/models/Attendance.js';
import TimeTable from '@/models/TimeTable.js';
import TeachersLeaveRecord from '@/models/TeachersLeaveRecord.js';
import Class from '@/models/Class.js';
import Settings from '@/models/Settings';
import DailyTimetableSnapshot from '@/models/DailyTimetableSnapshot.js';
import Subject from '@/models/Subject.js';
import User from '@/models/User.js';

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const month = parseInt(searchParams.get('month'), 10);
    const year = parseInt(searchParams.get('year'), 10);

    if (!classId || !month || !year) {
      return NextResponse.json(
        { message: 'classId, month, and year are required' },
        { status: 400 }
      );
    }

    const getDS = (date) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      // All dates in the system run on IST (+5:30)
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const y = istDate.getUTCFullYear();
      const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDS = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDS = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const todayDS = getDS(new Date());

    // Dates for Attendance and Leave query in UTC bounds matching the IST month
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth + 1, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000) - 1);
    const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));

    const [classInfo, timeTables, snapshots, attendancesRaw, leaveRecordsRaw, settings] = await Promise.all([
      Class.findById(classId).lean(),
      TimeTable.find({ classId }).populate('timeSlots.subjectId timeSlots.teacherId').lean(),
      DailyTimetableSnapshot.find({
        dateString: { $gte: startDS, $lte: endDS },
      }).lean(),
      Attendance.find({ classId, date: { $gte: startDate, $lte: endDate } })
        .populate({ path: 'subjectId', select: 'name' })
        .populate({ path: 'teacherId', select: 'name' })
        .lean(),
      TeachersLeaveRecord.find({ classId, date: { $gte: startDate, $lte: endDate } }).lean(),
      Settings.findOne({}).select('general').lean().catch(() => null),
    ]);

    const attendances = attendancesRaw || [];
    const leaveRecords = leaveRecordsRaw || [];

    // 1. Extract active live timetable slots (matching Today's Schedule on the dashboard: !slot.validTo)
    const liveActiveSlots = [];
    timeTables.forEach((tt) => {
      (tt.timeSlots || []).forEach((slot) => {
        if (!slot.validTo && slot.subjectId && slot.teacherId) {
          const sid = (slot.subjectId._id || slot.subjectId).toString();
          const tid = (slot.teacherId._id || slot.teacherId).toString();
          liveActiveSlots.push({
            subjectId: sid,
            teacherId: tid,
            subjectName: slot.subjectId.name || sid,
            teacherName: slot.teacherId.name || tid,
            periodNumber: slot.periodNumber,
            day: slot.day,
          });
        }
      });
    });

    // Map each subjectId to its current active live teacher(s)
    const activeTeachersBySub = {};
    liveActiveSlots.forEach((s) => {
      if (!activeTeachersBySub[s.subjectId]) {
        activeTeachersBySub[s.subjectId] = new Set();
      }
      activeTeachersBySub[s.subjectId].add(s.teacherId);
    });

    // Helper to resolve canonical accessor for any (sid, tid)
    // If a subject has a single current active teacher, any old/substitute teacher for that subject
    // maps to that active teacher's canonical column so today's schedule and past records align seamlessly.
    const getCanonicalAccessor = (sid, tid) => {
      const activeTids = activeTeachersBySub[sid];
      if (activeTids && activeTids.size > 0) {
        if (activeTids.has(tid)) {
          return `${sid}__${tid}`;
        }
        if (activeTids.size === 1) {
          const canonicalTid = Array.from(activeTids)[0];
          return `${sid}__${canonicalTid}`;
        }
      }
      return `${sid}__${tid}`;
    };

    const subjectTeacherPairs = {};
    const canonicalToTeacherIds = {};

    const registerPair = (sid, tid, sName, tName) => {
      const accessor = getCanonicalAccessor(sid, tid);
      const [cSid, cTid] = accessor.split('__');
      if (!subjectTeacherPairs[accessor]) {
        subjectTeacherPairs[accessor] = {
          subjectId: cSid,
          teacherId: cTid,
          subjectName: sName || cSid,
          teacherName: tName || cTid,
        };
      }
      if (!canonicalToTeacherIds[accessor]) {
        canonicalToTeacherIds[accessor] = new Set();
      }
      canonicalToTeacherIds[accessor].add(tid);
      canonicalToTeacherIds[accessor].add(cTid);
    };

    // Seed subjectTeacherPairs with current active slots
    liveActiveSlots.forEach((s) => {
      registerPair(s.subjectId, s.teacherId, s.subjectName, s.teacherName);
    });

    // Register attendances and mark lookup set
    const markedAttendances = new Set();
    attendances.forEach((att) => {
      if (!att.subjectId || !att.teacherId) return;
      const sid = (att.subjectId._id || att.subjectId).toString();
      const tid = (att.teacherId._id || att.teacherId).toString();
      registerPair(sid, tid, att.subjectId.name, att.teacherId.name);
      const canonicalAccessor = getCanonicalAccessor(sid, tid);
      const attDS = getDS(att.date);
      markedAttendances.add(`${attDS}-${canonicalAccessor}`);
    });

    // Leave map: `${isoDate}-${teacherId}-${periodNumber}` -> leaveReason
    const leaveMap = {};
    leaveRecords.forEach((leave) => {
      const lDS = getDS(leave.date);
      leaveMap[`${lDS}-${leave.teacherId}-${leave.periodNumber}`] = leave.leaveReason;
    });

    // Build non-working days map
    const nonWorkingDaysMap = {};
    snapshots.forEach((snap) => {
      if (!snap.isWorkingDay) {
        const d = parseInt(snap.dateString.split('-')[2], 10);
        if (!(d in nonWorkingDaysMap)) nonWorkingDaysMap[d] = '';
      }
    });

    try {
      const log = settings?.general?.nonWorkingDaysLog || [];
      const legacyDates = settings?.general?.nonWorkingDays || [];
      const currentOccasion = settings?.general?.occasion || '';
      const isCurrentlyNonWorking = settings?.general?.isWorkingDay === false;

      log.forEach((entry) => {
        const d = new Date(entry.date);
        if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1) {
          const day = d.getUTCDate();
          nonWorkingDaysMap[day] = entry.occasion || nonWorkingDaysMap[day] || '';
        }
      });

      legacyDates.forEach((dt) => {
        const d = new Date(dt);
        if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1) {
          const day = d.getUTCDate();
          if (!(day in nonWorkingDaysMap)) {
            nonWorkingDaysMap[day] = '';
          }
        }
      });

      if (isCurrentlyNonWorking && legacyDates.length > 0) {
        let latestDate = new Date(Math.max(...legacyDates.map((d) => new Date(d).getTime())));
        latestDate.setUTCHours(0, 0, 0, 0);

        const now = new Date();
        const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        todayIST.setUTCHours(0, 0, 0, 0);

        for (let i = 1; i <= daysInMonth; i++) {
          const curr = new Date(Date.UTC(year, month - 1, i));
          if (curr >= latestDate && curr <= todayIST) {
            if (!(i in nonWorkingDaysMap)) {
              nonWorkingDaysMap[i] = currentOccasion || '';
            }
          }
        }
      }

      let classSection = classInfo?.section || '';
      let className = classInfo?.name || '';
      if (classSection.toLowerCase().includes('senior') || className.toLowerCase().includes('senior')) {
        classSection = 'Senior Da-awa';
      } else if (classSection.toLowerCase().includes('junior') || className.toLowerCase().includes('junior')) {
        classSection = 'Junior Da-awa';
      }

      if (classSection === 'Senior Da-awa' || classSection === 'Junior Da-awa') {
        const section = classSection === 'Senior Da-awa' ? 'seniorDaawa' : 'juniorDaawa';
        const sectionLog = settings?.general?.[`${section}NonWorkingDaysLog`] || [];
        const specificDates = settings?.general?.[`${section}NonWorkingDays`] || [];
        const specificOccasion = settings?.general?.[section]?.occasion || 'Holiday';

        sectionLog.forEach((entry) => {
          const d = new Date(entry.date);
          if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1) {
            const day = d.getUTCDate();
            if (!(day in nonWorkingDaysMap) || !nonWorkingDaysMap[day]) {
              nonWorkingDaysMap[day] = entry.occasion || specificOccasion;
            }
          }
        });

        specificDates.forEach((dt) => {
          const d = new Date(dt);
          if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1) {
            const day = d.getUTCDate();
            if (!(day in nonWorkingDaysMap) || !nonWorkingDaysMap[day]) {
              nonWorkingDaysMap[day] = specificOccasion;
            }
          }
        });

        const isSectionOff = settings?.general?.[section]?.isWorkingDay === false;
        if (isSectionOff && specificDates.length > 0) {
          let latestDate = new Date(Math.max(...specificDates.map((d) => new Date(d).getTime())));
          latestDate.setUTCHours(0, 0, 0, 0);

          const now = new Date();
          const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
          todayIST.setUTCHours(0, 0, 0, 0);

          for (let i = 1; i <= daysInMonth; i++) {
            const curr = new Date(Date.UTC(year, month - 1, i));
            if (curr >= latestDate && curr <= todayIST) {
              if (!(i in nonWorkingDaysMap) || !nonWorkingDaysMap[i]) {
                nonWorkingDaysMap[i] = specificOccasion;
              }
            }
          }
        }
      }
    } catch (settingsErr) {
      console.error('Failed to fetch non-working days from settings:', settingsErr);
    }

    // Historical fallback parameters
    let earliestValidFrom = '9999-12-31';
    timeTables.forEach((tt) => {
      tt.timeSlots.forEach((slot) => {
        if (slot.validFrom) {
          const ds = getDS(slot.validFrom);
          if (ds < earliestValidFrom) earliestValidFrom = ds;
        }
      });
    });
    if (earliestValidFrom === '9999-12-31') earliestValidFrom = '2026-05-01';

    const snapshotByDate = {};
    snapshots.forEach((snap) => {
      snapshotByDate[snap.dateString] = snap;
    });

    // 2. Build daily schedule map
    // For today and future dates (isoDate >= todayDS): always use live active slots matching Today's Schedule on the dashboard.
    // For past dates (isoDate < todayDS): use DailyTimetableSnapshot (or historical fallback), mapped to canonical accessors.
    const dayScheduleByDate = {};

    dates.forEach((date) => {
      const isoDate = getDS(date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const [y, m, d] = isoDate.split('-');
      const dayName = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

      dayScheduleByDate[isoDate] = {};

      if (dayName === 'Friday') {
        return; // Non-working day across the institution
      }

      if (isoDate >= todayDS) {
        // Today or future dates: live active timetable
        liveActiveSlots
          .filter((s) => s.day === dayName)
          .forEach((s) => {
            const accessor = `${s.subjectId}__${s.teacherId}`;
            if (!dayScheduleByDate[isoDate][accessor]) {
              dayScheduleByDate[isoDate][accessor] = [];
            }
            if (!dayScheduleByDate[isoDate][accessor].includes(s.periodNumber)) {
              dayScheduleByDate[isoDate][accessor].push(s.periodNumber);
            }
          });
      } else {
        // Past dates: snapshot if exists
        const snap = snapshotByDate[isoDate];
        if (snap) {
          if (!snap.isWorkingDay) return;
          const daySlots = (snap.slots || []).filter(
            (s) => (s.classId?._id || s.classId)?.toString() === classId
          );
          daySlots.forEach((s) => {
            if (!s.subjectId || !s.teacherId) return;
            const sid = (s.subjectId._id || s.subjectId).toString();
            const tid = (s.teacherId._id || s.teacherId).toString();
            registerPair(sid, tid, s.subjectId?.name, s.teacherId?.name);
            const accessor = getCanonicalAccessor(sid, tid);
            if (!dayScheduleByDate[isoDate][accessor]) {
              dayScheduleByDate[isoDate][accessor] = [];
            }
            if (!dayScheduleByDate[isoDate][accessor].includes(s.periodNumber)) {
              dayScheduleByDate[isoDate][accessor].push(s.periodNumber);
            }
          });
        } else {
          // Historical fallback for past dates without snapshot
          timeTables.forEach((tt) => {
            (tt.timeSlots || []).forEach((s) => {
              if (s.day !== dayName || !s.subjectId || !s.teacherId) return;
              const sid = (s.subjectId._id || s.subjectId).toString();
              const tid = (s.teacherId._id || s.teacherId).toString();
              const vf = s.validFrom ? getDS(s.validFrom) : earliestValidFrom;
              const vt = s.validTo ? getDS(s.validTo) : null;
              const isStarted = !vf || vf <= isoDate;
              const isNotEnded = !vt || vt > isoDate;
              if (isStarted && isNotEnded) {
                const sName = s.subjectId?.name || sid;
                const tName = s.teacherId?.name || tid;
                registerPair(sid, tid, sName, tName);
                const accessor = getCanonicalAccessor(sid, tid);
                if (!dayScheduleByDate[isoDate][accessor]) {
                  dayScheduleByDate[isoDate][accessor] = [];
                }
                if (!dayScheduleByDate[isoDate][accessor].includes(s.periodNumber)) {
                  dayScheduleByDate[isoDate][accessor].push(s.periodNumber);
                }
              }
            });
          });
        }
      }
    });

    // Resolve any remaining missing names
    const missingSubIds = Object.values(subjectTeacherPairs)
      .filter((p) => !p.subjectName || p.subjectName === p.subjectId)
      .map((p) => p.subjectId);
    const missingTeachIds = Object.values(subjectTeacherPairs)
      .filter((p) => !p.teacherName || p.teacherName === p.teacherId)
      .map((p) => p.teacherId);

    const [resolvedSubs, resolvedTeachs] = await Promise.all([
      missingSubIds.length > 0
        ? Subject.find({ _id: { $in: [...new Set(missingSubIds)] } }).select('name').lean()
        : Promise.resolve([]),
      missingTeachIds.length > 0
        ? User.find({ _id: { $in: [...new Set(missingTeachIds)] } }).select('name').lean()
        : Promise.resolve([]),
    ]);

    resolvedSubs.forEach((s) => {
      const sid = s._id.toString();
      Object.values(subjectTeacherPairs).forEach((p) => {
        if (p.subjectId === sid) p.subjectName = s.name;
      });
    });
    resolvedTeachs.forEach((t) => {
      const tid = t._id.toString();
      Object.values(subjectTeacherPairs).forEach((p) => {
        if (p.teacherId === tid) p.teacherName = t.name;
      });
    });

    // 3. Sort pairs: Core subjects first, Major subjects next, then alphabetical
    const coreSubjects = classInfo?.coreSubjects?.map((s) => s.toString()) || [];
    const majorSubjects = classInfo?.majorSubjects?.map((s) => s.toString()) || [];

    const uniquePairs = Object.values(subjectTeacherPairs).sort((a, b) => {
      const aIsCore = coreSubjects.includes(a.subjectId);
      const bIsCore = coreSubjects.includes(b.subjectId);
      const aIsMajor = majorSubjects.includes(a.subjectId);
      const bIsMajor = majorSubjects.includes(b.subjectId);
      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      if (aIsMajor && !bIsMajor) return 1;
      if (!aIsMajor && bIsMajor) return -1;
      return a.subjectName.localeCompare(b.subjectName);
    });

    const columns = [
      { Header: 'Date', accessor: 'date' },
      ...uniquePairs.map((pair) => ({
        Header: `${pair.subjectName}\n(${pair.teacherName})`,
        accessor: `${pair.subjectId}-${pair.teacherId}`,
        subjectId: pair.subjectId,
        teacherId: pair.teacherId,
        subjectName: pair.subjectName,
        teacherName: pair.teacherName,
      })),
    ];

    // 4. Build table rows
    const tableData = dates.map((date) => {
      const isoDate = getDS(date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const [y, m, d] = isoDate.split('-');
      const dayName = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      const isUpcoming = isoDate > todayDS;
      const dateKey = date.getDate();
      const isNonWorkingDay = dayName !== 'Friday' && (dateKey in nonWorkingDaysMap);

      const row = {
        date: isoDate,
        dayName,
        displayDate: `${date.getDate()} ${date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}`,
        isNonWorkingDay,
        occasion: nonWorkingDaysMap[dateKey] || '',
      };

      uniquePairs.forEach((pair) => {
        const accessor = `${pair.subjectId}-${pair.teacherId}`;
        const internalAccessor = `${pair.subjectId}__${pair.teacherId}`;
        const scheduledPeriods = dayScheduleByDate[isoDate]?.[internalAccessor] || [];
        const isMarked = markedAttendances.has(`${isoDate}-${internalAccessor}`);

        if (isUpcoming) {
          row[accessor] = scheduledPeriods.length > 0
            ? { status: 'UPCOMING_PERIOD', message: 'Upcoming' }
            : { status: 'NO_PERIOD', message: 'No Period' };
          return;
        }

        if (scheduledPeriods.length === 0) {
          row[accessor] = isMarked
            ? { status: 'MARKED', message: 'Marked' }
            : { status: 'NO_PERIOD', message: 'No Period' };
        } else {
          const teacherIdsToCheck = Array.from(
            canonicalToTeacherIds[internalAccessor] || [pair.teacherId]
          );
          let leavePeriod = null;
          let leaveReason = null;
          for (const pn of scheduledPeriods) {
            for (const tid of teacherIdsToCheck) {
              if (leaveMap[`${isoDate}-${tid}-${pn}`]) {
                leavePeriod = pn;
                leaveReason = leaveMap[`${isoDate}-${tid}-${pn}`];
                break;
              }
            }
            if (leavePeriod) break;
          }

          if (leavePeriod) {
            row[accessor] = { status: 'LEAVE', message: leaveReason, leaveReason };
          } else if (isMarked) {
            row[accessor] = { status: 'MARKED', message: 'Marked' };
          } else if (isNonWorkingDay) {
            row[accessor] = { status: 'NO_PERIOD', message: 'No Period' };
          } else {
            row[accessor] = { status: 'NOT_MARKED', message: 'Not Marked' };
          }
        }
      });

      return row;
    });

    // 5. Filter columns so that ONLY subjects with at least one active slot, marked attendance, or leave are returned
    const activeColumns = [
      columns[0], // Date column
      ...columns.slice(1).filter((col) =>
        tableData.some(
          (row) => row[col.accessor]?.status && row[col.accessor]?.status !== 'NO_PERIOD'
        )
      ),
    ];

    return NextResponse.json({
      tableData,
      columns: activeColumns,
    });
  } catch (error) {
    console.error('Error in /api/attendance-table:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
