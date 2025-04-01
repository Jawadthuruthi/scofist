import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TimeTablesManagements from "@/components/TimeTablesManagements";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";

const API_ENDPOINTS = [
  {
    pathname: "periods",
  },
  {
    pathname: "subjects",
  },
  {
    pathname: "users",
    searchParams: "role=Teacher&projection=_id,name",
  },
  {
    pathname: "classes",
    searchParams: "projection=_id,name",
  },
];

const TimeTablePage = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

    const [periods, subjects, teachers, classes] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, token, endpoint.searchParams)
      )
    );

    return (
      <>
        <Header
          title="TIME TABLES MANAGEMENT"
          subTitle="Organize and Oversee Time Tables"
        />
        <TimeTablesManagements
          periods={periods}
          subjects={subjects}
          teachers={teachers}
          classes={classes}
          token={token}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading classes:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default TimeTablePage;

export const revalidate = 0;
