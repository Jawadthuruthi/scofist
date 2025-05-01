import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TableComponent from "@/components/TableComponent";
import { fetchData } from "@/lib/utils";

const columnsConfig = [
  { accessorKey: "name", header: "Classes" },
  {
    accessorKey: "/dashboard/students-contacts",
    header: "",
    endpointKey: "_id",
    type: ["externalLink"],
    width: 50,
    minWidth: 50,
    maxWidth: 50,
  },
];
const StudentsContactsPage = async () => {
  try {
    const classes = await fetchData("classes", "projection=_id,name");
    return (
      <>
        <Header
          title="STUDENTS CONTACTS"
          subtitle="Browse The List Of Students Contacts By Class"
        />
        <TableComponent
          data={classes}
          columnsConfig={columnsConfig}
          apiKey={process.env.API_KEY}
          hidePrintBtn={true}
        />
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
