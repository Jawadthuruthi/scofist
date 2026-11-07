import { tool } from "ai";
import { z } from "zod";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import TeacherAttendance from "@/models/TeacherAttendance";
import Attendance from "@/models/Attendance";
import LeaveRecord from "@/models/LeaveRecord";
import User from "@/models/User";
import Class from "@/models/Class";
import Batch from "@/models/Batch";
import { escapeRegex, parseQueryDate, buildNameSearchRegex } from "./utils.js";

export const attendanceTool = () =>
  tool({
    description:
      "Query student and teacher attendance, absent lists for a given date, individual attendance percentage (overall or for a specific month/year like October 2026), batch/class attendance toppers and rankings (by month, year, or each month), or active leave records.",
    parameters: z.object({
      target: z.string().optional().default("student").describe("Target person type: 'student' or 'teacher'"),
      query: z.string().optional().describe("General query, student name, admission number, or ID (e.g. '970', 'Ahammad Razal')"),
      studentId: z.string().optional().describe("Student ID or admission number, e.g. '970'"),
      admissionNo: z.string().optional().describe("Student admission number, e.g. '970'"),
      personName: z.string().optional().describe("Specific student or teacher name to check"),
      batchName: z.string().optional().describe("Batch name or ID, e.g. 'Verity', 'Fortune', 'Sinfonia', 'BTC-12'"),
      className: z.string().optional().describe("Class ID or name, e.g. '10A' or 'Plus Two'"),
      findToppers: z.boolean().optional().describe("Set to true if querying attendance toppers, rankings, highest attendance, or best attendance for a batch/class"),
      date: z.string().optional().describe("Date in YYYY-MM-DD format or 'today'/'yesterday'. Defaults to today."),
      month: z.union([z.number(), z.string()]).optional().describe("Specific month name or number (e.g. 'October', '10', 'January') or 'each month'"),
      year: z.union([z.number(), z.string()]).optional().describe("Year, e.g. 2025 or 2026"),
      statusFilter: z.string().optional().default("absent").describe("Filter for 'absent', 'present', or 'all' records"),
    }),
    execute: async ({
      target = "student",
      query: rawQuery,
      studentId,
      admissionNo,
      batchName,
      className,
      findToppers,
      date,
      month,
      year,
      personName,
      statusFilter = "absent",
    }) => {
      try {
        await connectToDB();

        const queryStr = typeof rawQuery === "string" ? rawQuery : "";
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
          const tQuery = {
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
            tQuery.teacherId = teacher._id;
          }

          const records = await TeacherAttendance.find(tQuery)
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

        // Student individual attendance lookup (by admissionNo, studentId, personName, or numeric query)
        const targetId =
          (studentId ? String(studentId).trim() : null) ||
          (admissionNo ? String(admissionNo).trim() : null) ||
          (queryStr && /^\d+$/.test(queryStr.trim()) ? queryStr.trim() : null) ||
          (personName && /^\d+$/.test(personName.trim()) ? personName.trim() : null);

        // Auto-detect Batch/Class Toppers or Ranking request
        const isToppersQuery =
          Boolean(findToppers) ||
          /\b(topper|toppers|highest\s+attendance|best\s+attendance|top\s+attendance|attendance\s+rank|attendance\s+ranking|rankings?|leaderboard)\b/i.test(queryStr);

        let targetBatch = batchName;
        if (!targetBatch && queryStr) {
          const batchMatch = queryStr.match(/\b(verity|fortune|sinfonia|cornea|euphoria|brillo|inforia|blumea|g-vibe|btc-\d+)\b/i);
          if (batchMatch) targetBatch = batchMatch[1];
        }

        let targetClass = className;
        if (!targetClass && queryStr) {
          const classMatch = queryStr.match(/\b(plus\s+one|plus\s+two|degree\s+first\s+year|degree\s+2nd\s+year|degree\s+third\s+year|pg\s+first\s+year|pg\s+second\s+year|nine|ten|eight|cls-\d+)\b/i);
          if (classMatch) targetClass = classMatch[1];
        }

        const isEachMonth = /each\s+month|every\s+month|all\s+months|month[\s-]+wise/i.test(`${queryStr} ${month || ""}`);

        // Handle Case: Batch or Class Attendance Toppers / Rankings
        if (isToppersQuery || (targetBatch && !targetId && !personName && (month || year || isEachMonth))) {
          // 1. Resolve batch if present
          let batchDoc = null;
          if (targetBatch) {
            batchDoc = await Batch.findOne({
              $or: [
                { _id: targetBatch.trim() },
                { name: new RegExp(`^${escapeRegex(targetBatch.trim())}$`, "i") },
                { name: new RegExp(escapeRegex(targetBatch.trim()), "i") },
              ],
            })
              .select("_id name")
              .lean();
          }

          // 2. Resolve class if present
          let classDoc = null;
          if (targetClass) {
            classDoc = await Class.findOne({
              $or: [
                { _id: targetClass.trim() },
                { name: new RegExp(`^${escapeRegex(targetClass.trim())}$`, "i") },
                { name: new RegExp(escapeRegex(targetClass.trim()), "i") },
              ],
            })
              .select("_id name")
              .lean();
          }

          const cohortQuery = { roles: "Student" };
          if (batchDoc) {
            cohortQuery["studentSpecificField.batchId"] = batchDoc._id;
          }
          if (classDoc) {
            cohortQuery.$or = [
              { "studentSpecificField.classId": classDoc._id },
              { "studentSpecificField.admissionClassId": classDoc._id },
            ];
          }

          // Fetch all students in this cohort
          const students = await User.find(cohortQuery)
            .select("_id name studentSpecificField.admissionNumber")
            .maxTimeMS(2500)
            .lean();

          const cohortName = batchDoc?.name || classDoc?.name || targetBatch || targetClass || "Cohort";

          if (!students || students.length === 0) {
            return {
              cohort: cohortName,
              message: `No active student records found for ${cohortName}.`,
            };
          }

          const MONTH_NAMES = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];
          const MONTH_MAP = {
            january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4,
            june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8,
            october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
          };

          const combinedDateStr = `${month || ""} ${date || ""} ${queryStr}`.toLowerCase();
          let targetMonth = null;
          if (!isEachMonth) {
            if (typeof month === "number" && month >= 1 && month <= 12) {
              targetMonth = month - 1;
            } else {
              for (const [mName, mIdx] of Object.entries(MONTH_MAP)) {
                if (new RegExp(`\\b${mName}\\b`, "i").test(combinedDateStr)) {
                  targetMonth = mIdx;
                  break;
                }
              }
            }
          }

          let targetYear = year ? parseInt(String(year), 10) : null;
          const yearMatch = combinedDateStr.match(/\b(20\d\d)\b/);
          if (yearMatch && !targetYear) {
            targetYear = parseInt(yearMatch[1], 10);
          } else if (!targetYear) {
            targetYear = new Date().getFullYear();
          }

          // Fetch attendance documents for all students in cohort in one query
          const studentIds = students.map((s) => String(s._id));
          const admNos = students
            .map((s) => String(s.studentSpecificField?.admissionNumber))
            .filter(Boolean);

          const studentMap = new Map();
          students.forEach((s) => {
            const adm = s.studentSpecificField?.admissionNumber || s._id;
            studentMap.set(String(s._id), { id: s._id, name: s.name, admissionNo: adm });
            if (s.studentSpecificField?.admissionNumber) {
              studentMap.set(String(s.studentSpecificField.admissionNumber), {
                id: s._id,
                name: s.name,
                admissionNo: adm,
              });
            }
          });

          const attendanceDocs = await StudentAttendance.find({
            studentId: { $in: [...studentIds, ...admNos] },
          })
            .select("studentId attendanceRecords")
            .maxTimeMS(2500)
            .lean();

          if (isEachMonth) {
            // Compute toppers for each of the 12 months in targetYear
            const monthlyToppers = [];

            for (let m = 0; m < 12; m++) {
              const mName = MONTH_NAMES[m];
              const studentStats = [];

              for (const doc of attendanceDocs) {
                const sInfo = studentMap.get(String(doc.studentId));
                if (!sInfo) continue;

                const mRecords = (doc.attendanceRecords || []).filter((r) => {
                  if (!r.date) return false;
                  const d = new Date(r.date);
                  return d.getFullYear() === targetYear && d.getMonth() === m;
                });

                if (mRecords.length > 0) {
                  const present = mRecords.filter((r) => r.present).length;
                  const total = mRecords.length;
                  const pct = (present / total) * 100;
                  studentStats.push({
                    name: sInfo.name,
                    admissionNo: sInfo.admissionNo,
                    present,
                    total,
                    percentage: Number(pct.toFixed(1)),
                    percentageStr: pct.toFixed(1) + "%",
                  });
                }
              }

              if (studentStats.length > 0) {
                studentStats.sort((a, b) => b.percentage - a.percentage || b.present - a.present);
                const topper = studentStats[0];
                monthlyToppers.push({
                  month: mName,
                  hasData: true,
                  topper: {
                    rank: 1,
                    name: topper.name,
                    admissionNo: topper.admissionNo,
                    percentage: topper.percentageStr,
                    periodsAttended: `${topper.present}/${topper.total}`,
                  },
                  top3: studentStats.slice(0, 3).map((s, idx) => ({
                    rank: idx + 1,
                    name: s.name,
                    admissionNo: s.admissionNo,
                    percentage: s.percentageStr,
                    periodsAttended: `${s.present}/${s.total}`,
                  })),
                });
              } else {
                monthlyToppers.push({
                  month: mName,
                  hasData: false,
                  message: "No attendance recorded",
                });
              }
            }

            const activeMonths = monthlyToppers.filter((m) => m.hasData);

            return {
              cohort: cohortName,
              year: targetYear,
              totalCohortStudents: students.length,
              monthsWithRecords: activeMonths.length,
              monthlyToppers,
              summary:
                activeMonths.length > 0
                  ? `Found attendance toppers for ${activeMonths.length} recorded month(s) in ${targetYear} for ${cohortName}.`
                  : `No attendance records found for ${cohortName} in the year ${targetYear}.`,
            };
          }

          // Single Month or Overall Year Toppers
          const studentStats = [];

          for (const doc of attendanceDocs) {
            const sInfo = studentMap.get(String(doc.studentId));
            if (!sInfo) continue;

            const records = (doc.attendanceRecords || []).filter((r) => {
              if (!r.date) return false;
              const d = new Date(r.date);
              const yearMatches = d.getFullYear() === targetYear;
              const monthMatches = targetMonth !== null ? d.getMonth() === targetMonth : true;
              return yearMatches && monthMatches;
            });

            if (records.length > 0) {
              const present = records.filter((r) => r.present).length;
              const total = records.length;
              const pct = (present / total) * 100;
              studentStats.push({
                name: sInfo.name,
                admissionNo: sInfo.admissionNo,
                present,
                total,
                percentage: Number(pct.toFixed(1)),
                percentageStr: pct.toFixed(1) + "%",
              });
            }
          }

          const periodLabel =
            targetMonth !== null
              ? `${MONTH_NAMES[targetMonth]} ${targetYear}`
              : `the year ${targetYear}`;

          if (studentStats.length === 0) {
            return {
              cohort: cohortName,
              period: periodLabel,
              totalCohortStudents: students.length,
              message: `No attendance records found on file for ${cohortName} in ${periodLabel}.`,
            };
          }

          // Sort descending: highest percentage first, then highest present periods
          studentStats.sort((a, b) => b.percentage - a.percentage || b.present - a.present);

          const toppers = studentStats.slice(0, 5).map((s, idx) => ({
            rank: idx + 1,
            name: s.name,
            admissionNo: s.admissionNo,
            percentage: s.percentageStr,
            periodsAttended: `${s.present}/${s.total}`,
          }));

          return {
            cohort: cohortName,
            period: periodLabel,
            totalCohortStudents: students.length,
            toppersCount: toppers.length,
            toppers,
            message: `Top attendance performers for ${cohortName} in ${periodLabel}.`,
          };
        }

        const targetName =
          !isToppersQuery &&
          ((!targetId && personName) ||
            (!targetId && queryStr
              ? queryStr
                  .replace(
                    /\b(what|is|the|attendance|percentage|of|for|in|on|student|id|admission|number|month|year|october|november|december|january|february|march|april|may|june|july|august|september|20\d\d)\b/gi,
                    ""
                  )
                  .trim()
              : null));

        const isStudentLookup = Boolean(targetId || (targetName && targetName.length >= 2 && normTarget !== "teacher"));

        if (isStudentLookup) {
          let student = null;
          if (targetId) {
            student = await User.findOne({
              $or: [
                { _id: targetId },
                { "studentSpecificField.admissionNumber": targetId },
                { "studentSpecificField.admissionNumber": Number(targetId) || targetId },
              ],
            })
              .select("_id name roles studentSpecificField")
              .populate("studentSpecificField.classId", "name")
              .populate("studentSpecificField.batchId", "name")
              .lean();
          } else if (targetName) {
            const nameRegex = buildNameSearchRegex(targetName) || new RegExp(escapeRegex(targetName), "i");
            student = await User.findOne({
              name: nameRegex,
              roles: "Student",
            })
              .select("_id name roles studentSpecificField")
              .populate("studentSpecificField.classId", "name")
              .populate("studentSpecificField.batchId", "name")
              .lean();
          }

          if (!student) {
            return {
              target: "student",
              count: 0,
              results: [],
              message: `No student found matching '${targetId || targetName}'.`,
            };
          }

          const admNo = student.studentSpecificField?.admissionNumber || student._id;
          const classNameStr = student.studentSpecificField?.classId?.name || student.studentSpecificField?.classId || "N/A";
          const batchNameStr = student.studentSpecificField?.batchId?.name || student.studentSpecificField?.batchId || "N/A";

          // Parse Month and Year if requested
          const combinedDateStr = `${month || ""} ${date || ""} ${queryStr}`.toLowerCase();
          const MONTH_MAP = {
            january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4,
            june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8,
            october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
          };

          let targetMonth = null;
          if (typeof month === "number" && month >= 1 && month <= 12) {
            targetMonth = month - 1;
          } else {
            for (const [mName, mIdx] of Object.entries(MONTH_MAP)) {
              if (new RegExp(`\\b${mName}\\b`, "i").test(combinedDateStr)) {
                targetMonth = mIdx;
                break;
              }
            }
          }

          const isoMonthMatch = combinedDateStr.match(/\b20\d\d[-/](0?[1-9]|1[0-2])\b/);
          if (isoMonthMatch && targetMonth === null) {
            targetMonth = parseInt(isoMonthMatch[1], 10) - 1;
          }

          let targetYear = year ? parseInt(String(year), 10) : null;
          const yearMatch = combinedDateStr.match(/\b(20\d\d)\b/);
          if (yearMatch && !targetYear) {
            targetYear = parseInt(yearMatch[1], 10);
          } else if (targetMonth !== null && !targetYear) {
            targetYear = new Date().getFullYear();
          }

          const attendanceDoc = await StudentAttendance.findOne({
            $or: [
              { studentId: student._id },
              { studentId: String(admNo) },
            ],
          })
            .select("attendanceRecords")
            .maxTimeMS(2500)
            .lean();

          const allRecords = attendanceDoc?.attendanceRecords || [];
          const totalOverall = allRecords.length;
          const presentOverall = allRecords.filter((r) => r.present).length;
          const overallPercentage =
            totalOverall > 0 ? ((presentOverall / totalOverall) * 100).toFixed(1) + "%" : "0.0%";

          // Check if specific month was requested
          if (targetMonth !== null && targetYear !== null) {
            const monthRecords = allRecords.filter((r) => {
              if (!r.date) return false;
              const d = new Date(r.date);
              return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
            });

            let totalMonth = monthRecords.length;
            let presentMonth = monthRecords.filter((r) => r.present).length;

            // Fallback to Attendance collection if not in StudentAttendance array
            if (totalMonth === 0) {
              const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));
              const endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));
              const attDocs = await Attendance.find({
                date: { $gte: startOfMonth, $lte: endOfMonth },
                $or: [
                  { "attendanceData.studentId": student._id },
                  { "attendanceData.studentId": String(admNo) },
                ],
              })
                .select("attendanceData")
                .maxTimeMS(2500)
                .lean();

              for (const doc of attDocs) {
                const entry = doc.attendanceData?.find(
                  (d) => String(d.studentId) === String(student._id) || String(d.studentId) === String(admNo)
                );
                if (entry) {
                  totalMonth++;
                  if (entry.present) presentMonth++;
                }
              }
            }

            const absentMonth = totalMonth - presentMonth;
            const monthPercentage =
              totalMonth > 0 ? ((presentMonth / totalMonth) * 100).toFixed(1) + "%" : "0.0%";

            const monthNames = [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December",
            ];
            const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;

            return {
              student: student.name,
              admissionNo: admNo,
              class: classNameStr,
              batch: batchNameStr,
              period: monthLabel,
              totalPeriodsTracked: totalMonth,
              presentPeriods: presentMonth,
              absentPeriods: absentMonth,
              attendancePercentage: monthPercentage,
              overallAttendancePercentage: overallPercentage,
              overallTotalPeriods: totalOverall,
              overallPresentPeriods: presentOverall,
              message:
                totalMonth > 0
                  ? `Attendance for ${student.name} (Admission No: ${admNo}, Class: ${classNameStr}, Batch: ${batchNameStr}) in ${monthLabel}: ${monthPercentage} (${presentMonth}/${totalMonth} periods). Overall attendance: ${overallPercentage}.`
                  : `No attendance records found for ${student.name} in ${monthLabel}. Overall attendance: ${overallPercentage} across ${totalOverall} periods.`,
            };
          }

          // Also check leave records
          const leaves = await LeaveRecord.find({ studentId: student._id })
            .select("dateOfLeave dateOfArrival leaveReason")
            .limit(5)
            .lean();

          return {
            student: student.name,
            admissionNo: admNo,
            class: classNameStr,
            batch: batchNameStr,
            totalPeriodsTracked: totalOverall,
            presentPeriods: presentOverall,
            absentPeriods: totalOverall - presentOverall,
            attendancePercentage: overallPercentage,
            recentLeaves: leaves.map((l) => ({
              from: l.dateOfLeave ? new Date(l.dateOfLeave).toISOString().split("T")[0] : "N/A",
              to: l.dateOfArrival ? new Date(l.dateOfArrival).toISOString().split("T")[0] : "Ongoing",
              reason: l.leaveReason || "Unexcused",
            })),
          };
        }

        // Daily Class Attendance / Absent List
        // Match specific absent records directly in MongoDB to avoid false zeros
        const dailyQuery = {
          attendanceRecords: {
            $elemMatch: {
              date: { $gte: startOfDay, $lte: endOfDay },
              ...(statusFilter === "absent" ? { present: false } : {}),
              ...(statusFilter === "present" ? { present: true } : {}),
              ...(resolvedClassId ? { classId: resolvedClassId } : {}),
            },
          },
        };

        const records = await StudentAttendance.find(dailyQuery)
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
