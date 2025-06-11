import ErrorPage from "@/components/ErrorPage";
import StudentsFund from "@/components/StudentsFund";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

const API_ENDPOINTS = [
  {
    pathname: "users",
    searchParams:
      "projection=_id,name,profilePic,studentSpecificField&status=Active&roles=Student",
  },
  {
    pathname: "classes",
  },
];
const StudentsFundPage = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const user = parseUser(headerStore);

  const activeRole = cookieStore.get("active-role")?.value;
  const apiKey = process.env.API_KEY;

  try {
    const [students, classes] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    return (
      <StudentsFund
        classes={classes}
        students={students}
        role={activeRole}
        teacherId={user?.userId}
        apiKey={apiKey}
      />
    );
  } catch (error) {
    console.error("Error loading batches:", error.message);
    <ErrorPage
      statusCode={500}
      title="Something went wrong"
      description="We encountered an unexpected error. Our team has been notified and is working to resolve the issue."
    />;
  }
};

export default StudentsFundPage;

export const revalidate = 60;
