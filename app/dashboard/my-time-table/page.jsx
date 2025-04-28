import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import { fetchData, parseUser } from "@/lib/utils";
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

    const today = new Date();
    const startDate = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const API_ENDPOINTS = [
      {
        pathname: "classes",
      },
      {
        pathname: "timeTables",
        searchParams: `teacherId=${user?._id}`,
      },
      {
        pathname: "periods",
      },
      {
        pathname: "attendances",
        searchParams: `teacherId=${user?._id}&startDate=${startDate.toISOString().split("T")[0]}&endDate=${endDate.toISOString().split("T")[0]}`,
      },
    ];

    const [classes, timeTable, periods, attendances] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, token, endpoint.searchParams)
      )
    );
    return (
      <>
        <Header title="MY TIME TABLE" subTitle="View Teaching Schedule" />
        <TimeTableComponent
          token={token}
          teacherId={user?._id}
          periods={periods}
          timeTable={timeTable}
          attendances={attendances}
        />
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
