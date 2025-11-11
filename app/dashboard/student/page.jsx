import { headers } from "next/headers";
import StudentDashboard from "@/components/StudentDashboard";
import Header from "@/components/Header";
import { Calendar } from "lucide-react";
import { formatDateForDisplay } from "@/lib/utils";
import ErrorPage from "@/components/ErrorPage";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";

async function getStudentAttendance(studentId) {
  if (!studentId) return [];

  try {
    await connectToDB();
    const studentAttendance = await StudentAttendance.findOne({ studentId });
    return studentAttendance?.attendanceRecords || [];
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return []; // Return empty array on error
  }
}

export default async function StudentDashboardPage() {
  const headersList = await headers();
  const userHeader = headersList.get("x-user");

  if (!userHeader) {
     return (
      <ErrorPage
        statusCode={401}
        title="Unauthorized"
        description="You are not authorized to view this page."
      />
    );
  }

  const user = JSON.parse(userHeader);
  const attendanceRecords = await getStudentAttendance(user._id);

  const currentDate = formatDateForDisplay(new Date());

  return (
    <div className="flex flex-col">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />
      <StudentDashboard user={user} attendanceRecords={attendanceRecords} />
    </div>
  );
}
