import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

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

export default async function LeaveHistoryPage() {
  try {
    const apiKey = process.env.API_KEY;
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;

    const classes = await fetchData("classes");

    const apiFilters = {
      classIds:
        activeRole === "Teacher"
          ? classes
              ?.filter((cls) => cls?.teacherId === user?._id)
              .map((cls) => cls._id)
              .join(",")
          : undefined,
    };

    const filterConfig = [
      { id: "studentName", label: "StudentName" },
      {
        id: "className",
        label: "Class",
        inputType: "select",
        type: "text",
        options: formatOptions(classes),
      },
    ];

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
          apiFilters={apiFilters}
          filterTitle="Leave Records"
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
