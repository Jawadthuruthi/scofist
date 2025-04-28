import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import Dashboard from "@/components/Dashboard";
import { fetchData, WEEKDAYS } from "@/lib/utils";

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
      "projection=_id,name,email,profilePic,contactNumber&roles=Teacher&status=Active",
  },
  {
    pathname: "timeTables",
    searchParams: `day=${currentDay}`,
  },
  {
    pathname: "periods",
  },
  {
    pathname: "attendances",
    searchParams: `date=${istTime.toISOString().split("T")[0]}`,
  },
];

export default async function DashboardPage() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    const activeRole = cookieStore.get("active-role")?.value;

    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

    const [classes, batches, teachers, timeTable, periods, attendances] =
      await Promise.all(
        API_ENDPOINTS.map((endpoint) =>
          fetchData(endpoint.pathname, token, endpoint.searchParams)
        )
      );

    return (
      <Dashboard
        token={token}
        role={activeRole}
        classes={classes}
        batches={batches}
        teachers={teachers}
        timeTable={timeTable}
        periods={periods}
        attendances={attendances}
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
