import Attendance from "@/models/Attendance";
import TimeTable from "@/models/TimeTable";
import TeacherAttendance from "@/models/TeacherAttendance";

/**
 * Automatically marks teacher attendance when they create a student attendance record
 * This function should be called after creating a new student attendance record
 * @param {Object} studentAttendance - The student attendance record that was created
 * @returns {Promise<Object>} The created or updated teacher attendance record
 */
export const markTeacherAttendanceFromStudentAttendance = async (
  studentAttendance
) => {
  try {
    const { teacherId, date, classId, batchId, subjectId, periodNumber, day } =
      studentAttendance;

    // Find teacher attendance record
    let teacherAttendance = await TeacherAttendance.findOne({
      teacherId,
    });

    if (!teacherAttendance) {
      teacherAttendance = new TeacherAttendance({
        teacherId,
        attendanceRecords: [],
      });
    }

    // Check if this period is already recorded for this date
    const existingRecordIndex = teacherAttendance.attendanceRecords.findIndex(
      (record) =>
        record.classId.toString() === classId.toString() &&
        record.batchId.toString() === batchId.toString() &&
        record.subjectId.toString() === subjectId.toString() &&
        record.periodNumber === periodNumber &&
        record.day === day &&
        record.date === date
    );

    // If found, update it, otherwise add new record
    if (existingRecordIndex >= 0) {
      teacherAttendance.attendanceRecords[existingRecordIndex].present = true;
      teacherAttendance.attendanceRecords[existingRecordIndex].markedAt =
        new Date();
    } else {
      teacherAttendance.attendanceRecords.push({
        classId,
        batchId,
        subjectId,
        periodNumber,
        day,
        date,
        present: true,
        autoMarked: true,
        markedAt: new Date(),
      });
    }

    await teacherAttendance.save();
    return teacherAttendance;
  } catch (error) {
    console.error("Error marking teacher attendance:", error);
    throw error;
  }
};

/**
 * Automatically mark teachers as absent for all classes where attendance wasn't taken
 * This function should be scheduled to run at the end of each day
 * @param {String} date - The date to check for absences (YYYY-MM-DD)
 * @returns {Promise<Object>} Result of the operation
 */

