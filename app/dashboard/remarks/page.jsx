import RemarksClient from "./RemarksClient";
import ErrorPage from "@/components/ErrorPage";
import { fetchData, formatOptions, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function RemarksPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;
    const user = parseUser(headerStore);

    // Fetch classes for dropdown
    const classesData = await fetchData("classes", "projection=_id,name", 0);
    const classes = formatOptions(classesData);

    // Fetch teachers for dropdown
    const teachersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/users?roles=Teacher&limit=1000`, {
      headers: { "api-key": apiKey || "" },
      cache: "no-store",
    });
    let teachers = [];
    if (teachersResponse.ok) {
      const data = await teachersResponse.json();
      teachers = formatOptions(data.users || []);
    }

    return (
      <RemarksClient
        apiKey={apiKey}
        activeRole={activeRole}
        user={user}
        classes={classes}
        teachers={teachers}
      />
    );
  } catch (error) {
    console.error("Critical error in RemarksPage:", error);
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

export const revalidate = 60;
