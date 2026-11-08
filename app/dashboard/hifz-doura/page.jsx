import { fetchData, parseUser, sortTeachers, sortClasses } from "@/lib/utils";
import { headers } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import HifzDoura from "@/components/HifzDoura";

const apiKey = process.env.API_KEY;

const HifzDouraPage = async () => {
  try {
    const headerStore = await headers();
    const user = parseUser(headerStore);

    const [classes, teachers] = await Promise.all([
      fetchData("classes", "status=Active&projection=_id,name,shortname", 0),
      fetchData("users", "roles=Teacher&projection=_id,name,dateOfBirth", 0),
    ]);

    const sortedClasses = Array.isArray(classes)
      ? [...classes].sort((a, b) => {
          const classCompare = sortClasses(a, b);
          if (classCompare !== 0) return classCompare;
          return String(a.name || "").localeCompare(String(b.name || ""));
        })
      : [];

    return (
      <HifzDoura
        apiKey={apiKey}
        classes={sortedClasses}
        teachers={Array.isArray(teachers) ? sortTeachers(teachers) : []}
        currentUser={user}
      />
    );
  } catch (error) {
    console.error("Error loading Hifz & Doura page:", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading the Hifz & Doura page."
      />
    );
  }
};

export default HifzDouraPage;
export const revalidate = 0;
