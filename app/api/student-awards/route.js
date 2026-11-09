import { NextResponse, NextRequest } from "next/server";
import connectToDB from "@/lib/db";
import Rental from "@/models/Rental";
import Participant from "@/models/Participant";
import Result from "@/models/Result";
import Program from "@/models/Program";
import Team from "@/models/Team";
import Division from "@/models/Division";
import Mark from "@/models/Mark";
import User from "@/models/User";
import RankAchiever from "@/models/RankAchiever";
import { GET as getAttendanceToppers } from "@/app/api/attendanceToppers/route";
import { GET as getStar } from "@/app/api/performance/star/route";

export const dynamic = "force-dynamic";

// Helper to format date strings for the APIs
const formatDate = (date) => {
    return date.toISOString().split("T")[0];
};

const formatMonthYear = (date) => {
    return new Date(date).toLocaleString("en-US", { month: "long", year: "numeric" });
};

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId");
        const studentName = url.searchParams.get("studentName");
        const apiKey = req.headers.get("api-key");

        if (!studentId) {
            return NextResponse.json({ success: false, msg: "Missing studentId" }, { status: 400 });
        }

        const now = new Date();
        const studentAwards = [];
        const seenAwardKeys = new Set();

        const addAward = (award) => {
            const key = `${award.type}-${award.title}-${award.subtitle}-${award.period}`.toLowerCase();
            if (!seenAwardKeys.has(key)) {
                seenAwardKeys.add(key);
                studentAwards.push(award);
            }
        };

        // 1. FEST COMPETITION AWARDS (Stage, Off-Stage, Group & Individual across ALL Years)
        try {
            const idPattern = new RegExp(`^${studentId}`, "i");
            const orFilters = [{ _id: studentId }, { _id: idPattern }];
            if (studentName) {
                orFilters.push({ name: new RegExp(`^${studentName.trim()}$`, "i") });
            }

            const [participants, declaredResults] = await Promise.all([
                Participant.find({ $or: orFilters })
                    .populate("programs.id", "name category type divisionId year")
                    .populate("teamId", "name color")
                    .populate("divisionId", "name")
                    .lean(),
                Result.find({ isResultDeclared: true })
                    .populate({
                        path: "programId",
                        select: "name category type divisionId year",
                        populate: { path: "divisionId", select: "name" }
                    })
                    .populate("participants.id", "name teamId")
                    .lean(),
            ]);

            // Map all participant records for this student
            participants.forEach((p) => {
                if (Array.isArray(p.programs)) {
                    p.programs.forEach((prog) => {
                        const rank = prog.rank;
                        if (rank >= 1 && rank <= 3) {
                            const programDoc = prog.id;
                            const progName = programDoc?.name || "Fest Competition";
                            const progYear = programDoc?.year || p.year || "Fest Session";
                            const teamName = p.teamId?.name || "Team Member";
                            const rankBadge = rank === 1 ? "1st Place 🥇" : rank === 2 ? "2nd Place 🥈" : "3rd Place 🥉";
                            const color = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";

                            addAward({
                                type: "STUDENTS FEST",
                                title: rankBadge,
                                subtitle: progName,
                                extraInfo: `Team: ${teamName} | Points: ${prog.points || 0} | Grade: ${prog.grade || "N/A"}`,
                                period: progYear,
                                date: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
                                iconName: rank === 1 ? "Trophy" : "Award",
                                color,
                                rankLabel: `${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} Place`,
                                isFestWinner: true,
                            });
                        }
                    });
                }
            });

            // Cross-reference declared results for any wins
            declaredResults.forEach((res) => {
                if (!res.programId || !Array.isArray(res.participants)) return;

                res.participants.forEach((part) => {
                    if (part.rank >= 1 && part.rank <= 3) {
                        const partObj = part.id;
                        const partIdStr = String(partObj?._id || part.id || "");
                        const partName = partObj?.name || "";

                        const isMatch =
                            partIdStr.toLowerCase().startsWith(studentId.toLowerCase()) ||
                            partIdStr.toLowerCase() === studentId.toLowerCase() ||
                            (studentName && partName && partName.trim().toLowerCase() === studentName.trim().toLowerCase());

                        if (isMatch) {
                            const progName = res.programId.name || "Fest Competition";
                            const progYear = res.programId.year || res.year || "Fest Session";
                            const rank = part.rank;
                            const rankBadge = rank === 1 ? "1st Place 🥇" : rank === 2 ? "2nd Place 🥈" : "3rd Place 🥉";
                            const color = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";

                            addAward({
                                type: "STUDENTS FEST",
                                title: rankBadge,
                                subtitle: progName,
                                extraInfo: `Rank: ${rank} | Points: ${part.points || 0} | Grade: ${part.grade || "N/A"}`,
                                period: progYear,
                                date: res.declaredAt ? new Date(res.declaredAt).toISOString() : new Date().toISOString(),
                                iconName: rank === 1 ? "Trophy" : "Award",
                                color,
                                rankLabel: `${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} Place`,
                                isFestWinner: true,
                            });
                        }
                    }
                });
            });
        } catch (err) {
            console.warn("Fest winners check failed:", err.message);
        }

        // 2. BEST READER AWARDS (Instant single-query aggregation across ALL months in history)
        try {
            const bestReaderAgg = await Rental.aggregate([
                {
                    $match: {
                        rentedDate: { $exists: true, $ne: null }
                    }
                },
                {
                    $project: {
                        studentId: 1,
                        year: { $year: "$rentedDate" },
                        month: { $month: "$rentedDate" }
                    }
                },
                {
                    $group: {
                        _id: { year: "$year", month: "$month", studentId: "$studentId" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": -1, "_id.month": -1, count: -1 } }
            ]);

            // Top reader for each month
            const monthlyTops = new Map();
            bestReaderAgg.forEach((item) => {
                const key = `${item._id.year}-${item._id.month}`;
                if (!monthlyTops.has(key)) {
                    monthlyTops.set(key, item);
                }
            });

            monthlyTops.forEach((topItem) => {
                const topStudentId = String(topItem._id.studentId || "");
                if (topStudentId.toLowerCase() === studentId.toLowerCase()) {
                    const capturedDate = new Date(topItem._id.year, topItem._id.month - 1, 1);
                    addAward({
                        type: "BEST READER",
                        title: "Best Reader of the Month",
                        subtitle: "Library Achievement",
                        extraInfo: `${topItem.count} books borrowed`,
                        period: formatMonthYear(capturedDate),
                        date: capturedDate.toISOString(),
                        iconName: "BookOpen",
                        color: "amber",
                        rankLabel: "Best Reader",
                    });
                }
            });
        } catch (err) {
            console.warn("Best reader aggregation check failed:", err.message);
        }

        // 3. UNIVERSITY / BOARD RANK ACHIEVERS
        try {
            if (studentName) {
                const rankAchievers = await RankAchiever.find({
                    name: new RegExp(`^${studentName.trim()}$`, "i")
                }).lean();

                rankAchievers.forEach((ra) => {
                    addAward({
                        type: "RANK ACHIEVER",
                        title: `${ra.rank || "University"} Rank Holder 🏆`,
                        subtitle: ra.course || "Board Examination",
                        extraInfo: `${ra.college ? ra.college + " | " : ""}Year: ${ra.year}`,
                        period: `Academic Year ${ra.year}`,
                        date: ra.createdAt ? new Date(ra.createdAt).toISOString() : new Date().toISOString(),
                        iconName: "Trophy",
                        color: "gold",
                        rankLabel: ra.rank || "Rank Holder",
                    });
                });
            }
        } catch (err) {
            console.warn("Rank achiever check failed:", err.message);
        }

        // 4. ACADEMIC EXCELLENCE (Exam Mark Toppers across ALL recorded exams)
        try {
            let studentAdmn = "";
            let targetStudentName = studentName || "";
            try {
                const userDoc = await User.findById(studentId).select("name studentSpecificField.admissionNumber").lean();
                if (userDoc) {
                    studentAdmn = userDoc.studentSpecificField?.admissionNumber || "";
                    if (!targetStudentName && userDoc.name) targetStudentName = userDoc.name;
                }
            } catch { }

            const exams = await Mark.find()
                .populate("classId", "name")
                .populate({
                    path: "students.studentId",
                    select: "name _id studentSpecificField.admissionNumber studentSpecificField.classId"
                })
                .lean();

            exams.forEach((exam) => {
                if (!exam.students || !exam.students.length) return;

                const examSubjects = (exam.subjects || []).map((s) =>
                    typeof s === "string"
                        ? { name: s, maxMark: 100, passMark: 40, subColumns: [] }
                        : { name: s?.name || "", maxMark: Number(s?.maxMark) || 100, passMark: Number(s?.passMark) || 40, subColumns: s?.subColumns || [] }
                );

                const studentStats = exam.students.map((entry) => {
                    let marksObj = entry.marks;
                    if (marksObj instanceof Map) {
                        marksObj = Object.fromEntries(marksObj);
                    } else if (marksObj && typeof marksObj === "object") {
                        marksObj = marksObj;
                    } else {
                        marksObj = {};
                    }

                    let total = 0;
                    let maxTotal = 0;

                    examSubjects.forEach((subj) => {
                        const findMark = (key) => {
                            if (!key) return undefined;
                            if (marksObj[key] !== undefined) return marksObj[key];
                            const trimmed = key.trim().toLowerCase();
                            const foundKey = Object.keys(marksObj).find(k => k.trim().toLowerCase() === trimmed);
                            return foundKey ? marksObj[foundKey] : undefined;
                        };

                        const val = findMark(subj.name);

                        if (subj.subColumns && subj.subColumns.length > 0) {
                            subj.subColumns.forEach((sc) => {
                                const scName = typeof sc === "string" ? sc : (sc?.name || "");
                                const scMax = typeof sc === "string" ? 100 : (Number(sc?.maxMark) || 100);
                                let scVal = 0;
                                if (val && typeof val === "object") {
                                    if (val[scName] !== undefined) {
                                        scVal = Number(val[scName]) || 0;
                                    } else {
                                        const foundScKey = Object.keys(val).find(k => k.trim().toLowerCase() === scName.trim().toLowerCase());
                                        scVal = foundScKey ? (Number(val[foundScKey]) || 0) : 0;
                                    }
                                }
                                total += scVal;
                                maxTotal += scMax;
                            });
                        } else {
                            total += Number(val || 0);
                            maxTotal += subj.maxMark;
                        }
                    });

                    const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : "0.00";
                    const entryObj = entry.studentId;
                    const entryIdStr = String(entryObj?._id || entry.studentId || "").trim();
                    const entryNameStr = String(entryObj?.name || "").trim();
                    const entryAdmnStr = String(entryObj?.studentSpecificField?.admissionNumber || "").trim();

                    const isCurrentStudent = Boolean(
                        (entryIdStr && entryIdStr.toLowerCase() === studentId.toLowerCase()) ||
                        (studentAdmn && entryAdmnStr && entryAdmnStr.toLowerCase() === studentAdmn.toLowerCase()) ||
                        (targetStudentName && entryNameStr && entryNameStr.toLowerCase() === targetStudentName.trim().toLowerCase()) ||
                        (targetStudentName && entryIdStr.toLowerCase() === targetStudentName.trim().toLowerCase())
                    );

                    return {
                        studentId: entryIdStr,
                        studentName: entryNameStr,
                        total,
                        maxTotal,
                        percentage,
                        isCurrentStudent,
                    };
                });

                studentStats.sort((a, b) => b.total - a.total);
                if (studentStats.length > 0) {
                    const highestTotal = studentStats[0].total;
                    const isTopper = studentStats.find((s) => s.total === highestTotal && s.isCurrentStudent);

                    if (isTopper && isTopper.total > 0) {
                        const examName = exam.examName || "Term Examination";
                        const className = exam.classId?.name || "All Exams";
                        const examYear = exam.createdAt ? new Date(exam.createdAt).getFullYear() : "";

                        addAward({
                            type: "MARK TOPPER",
                            title: "Mark Topper 🏆",
                            subtitle: examName,
                            extraInfo: `Top Score: ${isTopper.total}${isTopper.maxTotal ? `/${isTopper.maxTotal}` : ""} (${isTopper.percentage}%)`,
                            period: className ? `${className}${examYear ? ` • ${examYear}` : ""}` : (examYear ? `Academic Year ${examYear}` : "Academic Examination"),
                            date: exam.createdAt ? new Date(exam.createdAt).toISOString() : new Date().toISOString(),
                            iconName: "Trophy",
                            color: "gold",
                            rankLabel: "Mark Topper",
                        });
                    }
                }
            });
        } catch (err) {
            console.warn("Marks toppers check failed:", err.message);
        }

        // 5. ATTENDANCE TOPPERS & STAR OF THE MONTH (Recent 4 months)
        try {
            const createMockReq = (path) => {
                const mockUrl = new URL(path, req.url);
                return new NextRequest(mockUrl, {
                    headers: { "api-key": apiKey || "" }
                });
            };

            const recentMonths = [];
            for (let i = 1; i <= 4; i++) {
                recentMonths.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
            }

            for (const date of recentMonths) {
                const month = date.getMonth();
                const year = date.getFullYear();

                const firstDay = formatDate(new Date(year, month, 1));
                const lastDay = formatDate(new Date(year, month + 1, 0));

                try {
                    const attRes = await getAttendanceToppers(
                        createMockReq(`/api/attendanceToppers?startDate=${firstDay}&endDate=${lastDay}&limit=100`)
                    ).then((r) => r.json()).catch(() => null);

                    if (attRes?.success && Array.isArray(attRes.attendanceToppers)) {
                        attRes.attendanceToppers.forEach((cls) => {
                            const topper = cls.students?.find(
                                (s) => String(s.studentId).toLowerCase() === studentId.toLowerCase()
                            );
                            if (topper) {
                                addAward({
                                    type: "ATTENDANCE TOPPER",
                                    title: "Attendance Topper",
                                    subtitle: cls.className || "Class Topper",
                                    extraInfo: topper.attendancePercentage != null ? `${topper.attendancePercentage}% Attendance` : undefined,
                                    period: formatMonthYear(date),
                                    date: new Date(year, month, 1).toISOString(),
                                    iconName: "Calendar",
                                    color: "emerald",
                                    rankLabel: "Attendance Topper",
                                });
                            }
                        });
                    }
                } catch { }

                try {
                    const starRes = await getStar(
                        createMockReq(`/api/performance/star?classId=all&month=${month + 1}&year=${year}`)
                    ).then((r) => r.json()).catch(() => null);

                    if (starRes?.success && Array.isArray(starRes.data)) {
                        starRes.data.forEach((st) => {
                            if (st.student && String(st.student.id || "").toLowerCase() === studentId.toLowerCase()) {
                                addAward({
                                    type: "STAR OF THE MONTH",
                                    title: "Star of the Month",
                                    subtitle: st.className || "Class Star",
                                    extraInfo: `Total Score: ${st.totalScore}`,
                                    period: formatMonthYear(date),
                                    date: new Date(year, month, 1).toISOString(),
                                    iconName: "Trophy",
                                    color: "gold",
                                    rankLabel: "Star Student",
                                });
                            }
                        });
                    }
                } catch { }
            }
        } catch (err) {
            console.warn("Attendance/Star check failed:", err.message);
        }

        // Sort all awards descending by date
        studentAwards.sort((a, b) => new Date(b.date) - new Date(a.date));

        return NextResponse.json({ success: true, awards: studentAwards }, { status: 200 });
    } catch (error) {
        console.error("Error in student-awards API:", error);
        return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
    }
}
