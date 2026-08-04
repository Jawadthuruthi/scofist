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
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));

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
      // All dates in the system run on IST
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const y = istDate.getUTCFullYear();
      const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));

    const [timeTables, snapshots, attendancesRaw, leaveRecordsRaw] = await Promise.all([
      TimeTable.find({ classId }).populate('timeSlots.subjectId timeSlots.teacherId'),
      DailyTimetableSnapshot.find({
        classId,
        dateString: { $gte: startDate.toISOString().split('T')[0], $lte: endDate.toISOString().split('T')[0] },
      }),
      Attendance.find({ classId, date: { $gte: startDate, $lte: endDate } })
        .populate({ path: 'subjectId', select: 'name' })
        .populate({ path: 'teacherId', select: 'name' }),
      TeachersLeaveRecord.find({ classId, date: { $gte: startDate, $lte: endDate } }),
    ]);

    const attendances = attendancesRaw || [];
    const leaveRecords = leaveRecordsRaw || [];

    // We no longer calculate a single official teacher per subject.
    // Instead, we will map substitute attendances back to the teacher scheduled for that specific day.
    
    const teacherNameMap = {};
    const subjectNameMap = {};
    const subjectsTaughtThisMonth = new Set();
    
    attendances.forEach((att) => {
      if (att.subjectId && att.teacherId) {
        const sid = att.subjectId._id.toString();
        const tid = att.teacherId._id.toString();
        
        subjectNameMap[sid] = att.subjectId.name;
        teacherNameMap[tid] = att.teacherId.name;
        subjectsTaughtThisMonth.add(sid);
      }
    });

    const fallbackDayScheduleMap = {};
    const fallbackSubjectNames = {};
    const fallbackTeacherNames = {};
    const fallbackPairsMap = {};
    const knownSubjects = new Set();
    
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

    timeTables.forEach((tt) => {
      tt.timeSlots.forEach((slot) => {
        const sid = slot.subjectId?._id?.toString() || slot.subjectId?.toString();
        let tid = slot.teacherId?._id?.toString() || slot.teacherId?.toString();
        
        if (!sid || !tid) return;
        knownSubjects.add(sid);
        
        const key = `${sid}__${tid}`;

        fallbackPairsMap[key] = { sid, tid };
        if (subjectNameMap[sid] || slot.subjectId?.name) fallbackSubjectNames[sid] = subjectNameMap[sid] || slot.subjectId.name;
        if (teacherNameMap[tid] || slot.teacherId?.name) fallbackTeacherNames[tid] = teacherNameMap[tid] || slot.teacherId.name;

        if (!fallbackDayScheduleMap[slot.day]) fallbackDayScheduleMap[slot.day] = {};
        if (!fallbackDayScheduleMap[slot.day][key]) fallbackDayScheduleMap[slot.day][key] = [];
        fallbackDayScheduleMap[slot.day][key].push({
          periodNumber: slot.periodNumber,
          validFrom: slot.validFrom ? getDS(slot.validFrom) : null,
          validTo: slot.validTo ? getDS(slot.validTo) : null,
        });
      });
    });

    const snapshotDaySchedule = {};
    const snapshotSubjectIds = new Set();
    const snapshotTeacherIds = new Set();

    snapshots.forEach((snap) => {
      const daySlots = (snap.slots || []).filter((s) => s.classId?.toString() === classId);
      snapshotDaySchedule[snap.dateString] = {};
      daySlots.forEach((s) => {
        if (!s.subjectId || !s.teacherId) return;
        const sid = s.subjectId._id?.toString() || s.subjectId.toString();
        const tid = s.teacherId._id?.toString() || s.teacherId.toString();
        const accessor = `${sid}__${tid}`;
        snapshotSubjectIds.add(sid);
        snapshotTeacherIds.add(tid);
        if (!snapshotDaySchedule[snap.dateString][accessor]) {
          snapshotDaySchedule[snap.dateString][accessor] = [];
        }
        snapshotDaySchedule[snap.dateString][accessor].push(s.periodNumber);
      });
    });

    const snapshotByDate = {};
    snapshots.forEach((snap) => { snapshotByDate[snap.dateString] = snap; });

    const subjectTeacherPairs = {};

    snapshots.forEach((snap) => {
      const daySlots = (snap.slots || []).filter((s) => s.classId?.toString() === classId);
      daySlots.forEach((s) => {
        if (!s.subjectId || !s.teacherId) return;
        const sid = s.subjectId._id?.toString() || s.subjectId.toString();
        const tid = s.teacherId._id?.toString() || s.teacherId.toString();
        const accessor = `${sid}__${tid}`;
        if (!subjectTeacherPairs[accessor]) {
          subjectTeacherPairs[accessor] = {
            subjectId: sid,
            teacherId: tid,
            subjectName: s.subjectId?.name || sid,
            teacherName: s.teacherId?.name || tid,
          };
        }
      });
    });

    dates.forEach((date) => {
      const isoDate = getDS(date);
      if (snapshotByDate[isoDate]) return;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const [y, m, d] = isoDate.split('-');
      const dayName = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

      Object.entries(fallbackDayScheduleMap[dayName] || {}).forEach(([accessor, slots]) => {
        const sid = accessor.split('__')[0];
        const hasHistoricalProof = subjectsTaughtThisMonth.has(sid);
        
        const active = slots.some((s) => {
          const effectiveValidFrom = s.validFrom || earliestValidFrom;
          const isOfficiallyActive = (effectiveValidFrom <= isoDate) && (!s.validTo || s.validTo > isoDate);
          const isHistoricallyRestored = hasHistoricalProof && (!s.validTo || s.validTo > isoDate);
          return isOfficiallyActive || isHistoricallyRestored;
        });
        
        if (active) {
          if (!subjectTeacherPairs[accessor]) {
            const { sid, tid } = fallbackPairsMap[accessor];
            subjectTeacherPairs[accessor] = {
              subjectId: sid,
              teacherId: tid,
              subjectName: fallbackSubjectNames[sid] || sid,
              teacherName: fallbackTeacherNames[tid] || tid,
            };
          }
        }
      });
    });

    const [resolvedSubjects, resolvedTeachers] = await Promise.all([
      snapshotSubjectIds.size > 0
        ? Subject.find({ _id: { $in: [...snapshotSubjectIds] } }).select('name').lean()
        : Promise.resolve([]),
      snapshotTeacherIds.size > 0
        ? User.find({ _id: { $in: [...snapshotTeacherIds] } }).select('name').lean()
        : Promise.resolve([]),
    ]);

    const resolvedSubjectNames = {};
    resolvedSubjects.forEach((s) => { resolvedSubjectNames[s._id.toString()] = s.name; });
    const resolvedTeacherNames = {};
    resolvedTeachers.forEach((t) => { resolvedTeacherNames[t._id.toString()] = t.name; });

    Object.values(subjectTeacherPairs).forEach((pair) => {
      if (!pair.subjectName || pair.subjectName === pair.subjectId) {
        pair.subjectName = resolvedSubjectNames[pair.subjectId] || fallbackSubjectNames[pair.subjectId] || pair.subjectId;
      }
      if (!pair.teacherName || pair.teacherName === pair.teacherId) {
        pair.teacherName = resolvedTeacherNames[pair.teacherId] || fallbackTeacherNames[pair.teacherId] || pair.teacherId;
      }
    });

    const markedAttendances = new Set();
    const attendancePairsToLookup = new Set();
    
    attendances.forEach((att) => {
      if (att.subjectId && att.teacherId) {
        const isoDate = getDS(new Date(att.date));
        const sid = att.subjectId._id.toString();
        let tid = att.teacherId._id.toString();
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const [y, m, d] = isoDate.split('-');
        const dayName = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

        let scheduledTid = tid;
        
        let foundInSnap = false;
        if (snapshotByDate[isoDate] && snapshotDaySchedule[isoDate]) {
            for (const [key, periods] of Object.entries(snapshotDaySchedule[isoDate])) {
                const [schSid, schTid] = key.split('__');
                if (schSid === sid && periods.length > 0) {
                    scheduledTid = schTid;
                    foundInSnap = true;
                    break;
                }
            }
        }
        
        if (!foundInSnap) {
            const daySchedule = fallbackDayScheduleMap[dayName] || {};
            for (const [key, slots] of Object.entries(daySchedule)) {
                const [schSid, schTid] = key.split('__');
                if (schSid === sid) {
                    const isActive = slots.some((s) => {
                        const effectiveValidFrom = s.validFrom || earliestValidFrom;
                        return (effectiveValidFrom <= isoDate) && (!s.validTo || s.validTo > isoDate);
                    });
                    if (isActive) {
                        scheduledTid = schTid;
                        break;
                    }
                }
            }
        }
        
        const accessor = `${sid}__${scheduledTid}`;
        markedAttendances.add(`${isoDate}-${sid}-${scheduledTid}`);

        if (!subjectTeacherPairs[accessor]) {
          subjectTeacherPairs[accessor] = {
            subjectId: sid,
            teacherId: scheduledTid,
            subjectName: att.subjectId.name,
            teacherName: teacherNameMap[scheduledTid] || fallbackTeacherNames[scheduledTid] || att.teacherId.name,
          };
        }
      }
    });

    const leaveMap = {};
    leaveRecords.forEach((leave) => {
      const isoDate = getDS(new Date(leave.date));
      leaveMap[`${isoDate}-${leave.teacherId}-${leave.periodNumber}`] = leave.leaveReason;
    });

    const nonWorkingDaysMap = {};

    snapshots.forEach((snap) => {
      if (!snap.isWorkingDay) {
        const d = parseInt(snap.dateString.split('-')[2], 10);
        if (!(d in nonWorkingDaysMap)) nonWorkingDaysMap[d] = '';
      }
    });

    try {
      const settings = await Settings.findOne({}).select('general').lean();
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
    } catch (settingsErr) {
      console.error('Failed to fetch non-working days from settings:', settingsErr);
    }

    const classInfo = await Class.findById(classId).lean();
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tableData = dates.map((date) => {
      const isoDate = getDS(date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const [y, m, d] = isoDate.split('-');
      const dayName = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      const isUpcoming = date > today;
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
        const attendanceLookupKey = `${isoDate}-${pair.subjectId}-${pair.teacherId}`;

        let scheduledPeriods = [];

        if (snapshotByDate[isoDate]) {
          scheduledPeriods = snapshotDaySchedule[isoDate]?.[internalAccessor] || [];
        } else {
          const fallbackSlots = fallbackDayScheduleMap[dayName]?.[internalAccessor] || [];
          const sid = pair.subjectId;
          const hasHistoricalProof = subjectsTaughtThisMonth.has(sid);

          scheduledPeriods = fallbackSlots
            .filter((s) => {
              const effectiveValidFrom = s.validFrom || earliestValidFrom;
              const isOfficiallyActive = (effectiveValidFrom <= isoDate) && (!s.validTo || s.validTo > isoDate);
              const isHistoricallyRestored = hasHistoricalProof && (!s.validTo || s.validTo > isoDate);
              return isOfficiallyActive || isHistoricallyRestored;
            })
            .map((s) => s.periodNumber);
        }

        if (isUpcoming) {
          row[accessor] = scheduledPeriods.length > 0
            ? { status: 'UPCOMING_PERIOD', message: 'Upcoming' }
            : { status: 'NO_PERIOD', message: 'No Period' };
          return;
        }

        if (scheduledPeriods.length === 0) {
          row[accessor] = markedAttendances.has(attendanceLookupKey)
            ? { status: 'MARKED', message: 'Marked' }
            : { status: 'NO_PERIOD', message: 'No Period' };
        } else {
          const leavePeriod = scheduledPeriods.find((pn) =>
            leaveMap[`${isoDate}-${pair.teacherId}-${pn}`]
          );
          if (leavePeriod) {
            const reason = leaveMap[`${isoDate}-${pair.teacherId}-${leavePeriod}`];
            row[accessor] = { status: 'LEAVE', message: reason, leaveReason: reason };
          } else if (markedAttendances.has(attendanceLookupKey)) {
            row[accessor] = { status: 'MARKED', message: 'Marked' };
          } else {
            row[accessor] = { status: 'NOT_MARKED', message: 'Not Marked' };
          }
        }
        
        // Debug lines removed
      });

      return row;
    });

    return NextResponse.json({ tableData, columns });
  } catch (error) {
    console.error('Error in /api/attendance-table:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
