import { redirect } from "next/navigation";

export default async function MasjidAttendanceRedirect({ searchParams }) {
    const params = await searchParams;
    const queryString = new URLSearchParams(params).toString();
    redirect(`/dashboard/general-attendance${queryString ? `?${queryString}` : ""}`);
}
