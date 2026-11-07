import { tool } from "ai";
import { z } from "zod";
import connectToDB from "@/lib/db";
import TimeTable from "@/models/TimeTable";
import User from "@/models/User";
import Subject from "@/models/Subject";
import Class from "@/models/Class";
import TeacherAttendance from "@/models/TeacherAttendance";
import { escapeRegex, buildNameSearchRegex } from "./utils.js";

export const timetableTool = () =>
  tool({
    description:
      "Look up class timetables, teacher daily schedules, or identify which teachers are FREE during a specific period for substitution.",
    parameters: z.object({
      query: z
        .string()
        .optional()
        .describe("General query or free teacher search, e.g. 'free teachers in period 3 today'"),
      day: z
        .string()
        .optional()
        .describe("Day of the week, e.g. 'Monday', 'Tuesday', or 'today'"),
      className: z.string().optional().describe("Class ID or name, e.g. '10A'"),
      teacherName: z.string().optional().describe("Teacher name to inspect schedule"),
      periodNumber: z.union([z.number(), z.string()]).optional().describe("Period number (1-9)"),
      findFreeTeachers: z
        .boolean()
        .optional()
        .describe("Set to true to find available/free teachers for substitution who do not have a class at this period/day"),
    }),
    execute: async ({ query, day, className, teacherName, periodNumber, findFreeTeachers }) => {
      try {
        await connectToDB();

        // Normalize day string or default to today's weekday
        let normDay = day;
        if (day && typeof day === "string") {
          normDay = day.trim().charAt(0).toUpperCase() + day.trim().slice(1).toLowerCase();
        }
        if (!normDay || normDay.toLowerCase() === "today") {
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          normDay = daysOfWeek[new Date().getDay()];
        }

        const normPeriod = periodNumber ? parseInt(String(periodNumber), 10) : null;

        // Auto-detect free teacher query from parameters or query string
        const isFreeTeacherQuery =
          findFreeTeachers === true ||
          Boolean(query && /free|substitut|availab/i.test(query));

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

        // Case 1: Find Free Teachers for substitution
        if ((isFreeTeacherQuery || findFreeTeachers) && normPeriod) {
          // Bounded query with maxTimeMS to respect Atlas M0 constraints
          const allTimetables = await TimeTable.find({})
            .select("timeSlots")
            .limit(50)
            .maxTimeMS(2500)
            .lean();

          const busyTeacherIds = new Set();
          for (const tt of allTimetables) {
            for (const slot of tt.timeSlots || []) {
              if (slot.day === normDay && slot.periodNumber === normPeriod && slot.teacherId) {
                busyTeacherIds.add(String(slot.teacherId));
              }
            }
          }

          // Check who is marked absent today in TeacherAttendance
          const startOfToday = new Date();
          startOfToday.setUTCHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setUTCHours(23, 59, 59, 999);

          const absentTeachersToday = await TeacherAttendance.find({
            attendanceRecords: {
              $elemMatch: {
                date: { $gte: startOfToday, $lte: endOfToday },
                present: false,
              },
            },
          })
            .select("teacherId")
            .limit(30)
            .lean();

          for (const at of absentTeachersToday) {
            if (at.teacherId) busyTeacherIds.add(String(at.teacherId));
          }

          // Exclude retired and busy/absent teachers
          const freeTeachers = await User.find({
            roles: "Teacher",
            "teacherSpecificField.status": { $nin: ["Retired", "Dropped Out"] },
            _id: { $nin: Array.from(busyTeacherIds) },
          })
            .select("name email contactNumber teacherSpecificField")
            .limit(20)
            .maxTimeMS(2500)
            .lean();

          const busyTeachers = await User.find({
            _id: { $in: Array.from(busyTeacherIds) },
            roles: "Teacher",
          })
            .select("name")
            .limit(20)
            .lean();

          return {
            day: normDay,
            period: normPeriod,
            freeTeachersCount: freeTeachers.length,
            freeTeachers: freeTeachers.map((t) => ({
              id: t._id,
              name: t.name,
              contactNumber: t.contactNumber || "N/A",
              status: t.teacherSpecificField?.status || "Active",
            })),
            busyTeachersCount: busyTeachers.length,
            busyTeachers: busyTeachers.map((t) => t.name),
            message: `Found ${freeTeachers.length} teacher(s) available for substitution in Period ${normPeriod} on ${normDay}.`,
          };
        }

        // Case 2: Specific Teacher Schedule
        if (teacherName) {
          const nameRegex = buildNameSearchRegex(teacherName) || new RegExp(escapeRegex(teacherName), "i");
          const teacher = await User.findOne({
            name: nameRegex,
            roles: "Teacher",
          })
            .select("_id name")
            .lean();

          if (!teacher) {
            return {
              teacher: teacherName,
              totalClasses: 0,
              schedule: [],
              message: `No faculty member found matching '${teacherName}'.`,
            };
          }

          const timetables = await TimeTable.find({ "timeSlots.teacherId": teacher._id })
            .populate("classId", "name")
            .populate("timeSlots.subjectId", "name")
            .limit(10)
            .maxTimeMS(2500)
            .lean();

          const schedule = [];
          for (const tt of timetables) {
            for (const slot of tt.timeSlots || []) {
              if (String(slot.teacherId) === String(teacher._id)) {
                if (normDay && slot.day !== normDay) continue;
                schedule.push({
                  day: slot.day,
                  periodNumber: slot.periodNumber,
                  class: tt.classId?.name || tt.classId,
                  subject: slot.subjectId?.name || "Subject",
                });
              }
            }
          }

          schedule.sort((a, b) => a.periodNumber - b.periodNumber);

          return {
            teacher: teacher.name,
            filterDay: normDay || "All Days",
            totalClasses: schedule.length,
            schedule,
          };
        }

        // Case 3: Class Timetable
        const query = {};
        if (resolvedClassId) {
          query.classId = resolvedClassId;
        }

        const timetables = await TimeTable.find(query)
          .populate("classId", "name")
          .populate("timeSlots.teacherId", "name")
          .populate("timeSlots.subjectId", "name")
          .limit(5)
          .maxTimeMS(2500)
          .lean();

        if (!timetables || timetables.length === 0) {
          return { message: `No timetable found for class '${className || "all"}'.` };
        }

        const results = timetables.map((tt) => {
          const filteredSlots = (tt.timeSlots || []).filter((s) => {
            if (normDay && s.day !== normDay) return false;
            if (normPeriod && s.periodNumber !== normPeriod) return false;
            return true;
          });

          filteredSlots.sort((a, b) => a.periodNumber - b.periodNumber);

          return {
            class: tt.classId?.name || tt.classId,
            slots: filteredSlots.map((s) => ({
              day: s.day,
              period: s.periodNumber,
              subject: s.subjectId?.name || "N/A",
              teacher: s.teacherId?.name || "Unassigned",
            })),
          };
        });

        return { count: results.length, timetables: results };
      } catch (error) {
        console.error("Timetable tool execution error:", error);
        return {
          count: 0,
          timetables: [],
          message: `Unable to query timetable: ${error.message}`,
        };
      }
    },
  });
