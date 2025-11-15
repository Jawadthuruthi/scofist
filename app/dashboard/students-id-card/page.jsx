import ErrorPage from "@/components/ErrorPage";
import StudentsIdCard from "@/components/StudentsIdCard";
import { fetchData } from "@/lib/utils";

export const revalidate = 60;
const studentsIdCardPage = async () => {
  try {
    const [students, settings, classes, teachers] = await Promise.all([
      fetchData("users", "roles=Student&status=Active"),
      fetchData("settings"),
      fetchData("classes"),
      fetchData("users", "roles=Teacher"),
    ]);

    return (
      <StudentsIdCard
        students={students}
        institution={settings.institution}
        idCardBackgroundImageUrl={settings.idCard?.backgroundImage?.url}
        classes={classes}
        teachers={teachers}
      />
    );
  } catch (error) {
    console.error("Error loading students id card:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default studentsIdCardPage;
