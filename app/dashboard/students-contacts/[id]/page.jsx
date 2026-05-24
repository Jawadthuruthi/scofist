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
  { accessorKey: "contactNumber", header: "Contact", type: ["contactWithAlternative"] },
  { accessorKey: "guardianName", header: "Guardian Name", type: ["guardianNameWithRelationship"] },
  {
    accessorKey: "guardianContactNumber",
    header: "Guardian Contact",
    type: ["guardianContactWithAlternative"]
  },
];

const apiKey = process.env.API_KEY;

const StudentsContactsListPage = async ({ params }) => {
  try {
    const { id } = await params;
    let data = await fetchData(
      "users",
      `projection=_id,name,profilePic,contactNumber,alternativeNumber,studentSpecificField.guardianName,studentSpecificField.relationship,studentSpecificField.guardianContactNumber,studentSpecificField.guardianAlternativeNumber,admissionNumber,studentSpecificField.admissionNumber&classId=${id}&roles=Student&status=Active`
    );

    if (data && data.length > 0) {
      data = [...data].sort((a, b) => {
        const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
        const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });
    }

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
          showCsvBtn={true}
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
