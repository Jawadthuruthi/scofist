import { tool } from "ai";
import { z } from "zod";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import TeacherAttendance from "@/models/TeacherAttendance";
import LeaveRecord from "@/models/LeaveRecord";
import User from "@/models/User";
import Class from "@/models/Class";
import { escapeRegex, parseQueryDate, buildNameSearchRegex } from "./utils.js";

export const attendanceTool = () =>
  tool({
    description:
      "Query student and teacher attendance, absent lists for a given date, individual attendance percentage, or active leave records.",
    parameters: z.object({
      target: z.string().optional().default("student").describe("Target person type: 'student' or 'teacher'"),
      date: z.string().optional().describe("Date in YYYY-MM-DD format or 'today'/'yesterday'. Defaults to today."),
      personName: z.string().optional().describe("Specific student or teacher name to check"),
      className: z.string().optional().describe("Class ID or name, e.g. '10A'"),
      statusFilter: z.string().optional().default("absent").describe("Filter for 'absent', 'present', or 'all' records"),
    }),
    execute: async ({ target = "student", date, personName, className, statusFilter = "absent" }) => {
      try {
        await connectToDB();

        const normTarget = (target || "").toLowerCase().includes("teach") ? "teacher" : "student";
        const normFilter = (statusFilter || "").toLowerCase().includes("pres")
          ? "present"
          : (statusFilter || "").toLowerCase().includes("all")
          ? "all"
          : "absent";

        const targetDate = parseQueryDate(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Resolve human-readable class name to classId if provided
        let resolvedClassId = null;
        if (className) {
          const classDoc = await Class.findOne({
            $or: [
              { _id: className.trim() },
              { name: new RegExp(`^${escapeRegex(className)}$`, "i") },
            ],
          })
            .select("_id")
            .lean();
          resolvedClassId = classDoc ? classDoc._id : className.trim();
        }

        if (normTarget === "teacher") {
          // Teacher attendance
          const query = {
            "attendanceRecords.date": { $gte: startOfDay, $lte: endOfDay },
          };

          if (personName) {
            const nameRegex = buildNameSearchRegex(personName) || new RegExp(escapeRegex(personName), "i");
            const teacher = await User.findOne({
              name: nameRegex,
              roles: "Teacher",
            })
              .select("_id name")
              .lean();

            if (!teacher) {
              return {
                target: "teacher",
                count: 0,
                results: [],
                message: `No faculty member found matching '${personName}'.`,
              };
            }
            query.teacherId = teacher._id;
          }

          const records = await TeacherAttendance.find(query)
            .populate("teacherId", "name email contactNumber")
            .limit(20)
            .maxTimeMS(2500)
            .lean();

          const results = [];
          for (const doc of records) {
            const dailySlots = (doc.attendanceRecords || []).filter(
              (r) => r.date >= startOfDay && r.date <= endOfDay
            );
            for (const slot of dailySlots) {
              if (statusFilter === "absent" && slot.present) continue;
              if (statusFilter === "present" && !slot.present) continue;

              results.push({
                teacher: doc.teacherId?.name || "Unknown Teacher",
                periodNumber: slot.periodNumber,
                present: slot.present,
              });
            }
          }

          return {
            date: startOfDay.toISOString().split("T")[0],
            target: "teacher",
            count: results.length,
            results,
          };
        }

        // Check student individual attendance history if personName provided
        if (personName) {
          const nameRegex = buildNameSearchRegex(personName) || new RegExp(escapeRegex(personName), "i");
          const student = await User.findOne({
            name: nameRegex,
            roles: "Student",
          })
            .select("_id name studentSpecificField")
            .lean();

          if (!student) {
            return {
              target: "student",
              count: 0,
              results: [],
              message: `No student found matching '${personName}'.`,
            };
          }

          const admissionNo = student.studentSpecificField?.admissionNumber || student._id;

          const attendanceDoc = await StudentAttendance.findOne({ studentId: student._id })
            .maxTimeMS(2500)
            .lean();

          if (!attendanceDoc || !attendanceDoc.attendanceRecords?.length) {
            return {
              student: student.name,
              admissionNo,
              message: "No attendance records found on file for this student.",
            };
          }

          const totalRecords = attendanceDoc.attendanceRecords.length;
          const presentRecords = attendanceDoc.attendanceRecords.filter((r) => r.present).length;
          const percentage = totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(1) : "0";

          // Also check leave records
          const leaves = await LeaveRecord.find({ studentId: student._id })
            .select("dateOfLeave dateOfArrival leaveReason")
            .limit(5)
            .lean();

          return {
            student: student.name,
            admissionNo,
            totalPeriodsTracked: totalRecords,
            presentPeriods: presentRecords,
            absentPeriods: totalRecords - presentRecords,
            attendancePercentage: `${percentage}%`,
            recentLeaves: leaves.map((l) => ({
              from: l.dateOfLeave ? new Date(l.dateOfLeave).toISOString().split("T")[0] : "N/A",
              to: l.dateOfArrival ? new Date(l.dateOfArrival).toISOString().split("T")[0] : "Ongoing",
              reason: l.leaveReason || "Unexcused",
            })),
          };
        }

        // Daily Class Attendance / Absent List
        // Match specific absent records directly in MongoDB to avoid false zeros
        const query = {
          attendanceRecords: {
            $elemMatch: {
              date: { $gte: startOfDay, $lte: endOfDay },
              ...(statusFilter === "absent" ? { present: false } : {}),
              ...(statusFilter === "present" ? { present: true } : {}),
              ...(resolvedClassId ? { classId: resolvedClassId } : {}),
            },
          },
        };

        const records = await StudentAttendance.find(query)
          .populate("studentId", "name studentSpecificField")
          .limit(30)
          .maxTimeMS(2500)
          .lean();

        const absentees = [];
        for (const doc of records) {
          const slotsToday = (doc.attendanceRecords || []).filter(
            (r) =>
              r.date >= startOfDay &&
              r.date <= endOfDay &&
              (!resolvedClassId || String(r.classId) === String(resolvedClassId))
          );
          const filteredSlots =
            statusFilter === "absent"
              ? slotsToday.filter((s) => !s.present)
              : statusFilter === "present"
              ? slotsToday.filter((s) => s.present)
              : slotsToday;

          if (filteredSlots.length > 0) {
            absentees.push({
              student: doc.studentId?.name || "Unknown",
              admissionNo: doc.studentId?.studentSpecificField?.admissionNumber || doc.studentId?._id || "N/A",
              class: doc.studentId?.studentSpecificField?.classId || "N/A",
              periods: filteredSlots.map((s) => s.periodNumber),
              status: statusFilter,
            });
          }
        }

        let contextNote = null;
        if (absentees.length === 0 && (!date || date.toLowerCase() === "today")) {
          // Provide informative context if attendance hasn't been taken yet today
          const sampleDoc = await StudentAttendance.findOne({ "attendanceRecords.0": { $exists: true } })
            .select("attendanceRecords")
            .lean();

          if (sampleDoc?.attendanceRecords?.length) {
            const sortedDates = sampleDoc.attendanceRecords
              .map((r) => r.date)
              .filter(Boolean)
              .sort((a, b) => new Date(b) - new Date(a));
            if (sortedDates[0]) {
              const latestDate = new Date(sortedDates[0]).toISOString().split("T")[0];
              contextNote = `No class attendance has been submitted yet for today (${startOfDay.toISOString().split("T")[0]}). The most recent attendance session on record was on ${latestDate}.`;
            }
          }
        }

        return {
          date: startOfDay.toISOString().split("T")[0],
          filter: statusFilter,
          totalRecordsFound: absentees.length,
          records: absentees,
          note: contextNote || undefined,
        };
      } catch (error) {
        console.error("Attendance tool execution error:", error);
        return {
          count: 0,
          results: [],
          message: `Unable to query attendance: ${error.message}`,
        };
      }
    },
  });
