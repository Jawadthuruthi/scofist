import PerformanceClient from "./PerformanceClient";
import ErrorPage from "@/components/ErrorPage";
import { fetchData, formatOptions, parseUser, sortTeachers } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function PerformancePage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    let user = {};
    try {
      user = parseUser(headerStore);
    } catch (e) {
      console.error("Error parsing user:", e);
    }

    // Fetch classes for dropdown
    let classes = [];
    try {
      const classesData = await fetchData("classes", "projection=_id,name", 0);
      classes = formatOptions(classesData);
    } catch (e) {
      console.error("Error fetching classes:", e);
    }

    // Fetch teachers for dropdown
    let teachers = [];
    try {
      const teachersData = await fetchData("users", "roles=Teacher&limit=1000&sort=asc", 0, "users");
      teachers = formatOptions(sortTeachers(teachersData));
    } catch (e) {
      console.error("Error fetching teachers:", e);
    }

    return (
      <PerformanceClient
        apiKey={apiKey}
        activeRole={activeRole}
        user={user}
        classes={classes}
        teachers={teachers}
      />
    );
  } catch (error) {
    console.error("Critical error in PerformancePage:", error);
    if (error.cause) console.error("Caused by:", error.cause);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 0;
