import ErrorPage from "@/components/ErrorPage";
import Remarks from "@/components/Remarks";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

const API_ENDPOINTS = [
  {
    pathname: "classes",
  },
  {
    pathname: "users",
    searchParams: "projection=_id,name&roles=Teacher",
  },
  {
    pathname: "users",
    searchParams: "projection=_id,name&roles=Student",
  },
];

const RemarksPage = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const user = parseUser(headerStore);

  const activeRole = cookieStore.get("active-role")?.value;
  const apiKey = process.env.API_KEY;

  try {
    const [classes, teachers, students] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    return (
      <Remarks
        classes={classes}
        teachers={teachers}
        students={students}
        role={activeRole}
        apiKey={apiKey}
      />
    );
  } catch (error) {
    console.error("Error loading data for remarks page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Something went wrong"
        description="We encountered an unexpected error. Our team has been notified and is working to resolve the issue."
      />
    );
  }
};

export default RemarksPage;

export const revalidate = 60;
