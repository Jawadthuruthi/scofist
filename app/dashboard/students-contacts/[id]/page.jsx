import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TableComponent from "@/components/TableComponent";
import { fetchData } from "@/lib/utils";

const columnsConfig = [
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: ["serialNo"],
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  {
    accessorKey: "profilePic",
    header: "Image",
    type: ["avatar"],
    width: 70,
    maxWidth: 70,
    minWidth: 70,
  },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "contactNumber", header: "Contact" },
  { accessorKey: "guardianName", header: "Guardian Name" },
  {
    accessorKey: "guardianContactNumber",
    header: "Guardian Contact",
  },
];

const apiKey = process.env.API_KEY;

const StudentsContactsListPage = async ({ params }) => {
  try {
    const { id } = await params;
    const data = await fetchData(
      "users",
      `projection=_id,name,profilePic,contactNumber,studentSpecificField.guardianName,studentSpecificField.guardianContactNumber&classId=${id}&roles=Student`
    );

    return (
      <>
        <Header
          title={
            data?.length > 0 ? data[0].className : "STUDENTS CONTACTS LIST"
          }
          subTitle="View Students Contact Details"
        />
        <TableComponent
          data={data}
          columnsConfig={columnsConfig}
          printTitle={`Students Contacts${data?.length > 0 ? ` - ${data[0].className}` : ""}`}
          apiKey={apiKey}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading students contacts:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default StudentsContactsListPage;
export const revalidate = 60;
