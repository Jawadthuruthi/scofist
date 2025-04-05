import ErrorPage from "@/components/ErrorPage";
import Attendance from "@/components/Attendance";
import { parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

const AttendancePage = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    const headerStore = await headers();
    const user = parseUser(headerStore);
    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }
    return <Attendance token={token} teacherId={user?._id} />;
  } catch (error) {
    console.error("Error :", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default AttendancePage;
