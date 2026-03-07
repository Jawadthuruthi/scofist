import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import Attendance from '@/models/Attendance.js';
import TimeTable from '@/models/TimeTable.js';
import TeachersLeaveRecord from '@/models/TeachersLeaveRecord.js';

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

    // 1. Fetch TimeTable for the class to get all subject-teacher pairs
    const timeTables = await TimeTable.find({ classId })
      .populate({
        path: 'timeSlots.subjectId',
        select: 'name',
      })
      .populate({
        path: 'timeSlots.teacherId',
        select: 'name',
      });

    // Extract unique subject-teacher pairs with schedule info
    const subjectTeacherPairs = {};
    const dayScheduleMap = {}; // day -> subjectId-teacherId -> [periodNumbers]

    if (timeTables) {
      timeTables.forEach((tt) => {
        tt.timeSlots.forEach((slot) => {
          if (slot.subjectId && slot.teacherId) {
            const sid = slot.subjectId._id.toString();
            const tid = slot.teacherId._id.toString();
            const key = `${sid}-${tid}`;

            // Store subject-teacher info
            if (!subjectTeacherPairs[key]) {
              subjectTeacherPairs[key] = {
                subjectId: sid,
                subjectName: slot.subjectId.name,
                teacherId: tid,
                teacherName: slot.teacherId.name,
              };
            }

            // Store schedule by day
            if (!dayScheduleMap[slot.day]) {
              dayScheduleMap[slot.day] = {};
            }
            if (!dayScheduleMap[slot.day][key]) {
              dayScheduleMap[slot.day][key] = [];
            }
            dayScheduleMap[slot.day][key].push(slot.periodNumber);
          }
        });
      });
    }

    const uniquePairs = Object.values(subjectTeacherPairs).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    );

    // 2. Fetch marked attendances for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await Attendance.find({
      classId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'subjectId',
        select: 'name',
      })
      .populate({
        path: 'teacherId',
        select: 'name',
      });

    // Create lookup set: date-subjectId-teacherId
    const markedAttendances = new Set();
    attendances.forEach((att) => {
      if (att.subjectId && att.teacherId) {
        const isoDate = new Date(att.date).toISOString().split('T')[0];
        const key = `${isoDate}-${att.subjectId._id.toString()}-${att.teacherId._id.toString()}`;
        markedAttendances.add(key);
      }
    });

    // 3. Fetch teacher leave records for the month
    const leaveRecords = await TeachersLeaveRecord.find({
      classId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Create leave lookup: date-teacherId-periodNumber -> leaveReason
    const leaveMap = {};
    leaveRecords.forEach((leave) => {
      const isoDate = new Date(leave.date).toISOString().split('T')[0];
      const key = `${isoDate}-${leave.teacherId}-${leave.periodNumber}`;
      leaveMap[key] = leave.leaveReason;
    });

    // 4. Create columns for the table
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

    // 5. Create table data with status indicators
    const daysInMonth = endDate.getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));

    const tableData = dates.map((date) => {
      const isoDate = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

      const row = {
        date: isoDate,
        dayName: dayName,
        displayDate: `${date.getDate()} ${date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}`,
      };

      uniquePairs.forEach((pair) => {
        const accessor = `${pair.subjectId}-${pair.teacherId}`;
        const attendanceLookupKey = `${isoDate}-${pair.subjectId}-${pair.teacherId}`;

        // Check if teacher has any period on this day for this subject
        const hasPeriodOnDay = dayScheduleMap[dayName] && dayScheduleMap[dayName][accessor];

        if (!hasPeriodOnDay) {
          // No period scheduled
          row[accessor] = {
            status: 'NO_PERIOD',
            message: 'No Period',
          };
        } else {
          // Has period(s) scheduled
          const scheduledPeriods = dayScheduleMap[dayName][accessor];

          // Check for leave on any of the scheduled periods
          const leavePeriod = scheduledPeriods.find((periodNum) => {
            const leaveKey = `${isoDate}-${pair.teacherId}-${periodNum}`;
            return leaveMap[leaveKey];
          });

          if (leavePeriod) {
            const leaveKey = `${isoDate}-${pair.teacherId}-${leavePeriod}`;
            row[accessor] = {
              status: 'LEAVE',
              message: leaveMap[leaveKey],
              leaveReason: leaveMap[leaveKey],
            };
          } else if (markedAttendances.has(attendanceLookupKey)) {
            // Attendance marked
            row[accessor] = {
              status: 'MARKED',
              message: '✓ Marked',
            };
          } else {
            // Period exists but attendance not marked
            row[accessor] = {
              status: 'NOT_MARKED',
              message: '✗ Not Marked',
            };
          }
        }
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
