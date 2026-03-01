import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import StudentsContactsTable from "./StudentsContactsTable";
import { fetchData } from "@/lib/utils";

const StudentsContactsPage = async () => {
  try {
    const classes = await fetchData("classes", "projection=_id,name");
    return (
      <>
        <Header
          title="STUDENTS CONTACTS"
          subTitle="Browse The List Of Students Contacts By Class"
        />
        <StudentsContactsTable data={classes} apiKey={process.env.API_KEY} />
      </>
    );
  } catch (error) {
    console.error("Error loading students:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default StudentsContactsPage;
export const revalidate = 60;
