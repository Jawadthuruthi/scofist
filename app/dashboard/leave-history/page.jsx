import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";

const columnsConfig = [
  {
    id: "select",
    header: "Select",
    type: ["checkbox"],
    width: 50,
    maxWidth: 50,
    minWidth: 50,
  },
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: ["serialNo"],
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  { accessorKey: "studentId", header: "Student ID" },
  { accessorKey: "studentName", header: "Student Name" },
  { accessorKey: "className", header: "Class" },
  { accessorKey: "dateOfLeave", header: "Date of Leave", type: ["date"] },
  { accessorKey: "leaveReason", header: "Reason" },
  { accessorKey: "dateOfArrival", header: "Date of Arrival", type: ["date"] },
  { accessorKey: "arrivedDate", header: "Arrived Date", type: ["date"] },
  { accessorKey: "lateReason", header: "Late Reason" },
  { accessorKey: "remark", header: "Remark" },
];

const filterConfig = [
  { id: "studentName", label: "StudentName" },
  { id: "className", label: "Class" },
  { id: "dateOfLeave", label: "Date of Leave", type: "date" },
  { id: "dateOfArrival", label: "Date of Arrival", type: "date" },
  { id: "arrivedDate", label: "Arrived Date", type: "date" },
  {
    id: "remark",
    label: "Remark",
    type: "text",
    inputType: "select",
    options: [
      { value: "Very Good", label: "Very Good" },
      { value: "Good", label: "Good" },
      { value: "Acceptable", label: "Acceptable" },
      { value: "Bad", label: "Bad" },
      { value: "Very Bad", label: "Very Bad" },
    ],
  },
];

export default async function LeaveHistoryPage() {
  try {
    const apiKey = process.env.API_KEY;

    return (
      <>
        <Header
          title="LEAVE HISTORY MANAGEMENT"
          subTitle="Organize and Oversee Leave History"
        />
        <DataTableComponent
          apiEndpoint="leave-records"
          resource="leaveRecords"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          filterConfig={filterConfig}
          limit={20}
          readOnly={true}
          printTitle={"Leave History"}
          enableDelete={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading leave-records:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 60;
