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
      "projection=_id,name,email,profilePic,contactNumber,dateOfBirth&roles=Teacher&status=Active",
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
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    const [classes, batches, teachers, timeTable, periods, attendances] =
      await Promise.all(
        API_ENDPOINTS.map((endpoint) =>
          fetchData(endpoint.pathname, apiKey, endpoint.searchParams)
        )
      );

    return (
      <Dashboard
        apiKey={apiKey}
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
