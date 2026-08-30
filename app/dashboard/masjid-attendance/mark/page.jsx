import { redirect } from "next/navigation";

export default async function MasjidAttendanceMarkRedirect({ searchParams }) {
    const params = await searchParams;
    const queryString = new URLSearchParams(params).toString();
    redirect(`/dashboard/general-attendance/mark${queryString ? `?${queryString}` : ""}`);
}
