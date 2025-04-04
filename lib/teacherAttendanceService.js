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
    const { teacherId, date, classId, subjectId, periodNumber, day } =
      studentAttendance;

    // Find or create teacher attendance record for this date
    let teacherAttendance = await TeacherAttendance.findOne({
      teacherId,
      date,
    });

    if (!teacherAttendance) {
      teacherAttendance = new TeacherAttendance({
        teacherId,
        date,
        attendanceRecords: [],
      });
    }

    // Check if this period is already recorded
    const existingRecordIndex = teacherAttendance.attendanceRecords.findIndex(
      (record) =>
        record.classId === classId &&
        record.subjectId === subjectId &&
        record.periodNumber === periodNumber &&
        record.day === day
    );

    // If found, update it, otherwise add new record
    if (existingRecordIndex >= 0) {
      teacherAttendance.attendanceRecords[existingRecordIndex].present = true;
      teacherAttendance.attendanceRecords[existingRecordIndex].markedAt =
        new Date();
    } else {
      teacherAttendance.attendanceRecords.push({
        classId,
        subjectId,
        periodNumber,
        day,
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
            date,
          });

          if (!teacherAttendance) {
            teacherAttendance = new TeacherAttendance({
              teacherId: slot.teacherId,
              date,
              attendanceRecords: [],
            });
          }

          // Check if this period is already recorded
          const existingRecordIndex =
            teacherAttendance.attendanceRecords.findIndex(
              (record) =>
                record.classId === classId &&
                record.subjectId === slot.subjectId &&
                record.periodNumber === slot.periodNumber &&
                record.day === day
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
              subjectId: slot.subjectId,
              periodNumber: slot.periodNumber,
              day,
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
    const attendanceRecords = await TeacherAttendance.find({
      teacherId,
      date: { $gte: startDate, $lte: endDate },
    });

    let totalClasses = 0;
    let presentClasses = 0;
    let absentClasses = 0;

    attendanceRecords.forEach((record) => {
      record.attendanceRecords.forEach((slot) => {
        totalClasses++;
        if (slot.present) {
          presentClasses++;
        } else {
          absentClasses++;
        }
      });
    });

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
