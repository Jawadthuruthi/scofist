import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import { parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

const MyTimeTablePage = async () => {
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
    return (
      <>
        <Header title="MY TIME TABLE" subTitle="View Teaching Schedule" />
        <TimeTableComponent token={token} teacherId={user?._id} />
      </>
    );
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

export default MyTimeTablePage;

export const revalidate = 60;
