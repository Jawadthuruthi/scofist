import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import Attendance from "@/models/Attendance";
import LeaveRecord from "@/models/LeaveRecord";
import { getPeriodTimeString } from "@/lib/utils";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId");
        const month = parseInt(url.searchParams.get("month"));
        const year = parseInt(url.searchParams.get("year"));
        const specificDate = url.searchParams.get("date"); // YYYY-MM-DD

        if (!studentId) {
            return NextResponse.json(
                { message: "studentId is required" },
                { status: 400 }
            );
        }

        // Build date range for filtering
        let startDate = null;
        let endDate = null;
        
        if (specificDate) {
            const parts = specificDate.split("-");
            if (parts.length === 3) {
                startDate = new Date(parts[0], parts[1] - 1, parts[2]);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(parts[0], parts[1] - 1, parts[2]);
                endDate.setHours(23, 59, 59, 999);
            }
        } else if (month && year) {
            startDate = new Date(year, month - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (year) {
            startDate = new Date(year, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(year, 11, 31);
            endDate.setHours(23, 59, 59, 999);
        }

        // ── Primary source: StudentAttendance (same as history table) ─────────
        const studentDoc = await StudentAttendance.findOne({ studentId })
            .populate({ path: "attendanceRecords.classId", select: "name" })
            .populate({ path: "attendanceRecords.subjectId", select: "name" })
            .lean();

        if (!studentDoc) {
            return NextResponse.json({ records: [] }, { status: 200 });
        }

        // Filter attendanceRecords by date range (mirrors history table filter logic)
        let filteredRecords = studentDoc.attendanceRecords || [];
        if (startDate && endDate) {
            filteredRecords = filteredRecords.filter((rec) => {
                const d = new Date(rec.date);
                return d >= startDate && d <= endDate;
            });
        }

        // Sort descending by date (most recent first)
        filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // ── Secondary: look up teacher names and true status from Attendance (best-effort) ────
        // Build maps keyed by "classId|subjectId|periodNumber|date(date-only)"
        let teacherMap = {};
        let trueStatusMap = {};
        if (filteredRecords.length > 0) {
            const dateFilter = startDate && endDate
                ? { date: { $gte: startDate, $lte: endDate } }
                : {};

            const attendanceDocs = await Attendance.find({
                "attendanceData.studentId": studentId,
                ...dateFilter,
            })
                .populate({ path: "teacherId", select: "name" })
                .lean();

            attendanceDocs.forEach((att) => {
                const dateKey = new Date(att.date).toISOString().split("T")[0];
                const key = `${att.classId}|${att.subjectId}|${att.periodNumber}|${dateKey}`;
                teacherMap[key] = att.teacherId?.name || "—";
                
                // Get the true present status for this student from the master record
                const studentData = att.attendanceData.find(d => d.studentId === studentId);
                if (studentData) {
                    trueStatusMap[key] = studentData.present;
                }
            });
        }

        // ── Join leaveReason from LeaveRecord ─────────────────────────────────
        // Helper: normalize any date to a local YYYY-MM-DD string
        const toDateKey = (d) => {
            const dt = new Date(d);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const day = String(dt.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };

        let leaveReasonMap = {}; // keyed by local "YYYY-MM-DD" -> leaveReason
        const absentRecords = filteredRecords.filter(r => r.present === false);

        if (absentRecords.length > 0) {
            // Expand date range by 1 day on each side to avoid timezone boundary issues
            const absentTimes = absentRecords.map(r => new Date(r.date).getTime());
            const minDate = new Date(Math.min(...absentTimes));
            const maxDate = new Date(Math.max(...absentTimes));
            minDate.setHours(0, 0, 0, 0);
            maxDate.setHours(23, 59, 59, 999);

            const leaveRecords = await LeaveRecord.find({
                studentId,
                dateOfLeave: { $lte: maxDate },
            }, "dateOfLeave dateOfArrival arrivedDate leaveReason").lean();

            // For each absent record, find the most recent leave record that applies
            absentRecords.forEach(rec => {
                const absDateKey = toDateKey(rec.date);
                if (leaveReasonMap[absDateKey]) return; // already matched

                // Filter leave records that started on or before this absence
                // and where the student hadn't yet returned (no arrivedDate or arrivedDate > absence)
                const relevantLeaves = leaveRecords.filter(lr => {
                    const fromKey = toDateKey(lr.dateOfLeave);
                    const arrivedKey = lr.arrivedDate ? toDateKey(lr.arrivedDate) : null;
                    
                    return absDateKey >= fromKey && (!arrivedKey || arrivedKey > absDateKey);
                });

                if (relevantLeaves.length > 0) {
                    // Sort by dateOfLeave descending to get the most recent one
                    relevantLeaves.sort((a, b) => new Date(b.dateOfLeave) - new Date(a.dateOfLeave));
                    leaveReasonMap[absDateKey] = relevantLeaves[0].leaveReason;
                }
            });
        }

        // ── Fetch Periods for timing information (lean query with field projection) ────
        const Period = (await import("@/models/Period")).default;
        const periods = await Period.find({})
            .select("periodNumber startTime endTime schedule formattedTime")
            .lean();

        const periodTimeMap = {};
        periods.forEach(p => {
            const timeStr = p.formattedTime || getPeriodTimeString(p);
            const sched = (p.schedule || "normal").toLowerCase();
            periodTimeMap[`${sched}_${p.periodNumber}`] = timeStr;
            if (sched === "normal" || !periodTimeMap[p.periodNumber]) {
                periodTimeMap[p.periodNumber] = timeStr;
            }
        });

        // Map to the dialog's expected shape
        const records = filteredRecords.map((r) => {
            const classIdStr = typeof r.classId === "object" ? r.classId._id?.toString() || "" : r.classId?.toString() || "";
            const subjectIdStr = typeof r.subjectId === "object" ? r.subjectId._id?.toString() || "" : r.subjectId?.toString() || "";
            const dateKey = toDateKey(r.date);
            const key = `${classIdStr}|${subjectIdStr}|${r.periodNumber}|${dateKey}`;
            
            // Override with true status from master record if it exists
            const trueStatus = trueStatusMap[key];
            const finalPresentStatus = trueStatus !== undefined ? trueStatus : r.present;

            const recDate = new Date(r.date);
            const isThursday = !isNaN(recDate.getTime()) && recDate.getDay() === 4;
            const schedKey = isThursday ? `thursday_${r.periodNumber}` : `normal_${r.periodNumber}`;

            return {
                date: r.date,
                subjectName: r.subjectId?.name || "—",
                teacherName: teacherMap[key] || "—",
                className: r.classId?.name || "—",
                periodNumber: r.periodNumber,
                periodTime: periodTimeMap[schedKey] || periodTimeMap[r.periodNumber] || null,
                present: finalPresentStatus,
                leaveReason: r.leaveReason || leaveReasonMap[dateKey] || null,
            };
        });

        // ── Include synthetic unmarked schedule records for a specific date ──
        const includeScheduleForDate = url.searchParams.get("includeScheduleForDate");
        if (includeScheduleForDate) {
            const reqDate = new Date(includeScheduleForDate);
            if (!isNaN(reqDate.getTime())) {
                const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const reqDayName = WEEKDAYS[reqDate.getUTCDay() || reqDate.getDay()];
                const reqDateKey = toDateKey(reqDate);

                const User = (await import("@/models/User")).default;
                const TimeTable = (await import("@/models/TimeTable")).default;
                const Class = (await import("@/models/Class")).default;
                const Subject = (await import("@/models/Subject")).default;

                const student = await User.findById(studentId).lean();
                const studentClassId = student?.studentSpecificField?.classId || student?.classId;

                if (studentClassId) {
                    const timeTable = await TimeTable.findOne({ classId: studentClassId }).lean();
                    if (timeTable && timeTable.timeSlots) {
                        const classDoc = await Class.findById(studentClassId, "name").lean();
                        const className = classDoc?.name || "—";
                        
                        // Get all periods scheduled for this day
                        const reqDateObj = new Date(reqDateKey);
                        const daySlots = timeTable.timeSlots.filter(s => {
                            if (s.day !== reqDayName) return false;
                            
                            // Check validity period
                            if (s.validFrom) {
                                const validFrom = new Date(toDateKey(s.validFrom));
                                if (reqDateObj < validFrom) return false;
                            }
                            if (s.validTo) {
                                const validTo = new Date(toDateKey(s.validTo));
                                if (reqDateObj >= validTo) return false;
                            }
                            
                            return true;
                        });
                        
                        // Check which periods are already in records for this date
                        const markedPeriodsForDate = new Set(
                            records.filter(r => toDateKey(r.date) === reqDateKey).map(r => r.periodNumber)
                        );
                        
                        // Fetch subject and teacher names for synthetic records
                        const missingSubIds = [...new Set(daySlots.map(s => String(s.subjectId)))];
                        const missingTeacherIds = [...new Set(daySlots.map(s => String(s.teacherId)))];
                        
                        const subjects = await Subject.find({ _id: { $in: missingSubIds } }, "name").lean();
                        const teachers = await User.find({ _id: { $in: missingTeacherIds } }, "name").lean();
                        
                        const subjectMap = Object.fromEntries(subjects.map(s => [String(s._id), s.name]));
                        const teacherMapSync = Object.fromEntries(teachers.map(t => [String(t._id), t.name]));

                        // Add unmarked periods
                        daySlots.forEach(slot => {
                            if (!markedPeriodsForDate.has(slot.periodNumber)) {
                                records.push({
                                    date: new Date(includeScheduleForDate),
                                    subjectName: subjectMap[String(slot.subjectId)] || "—",
                                    teacherName: teacherMapSync[String(slot.teacherId)] || "—",
                                    className: className,
                                    periodNumber: slot.periodNumber,
                                    periodTime: periodTimeMap[slot.periodNumber] || null,
                                    present: null, // Blank status
                                    synthetic: true,
                                });
                            }
                        });
                    }
                }
            }
        }
        
        // Final Sort by Date Desc, Period Asc
        records.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (a.periodNumber || 0) - (b.periodNumber || 0);
        });

        return NextResponse.json({ records }, { status: 200 });
    } catch (error) {
        console.error("student-attendance-lookup error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
