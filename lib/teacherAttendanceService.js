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
    // Get day of the week from date
    const dayObj = new Date(date);
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

    // Get all timetables for this day
    const timeTables = await TimeTable.find({
      "timeSlots.day": day,
    });

    const processedTeachers = new Set();

    for (const timeTable of timeTables) {
      const classId = timeTable.classId;
      const relevantTimeSlots = timeTable.timeSlots.filter(
        (slot) => slot.day === day
      );

      for (const slot of relevantTimeSlots) {
        if (!slot.teacherId || !slot.subjectId) continue;

        // Check if attendance was taken for this slot
        const attendanceExists = await Attendance.findOne({
          classId,
          batchId: slot.classId.batchId,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          periodNumber: slot.periodNumber,
          day,
          date,
        });

        if (!attendanceExists) {
          // No attendance record found, mark teacher as absent
          let teacherAttendance = await TeacherAttendance.findOne({
            teacherId: slot.teacherId,
          });

          if (!teacherAttendance) {
            teacherAttendance = new TeacherAttendance({
              teacherId: slot.teacherId,
              attendanceRecords: [],
            });
          }

          // Check if this period is already recorded for this date
          const existingRecordIndex =
            teacherAttendance.attendanceRecords.findIndex(
              (record) =>
                record.classId.toString() === classId.toString() &&
                record.batchId.toString() === batchId.toString() &&
                record.subjectId.toString() === slot.subjectId.toString() &&
                record.periodNumber === slot.periodNumber &&
                record.day === day &&
                record.date === date
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
              classId,
              batchId: slot.classId.batchId,
              subjectId: slot.subjectId,
              periodNumber: slot.periodNumber,
              day,
              date,
              present: false,
              autoMarked: true,
              markedAt: new Date(),
            });
          }

          await teacherAttendance.save();
          processedTeachers.add(slot.teacherId);
        }
      }
    }

    return {
      success: true,
      message: "Absent teachers marked successfully",
      processedCount: processedTeachers.size,
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

    // Filter records for the date range
    const relevantRecords = teacherAttendance.attendanceRecords.filter(
      (record) => record.date >= startDate && record.date <= endDate
    );

    let totalClasses = relevantRecords.length;
    let presentClasses = relevantRecords.filter(
      (record) => record.present
    ).length;
    let absentClasses = totalClasses - presentClasses;

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
