import AttendanceSheet from "@/components/masjid-attendance/AttendanceSheet";
import { headers } from "next/headers";
import { parseUser } from "@/lib/utils";

const MarkGeneralAttendancePage = async ({ searchParams }) => {
    const apiKey = process.env.API_KEY;
    const headerStore = await headers();
    const user = parseUser(headerStore);

    const params = await searchParams;
    const { classId, className, batchId, prayer, date, sessionLabel } = params;

    return (
        <AttendanceSheet
            classId={classId}
            className={className}
            batchId={batchId}
            prayer={prayer}
            date={date}
            apiKey={apiKey}
            user={user}
            sessionLabel={sessionLabel}
        />
    );
};

export default MarkGeneralAttendancePage;
