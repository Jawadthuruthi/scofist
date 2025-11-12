import ErrorPage from "@/components/ErrorPage";
import Dashboard from "@/components/Dashboard";
import StudentDashboard from "@/components/StudentDashboard";
import { fetchData, WEEKDAYS } from "@/lib/utils";
import { cookies, headers } from "next/headers";
import FestDashboard from "@/components/FestDashboard";

const today = new Date();
const istTime = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);

const currentDay = WEEKDAYS[istTime.getDay()];

const API_ENDPOINTS = [
  {
    pathname: "classes",
  },
  {
    pathname: "batches",
  },
  {
    pathname: "users",
    searchParams:
      "projection=_id,name,email,profilePic,contactNumber,dateOfBirth,address&roles=Teacher&status=Active",
  },

  {
    pathname: "periods",
  },
  {
    pathname: "attendances",
    searchParams: `date=${istTime.toISOString().split("T")[0]}`,
  },
  {
    pathname: "settings",
  },
  {
    pathname: "leave-records",
    searchParams: "isArrived=false",
    key: "leaveRecords",
  },
  {
    pathname: "teachers-leave-record",
    searchParams: `date=${istTime.toISOString().split("T")[0]}`,
    key: "teachersLeaveRecord",
  },
];

export default async function DashboardPage() {
  try {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    if (["Program Committee", "Program Leader"].includes(activeRole)) {
      return <FestDashboard />;
    }

    const [
      classes,
      batches,
      teachers,
      periods,
      attendances,
      settings,
      leaveRecords,
      teachersLeaveRecord,
    ] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(
          endpoint.pathname,
          endpoint.searchParams,
          endpoint.revalidate,
          endpoint.key
        )
      )
    );

    const filteredLeaveRecords = leaveRecords.filter(
      (record) => record.studentStatus === "Active"
    );

    if (activeRole === "Student") {
      const headersList = headers();
      const user = JSON.parse(headersList.get("x-user"));
      return <StudentDashboard user={user} apiKey={apiKey} classes={classes} batches={batches} />;
    }

    return (
      <Dashboard
        apiKey={apiKey}
        classes={classes}
        batches={batches}
        teachers={teachers}
        periods={periods}
        attendances={attendances}
        settings={settings}
        activeRole={activeRole}
        leaveRecords={filteredLeaveRecords}
        teachersLeaveRecord={teachersLeaveRecord}
      />
    );
  } catch (error) {
    console.error("Error loading batches:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 60;
