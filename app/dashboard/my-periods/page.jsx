import ErrorPage from "@/components/ErrorPage";
import MyPeriods from "@/components/MyPeriods";
import { getISTDateString, parseUser, WEEKDAYS } from "@/lib/utils";
import { getCachedSettings } from "@/lib/settings";
import { resolvePeriodsPayload } from "@/lib/periods";
import { headers } from "next/headers";

import connectToDB from "@/lib/db";
import User from "@/models/User";
import Period from "@/models/Period";
import TimeTable from "@/models/TimeTable";
import Attendance from "@/models/Attendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import Subject from "@/models/Subject";

const MyPeriodsPage = async ({ searchParams }) => {
  try {
    const apiKey = process.env.API_KEY;

    const [headerStore, resolvedSearchParams, settingsDoc] = await Promise.all([
      headers(),
      searchParams,
      getCachedSettings(),
    ]);
    const userPayload = parseUser(headerStore);
    const teacherId = userPayload?._id || userPayload?.userId || "";
    const todayDS = getISTDateString(new Date());

    const rawDateParam =
      typeof resolvedSearchParams?.date === "string"
        ? resolvedSearchParams.date
        : "";
    const validUrlDate =
      /^\d{4}-\d{2}-\d{2}$/.test(rawDateParam) && rawDateParam <= todayDS
        ? rawDateParam
        : null;

    const allowPrev = settingsDoc?.general?.allowPreviousDayAttendance !== false;
    const targetDateStr =
      validUrlDate && (validUrlDate === todayDS || allowPrev)
        ? validUrlDate
        : todayDS;

    const [ty, tm, td] = targetDateStr.split("-").map(Number);
    const targetDayName = WEEKDAYS[new Date(Date.UTC(ty, tm - 1, td)).getUTCDay()];
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);
    const nextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    await connectToDB();

    const [
      user,
      allPeriods,
      rawTimeTables,
      attendances,
      leaveRecords,
      subjectsList,
    ] = await Promise.all([
      teacherId
        ? User.findById(teacherId)
            .select("name teacherSpecificField.status")
            .lean()
        : Promise.resolve(null),
      Period.find({}).sort({ periodNumber: 1 }).limit(500).lean(),
      teacherId
        ? TimeTable.find({
            timeSlots: { $elemMatch: { teacherId, day: targetDayName } },
          })
            .select("classId timeSlots")
            .populate({
              path: "classId",
              select: "name shortname batchId section",
              populate: { path: "batchId", select: "name" },
            })
            .limit(100)
            .lean()
        : Promise.resolve([]),
      teacherId
        ? Attendance.find({
            teacherId,
            date: { $gte: startOfDay, $lte: endOfDay },
          })
            .select("classId subjectId teacherId periodNumber day date")
            .populate("classId", "name")
            .populate("subjectId", "name")
            .populate("teacherId", "name")
            .sort({ date: -1 })
            .limit(100)
            .lean()
        : Promise.resolve([]),
      teacherId
        ? TeachersLeaveRecord.find({
            teacherId,
            date: { $gte: startOfDay, $lt: nextDay },
          })
            .select("teacherId classId periodNumber date leaveReason")
            .populate("classId", "name")
            .sort({ date: -1, _id: -1 })
            .limit(100)
            .lean()
        : Promise.resolve([]),
      Subject.find({}).select("_id name").sort({ _id: 1 }).limit(500).lean(),
    ]);

    const subjectMap = new Map(subjectsList.map((s) => [String(s._id), s]));
    const timeTables = rawTimeTables
      .map((tt) => {
        const slots = (tt.timeSlots || [])
          .filter(
            (slot) =>
              String(slot.teacherId) === String(teacherId) &&
              slot.day === targetDayName
          )
          .map((slot) => ({
            ...slot,
            subjectId: slot.subjectId
              ? subjectMap.get(String(slot.subjectId)) || slot.subjectId
              : slot.subjectId,
          }));
        return { ...tt, timeSlots: slots };
      })
      .filter((tt) => tt.timeSlots.length > 0);

    const periodsPayload = resolvePeriodsPayload({
      settings: settingsDoc,
      allPeriods,
      dateParam: targetDateStr,
      page: 0,
      limit: Infinity,
    });

    const isPrincipal = user?.teacherSpecificField?.status === "Principal";
    const initialSettings = settingsDoc
      ? JSON.parse(JSON.stringify({ general: settingsDoc.general }))
      : null;

    const initialData = JSON.parse(
      JSON.stringify({
        date: targetDateStr,
        day: targetDayName,
        periodsData: periodsPayload,
        timeTablesData: { timeTables },
        attendanceData: { attendances },
        leaveRecordData: { teachersLeaveRecord: leaveRecords },
        subjectsData: { subjects: subjectsList },
      })
    );

    return (
      <MyPeriods
        apiKey={apiKey}
        teacherId={teacherId}
        isPrincipal={isPrincipal}
        initialSettings={initialSettings}
        initialTeacherName={user?.name || userPayload?.name || ""}
        initialData={initialData}
      />
    );
  } catch (error) {
    console.error("Error :", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default MyPeriodsPage;

export const revalidate = 0;
