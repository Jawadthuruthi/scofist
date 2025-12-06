import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import Attendance from "@/models/Attendance";
import LeaveRecord from "@/models/LeaveRecord";

// Helper to validate User via x-user-id header
async function validateUser(request) {
    const userId = request.headers.get("x-user-id");
    if (!userId) return null;

    await connectToDB();
    const user = await User.findOne({ _id: userId });
    return user;
}

export async function GET(request) {
    try {
        const user = await validateUser(request);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get("classId");
        const subjectId = searchParams.get("subjectId");
        const month = parseInt(searchParams.get("month"));
        const year = parseInt(searchParams.get("year"));

        if (!classId || !subjectId || isNaN(month) || isNaN(year)) {
            return NextResponse.json({ message: "Missing required params" }, { status: 400 });
        }

        // Role check: Teachers can only view assigned classes (simplified: check if they are a Teacher)
        // For now, allow viewing if they have access to the page, strict filtering can be added if needed.

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);

        // 1. Fetch Students
        const students = await User.find({
            "studentSpecificField.classId": classId,
            "studentSpecificField.status": "Active",
            roles: "Student",
        }).select("name _id studentSpecificField.batchId").sort({ _id: 1 });

        // 2. Fetch Attendance Records for the range
        const attendanceRecords = await Attendance.find({
            classId,
            subjectId,
            date: { $gte: startDate, $lte: endDate },
        }).populate("teacherId", "name");

        // 2.5 Fetch Leave Records for the range
        const leaveRecords = await LeaveRecord.find({
            classId,
            dateOfLeave: { $lte: endDate },
            $or: [
                { dateOfArrival: { $gte: startDate } },
                { arrivedDate: { $gte: startDate } } // Depending on how you want to treating open leaves
            ]
        });

        // 3. Transform DataMap
        // Map: studentId -> { dateStr: { present: bool, markedBy: string, markedAt: date } }
        const attendanceMap = {};
        const leavesMap = {}; // studentId -> { day: reason }

        attendanceRecords.forEach((record) => {
            const day = record.date.getDate(); // 1-31

            record.attendanceData.forEach((entry) => {
                if (!attendanceMap[entry.studentId]) {
                    attendanceMap[entry.studentId] = {};
                }

                attendanceMap[entry.studentId][day] = {
                    present: entry.present,
                    markedBy: record.teacherId?.name || "Unknown",
                    markedAt: record.updatedAt || record.createdAt,
                    recordId: record._id
                };
            });
        });

        // Process Leaves
        leaveRecords.forEach(leave => {
            const start = leave.dateOfLeave < startDate ? startDate : leave.dateOfLeave;
            const end = (leave.dateOfArrival && leave.dateOfArrival < endDate) ? leave.dateOfArrival : endDate;
            // Logic to iterate days between start and end and populate leavesMap
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === month) {
                    const day = d.getDate();
                    if (!leavesMap[leave.studentId]) leavesMap[leave.studentId] = {};
                    leavesMap[leave.studentId][day] = leave.leaveReason;
                }
            }
        });

        return NextResponse.json({
            students,
            attendanceMap,
            leavesMap
        });

    } catch (error) {
        console.error("Attendance Sheet API Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await validateUser(request);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Only College Admin can edit history
        if (!user.roles.includes("College Admin")) {
            return NextResponse.json({ message: "Permission denied. Only Admins can edit history." }, { status: 403 });
        }

        const body = await request.json();
        const { classId, subjectId, date, updates, batchId } = body;
        // updates: [{ studentId: "ID", present: boolean }]

        if (!classId || !subjectId || !date || !updates || !Array.isArray(updates)) {
            return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
        }

        const recordDate = new Date(date);
        // Reset time to 00:00:00 for storing (or keep UTC consistency)
        // Assuming backend standardizes on start of day for date matching
        recordDate.setUTCHours(0, 0, 0, 0);
        // Note: Project might use local time or specific normalizing. 
        // Ideally matching the existing Attendance creation logic.

        const targetDateStart = new Date(recordDate);
        const targetDateEnd = new Date(recordDate);
        targetDateEnd.setHours(23, 59, 59, 999);


        // Find existing record for this Day/Class/Subject
        // Note: The schema has unique index on { classId, subjectId, date, periodNumber }.
        // If periodNumber is used, we need to know WHICH period to update.
        // The requirement implies a single status per day per subject.
        // LIMITATION: If multiple periods exist for the same subject on the same day, this logic needs to know which one.
        // For now, assuming "Attendance Sheet" treats subject-daily-attendance as a single unit or we pick the first one found (or create one).

        // We will find ANY record for this subject/date.
        let attendanceRecord = await Attendance.findOne({
            classId,
            subjectId,
            date: { $gte: targetDateStart, $lte: targetDateEnd }
        });

        if (!attendanceRecord) {
            // Create new if strictly needed, but typically Admin edits EXISTING records.
            // If creating, we need a batchId and periodNumber.
            // Assuming Admin is fixing a specific day.

            return NextResponse.json({ message: "No attendance record found for this date. Please use Mark Attendance to create initialized records first." }, { status: 404 });
        }

        // Apply updates
        updates.forEach(update => {
            const studentIndex = attendanceRecord.attendanceData.findIndex(s => s.studentId === update.studentId);
            if (studentIndex >= 0) {
                attendanceRecord.attendanceData[studentIndex].present = update.present;
            } else {
                // Add if missing (unlikely if class matches)
                attendanceRecord.attendanceData.push({
                    studentId: update.studentId,
                    present: update.present
                });
            }
        });

        // Let's try saving.
        await attendanceRecord.save();

        return NextResponse.json({ message: "Attendance updated successfully" });

    } catch (error) {
        console.error("Attendance Update Error:", error);
        return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
    }
}