export const markAbsentTeachers = async (date) => {
  try {
    // Get day of the week from date using IST
    const dayObj = new Date(date);
    // No adjustment needed here since we're passing an ISO date string
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const day = days[dayObj.getDay()];

    console.log(`Processing day: ${day}, date: ${date}`);

    // Get all timetables for this day - use projection to limit returned fields
    const timeTables = await TimeTable.find(
      {
        "timeSlots.day": day,
      },
      {
        "timeSlots.$": 1,
        classId: 1,
      }
    ).populate("classId", "batchId");

    console.log(`Found ${timeTables.length} timetables for ${day}`);

    // Create a map to collect all possible entries before database operations
    const attendanceEntriesToCheck = [];

    // First loop: collect all entries to check
    for (const timeTable of timeTables) {
      if (!timeTable.classId) continue;

      const classId = timeTable.classId._id;
      const batchId = timeTable.classId.batchId;

      const relevantTimeSlots = timeTable.timeSlots.filter(
        (slot) => slot.day === day && slot.teacherId && slot.subjectId
      );

      for (const slot of relevantTimeSlots) {
        attendanceEntriesToCheck.push({
          classId,
          batchId,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          periodNumber: slot.periodNumber,
          day,
          date,
        });
      }
    }

    console.log(
      `Collected ${attendanceEntriesToCheck.length} potential attendance entries to check`
    );

    // Check which entries have no attendance in bulk
    const existingAttendances = await Attendance.find(
      {
        $or: attendanceEntriesToCheck.map((entry) => ({
          classId: entry.classId,
          batchId: entry.batchId,
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
          periodNumber: entry.periodNumber,
          day,
          date,
        })),
      },
      { teacherId: 1, subjectId: 1, classId: 1, batchId: 1, periodNumber: 1 }
    );

    // Create a lookup map for existing attendance records
    const existingAttendanceMap = new Map();
    existingAttendances.forEach((att) => {
      const key = `${att.teacherId}-${att.subjectId}-${att.classId}-${att.batchId}-${att.periodNumber}`;
      existingAttendanceMap.set(key, true);
    });

    // Find entries with no attendance
    const missingAttendances = attendanceEntriesToCheck.filter((entry) => {
      const key = `${entry.teacherId}-${entry.subjectId}-${entry.classId}-${entry.batchId}-${entry.periodNumber}`;
      return !existingAttendanceMap.has(key);
    });

    console.log(
      `Found ${missingAttendances.length} missing attendance records`
    );

    // Group by teacherId to reduce database operations
    const teacherAttendancesToUpdate = new Map();

    for (const entry of missingAttendances) {
      if (!teacherAttendancesToUpdate.has(entry.teacherId)) {
        const teacherAttendance = await TeacherAttendance.findOne({
          teacherId: entry.teacherId,
        });

        teacherAttendancesToUpdate.set(
          entry.teacherId,
          teacherAttendance ||
            new TeacherAttendance({
              teacherId: entry.teacherId,
              attendanceRecords: [],
            })
        );
      }

      const teacherAttendance = teacherAttendancesToUpdate.get(entry.teacherId);

      // Check if this period is already recorded for this date
      const dateToCompare = new Date(date).toISOString().split("T")[0];

      const existingRecordIndex = teacherAttendance.attendanceRecords.findIndex(
        (record) =>
          record.classId.toString() === entry.classId.toString() &&
          record.batchId.toString() === entry.batchId.toString() &&
          record.subjectId.toString() === entry.subjectId.toString() &&
          record.periodNumber === entry.periodNumber &&
          record.day === day &&
          new Date(record.date).toISOString().split("T")[0] === dateToCompare
      );

      // If found, update it, otherwise add new record
      if (existingRecordIndex >= 0) {
        teacherAttendance.attendanceRecords[
          existingRecordIndex
        ].present = false;
        teacherAttendance.attendanceRecords[existingRecordIndex].markedAt =
          new Date();
      } else {
        teacherAttendance.attendanceRecords.push({
          classId: entry.classId,
          batchId: entry.batchId,
          subjectId: entry.subjectId,
          periodNumber: entry.periodNumber,
          day,
          date,
          present: false,
          autoMarked: true,
          markedAt: new Date(),
        });
      }
    }

    // Save all teacher attendance documents in bulk
    const savePromises = [];
    for (const [_, teacherAttendance] of teacherAttendancesToUpdate.entries()) {
      savePromises.push(teacherAttendance.save());
    }

    // Process saves in batches to prevent MongoDB connection exhaustion
    const batchSize = 50;
    for (let i = 0; i < savePromises.length; i += batchSize) {
      const batch = savePromises.slice(i, i + batchSize);
      await Promise.all(batch);
      console.log(
        `Processed batch ${i / batchSize + 1} of ${Math.ceil(
          savePromises.length / batchSize
        )}`
      );
    }

    return {
      success: true,
      message: "Absent teachers marked successfully",
      processedCount: teacherAttendancesToUpdate.size,
      date: date,
      day: day,
    };
  } catch (error) {
    console.error("Error marking absent teachers:", error);
    throw error;
  }
};

/**
 * Get teacher attendance statistics for a given period
 * @param {String} teacherId - The teacher's ID
 * @param {String} startDate - Start date for statistics (YYYY-MM-DD)
 * @param {String} endDate - End date for statistics (YYYY-MM-DD)
 * @returns {Promise<Object>} Attendance statistics
 */
export const getTeacherAttendanceStats = async (
  teacherId,
  startDate,
  endDate
) => {
  try {
    const teacherAttendance = await TeacherAttendance.findOne({
      teacherId,
    });

    if (!teacherAttendance) {
      return {
        teacherId,
        period: { startDate, endDate },
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        attendancePercentage: 0,
      };
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const relevantRecords = teacherAttendance.attendanceRecords.filter(
      (record) => {
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
      }
    );

    const totalClasses = relevantRecords.length;
    const presentClasses = relevantRecords.filter((r) => r.present).length;
    const absentClasses = totalClasses - presentClasses;

    const attendancePercentage =
      totalClasses > 0 ? ((presentClasses / totalClasses) * 100).toFixed(2) : 0;

    return {
      teacherId,
      period: { startDate, endDate },
      totalClasses,
      presentClasses,
      absentClasses,
      attendancePercentage: parseFloat(attendancePercentage),
    };
  } catch (error) {
    console.error("Error getting teacher attendance stats:", error);
    throw error;
  }
};
