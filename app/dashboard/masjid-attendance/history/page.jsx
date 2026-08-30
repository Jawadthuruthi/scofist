import { redirect } from "next/navigation";

export default async function MasjidAttendanceHistoryRedirect({ searchParams }) {
    const params = await searchParams;
    const queryString = new URLSearchParams(params).toString();
    redirect(`/dashboard/general-attendance/history${queryString ? `?${queryString}` : ""}`);
}
