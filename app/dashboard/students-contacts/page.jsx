import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import StudentsContactsTable from "./StudentsContactsTable";
import { fetchData } from "@/lib/utils";

const StudentsContactsPage = async () => {
  try {
    const [classes, batches] = await Promise.all([
      fetchData("classes", "projection=_id,name,status,batchId"),
      fetchData("batches", "projection=_id,name,status"),
    ]);

    const activeBatchIds = new Set(
      (batches || [])
        .filter((b) => ["Active", "Activated", "Acivated"].includes(b.status))
        .map((b) => String(b._id))
    );

    const activeClasses = (classes || []).filter((cls) => {
      const clsBatchId = cls.batchId?._id || cls.batchId;
      const isBatchActive = activeBatchIds.has(String(clsBatchId));
      const isClassActive = cls.status === "Active" || !cls.status;
      return isBatchActive && isClassActive;
    });

    return (
      <>
        <Header
          title="STUDENTS CONTACTS"
          subTitle="Browse The List Of Students Contacts By Class"
        />
        <StudentsContactsTable data={activeClasses} apiKey={process.env.API_KEY} />
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
