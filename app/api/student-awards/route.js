import { NextResponse, NextRequest } from "next/server";
import { GET as getBestReader } from "@/app/api/library/stats/best-reader/route";
import { GET as getAttendanceToppers } from "@/app/api/attendanceToppers/route";
import { GET as getStar } from "@/app/api/performance/star/route";
import { GET as getWinnerPosters } from "@/app/api/winner-posters/route";
import { GET as getIndividualToppers } from "@/app/api/individual-toppers/route";
import { GET as getMarksToppers } from "@/app/api/marks/toppers/route";

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
        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId");
        const studentName = url.searchParams.get("studentName");
        const apiKey = req.headers.get("api-key");

        if (!studentId) {
            return NextResponse.json({ success: false, msg: "Missing studentId" }, { status: 400 });
        }

        const monthsToCheck = 36;
        const bestReaderPromises = [];
        const attendancePromises = [];
        const starPromises = [];
        
        // Helper to construct a mock request for internal routing
        const createMockReq = (path) => {
            const mockUrl = new URL(path, req.url);
            return new NextRequest(mockUrl, {
                headers: { "api-key": apiKey || "" }
            });
        };

        for (let m = 1; m <= monthsToCheck; m++) {
            const date = new Date();
            date.setMonth(date.getMonth() - m);
            const month = date.getMonth();
            const year = date.getFullYear();
            
            const firstDayDate = new Date(year, month, 1);
            const lastDayDate = new Date(year, month + 1, 0);
            const firstDay = formatDate(firstDayDate);
            const lastDay = formatDate(lastDayDate);

            // Best Reader
            bestReaderPromises.push(
                getBestReader(createMockReq(`/api/library/stats/best-reader?month=${month}&year=${year}`))
                    .then(res => res.json())
                    .then(data => ({ data, type: 'best-reader', capturedDate: new Date(date) }))
                    .catch(() => null)
            );

            // Attendance Toppers
            attendancePromises.push(
                getAttendanceToppers(createMockReq(`/api/attendanceToppers?startDate=${firstDay}&endDate=${lastDay}&limit=100`))
                    .then(res => res.json())
                    .then(data => ({ data, type: 'attendance', capturedDate: new Date(date) }))
                    .catch(() => null)
            );

            // Star of the month
            starPromises.push(
                getStar(createMockReq(`/api/performance/star?classId=all&month=${month + 1}&year=${year}`))
                    .then(res => res.json())
                    .then(data => ({ data, type: 'star', capturedDate: new Date(date) }))
                    .catch(() => null)
            );
        }

        // Global Awards
        const winnersPromise = getWinnerPosters(createMockReq(`/api/winner-posters`))
            .then(res => res.json())
            .then(data => ({ data, type: 'winners' }))
            .catch(() => null);

        const individualToppersPromise = getIndividualToppers(createMockReq(`/api/individual-toppers`))
            .then(res => res.json())
            .then(data => ({ data, type: 'individual' }))
            .catch(() => null);

        const marksToppersPromise = getMarksToppers(createMockReq(`/api/marks/toppers`))
            .then(res => res.json())
            .then(data => ({ data, type: 'marks' }))
            .catch(() => null);

        const results = await Promise.all([
            ...bestReaderPromises,
            ...attendancePromises,
            ...starPromises,
            winnersPromise,
            individualToppersPromise,
            marksToppersPromise
        ]);

        const studentAwards = [];

        results.forEach(result => {
            if (!result || !result.data) return;

            if (result.type === 'best-reader') {
                const res = result.data;
                const bestReaderId = res.data?.student?._id;
                if (res.success && bestReaderId && String(bestReaderId) === String(studentId)) {
                    studentAwards.push({
                        type: "BEST READER",
                        title: "Best Reader of the Month",
                        subtitle: "Library Achievement",
                        extraInfo: `${res.data.count} books borrowed`,
                        period: formatMonthYear(result.capturedDate),
                        date: new Date(result.capturedDate.getFullYear(), result.capturedDate.getMonth(), 1).toISOString(),
                        iconName: "BookOpen",
                        color: "amber",
                        rankLabel: "Best Reader"
                    });
                }
            }
            else if (result.type === 'attendance') {
                const res = result.data;
                if (res.success && res.attendanceToppers?.length > 0) {
                    res.attendanceToppers.forEach(classResult => {
                        const topperEntry = classResult.students.find(s => String(s.studentId) === String(studentId));
                        if (topperEntry) {
                            studentAwards.push({
                                type: "ATTENDANCE TOPPER",
                                title: "Attendance Topper",
                                subtitle: classResult.className || "Class Topper",
                                extraInfo: topperEntry.attendancePercentage != null ? `${topperEntry.attendancePercentage}% Attendance` : undefined,
                                period: formatMonthYear(result.capturedDate),
                                date: new Date(result.capturedDate.getFullYear(), result.capturedDate.getMonth(), 1).toISOString(),
                                iconName: "Calendar",
                                color: "emerald",
                                rankLabel: "Topper"
                            });
                        }
                    });
                }
            }
            else if (result.type === 'star') {
                const res = result.data;
                if (res.success && res.data) {
                    res.data.forEach(starData => {
                        if (starData.student && String(starData.student.id) === String(studentId)) {
                            studentAwards.push({
                                type: "STAR OF THE MONTH",
                                title: "Star of the Month",
                                subtitle: starData.className || "Class Star",
                                extraInfo: `Total Score: ${starData.totalScore}`,
                                period: formatMonthYear(result.capturedDate),
                                date: new Date(result.capturedDate.getFullYear(), result.capturedDate.getMonth(), 1).toISOString(),
                                iconName: "Trophy",
                                color: "gold",
                                rankLabel: "Star Student"
                            });
                        }
                    });
                }
            }
            else if (result.type === 'winners') {
                const res = result.data;
                if (res.success && res.programs) {
                    res.programs.forEach(prog => {
                        prog.winners.forEach(w => {
                            const winnerId = String(w._id || "").split("-")[0];
                            const isMatch =
                                winnerId === String(studentId) ||
                                String(w._id) === String(studentId) ||
                                (w.name && studentName && w.name.trim().toUpperCase() === studentName.trim().toUpperCase());

                            if (isMatch) {
                                let awardInfo = null;
                                if (w.rank === 1) awardInfo = { type: "STUDENTS FEST", title: "1st Place 🥇", color: "gold", iconName: "Trophy", rankLabel: "1st Place" };
                                else if (w.rank === 2) awardInfo = { type: "STUDENTS FEST", title: "2nd Place 🥈", color: "silver", iconName: "Award", rankLabel: "2nd Place" };
                                else if (w.rank === 3) awardInfo = { type: "STUDENTS FEST", title: "3rd Place 🥉", color: "bronze", iconName: "Award", rankLabel: "3rd Place" };

                                if (awardInfo) {
                                    studentAwards.push({
                                        ...awardInfo,
                                        subtitle: prog.name,
                                        extraInfo: `Team: ${w.teamName} | Grade: ${w.grade || 'N/A'} | Points: ${w.points || 0}`,
                                        period: prog.division || "Competition Result",
                                        date: new Date().toISOString(),
                                        isFestWinner: true // Flag to tell client to prepend fest settings
                                    });
                                }
                            }
                        });
                    });
                }
            }
            else if (result.type === 'individual') {
                const res = result.data;
                if (res.success && res.data) {
                    res.data.forEach(topper => {
                        if (String(topper._id) === String(studentId) || topper.name === studentName) {
                            studentAwards.push({
                                type: "TOPPER",
                                title: "Overall Division Topper",
                                subtitle: `${topper.divisionName} Category`,
                                period: `Accrued ${topper.points} Points`,
                                date: new Date().toISOString(),
                                iconName: "Award",
                                color: "indigo"
                            });
                        }
                    });
                }
            }
            else if (result.type === 'marks') {
                const res = result.data;
                if (res.success && res.data) {
                    res.data.forEach(examGroup => {
                        const topperEntry = examGroup.toppers.find(t => String(t.studentId) === String(studentId));
                        if (topperEntry) {
                            studentAwards.push({
                                type: "MARKS TOPPER",
                                title: "Academic Excellence",
                                subtitle: `${examGroup.examName}`,
                                extraInfo: `Score: ${topperEntry.total} (${topperEntry.percentage}%)`,
                                period: examGroup.className,
                                date: new Date().toISOString(),
                                iconName: "Trophy",
                                color: "indigo",
                                rankLabel: "Topper"
                            });
                        }
                    });
                }
            }
        });

        // Sort awards by date descending
        studentAwards.sort((a, b) => new Date(b.date) - new Date(a.date));

        return NextResponse.json({ success: true, awards: studentAwards }, { status: 200 });

    } catch (error) {
        console.error("Error in student-awards API:", error);
        return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
    }
}
