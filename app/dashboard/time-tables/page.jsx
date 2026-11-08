import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TimeTablesManagements from "@/components/TimeTablesManagements";
import { fetchData, sortTeachers, sortClasses } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "periods",
  },
  {
    pathname: "subjects",
  },
  {
    pathname: "users",
    searchParams: "roles=Teacher&projection=_id,name,dateOfBirth",
  },
  {
    pathname: "classes",
    searchParams: "status=Active&projection=_id,name,shortname,coreSubjects,majorSubjects,status",
  },
];

const TimeTablePage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    let [periods, subjects, teachers, classes] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    if (teachers && teachers.length > 0) {
      teachers = sortTeachers(teachers);
    }

    if (classes && classes.length > 0) {
      classes = [...classes]
        .filter((c) => c?.status !== "Closed")
        .sort((a, b) => {
        const classCompare = sortClasses(a, b);
        if (classCompare !== 0) return classCompare;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
    }

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
          apiKey={apiKey}
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
