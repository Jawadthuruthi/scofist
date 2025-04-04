import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";

const AttendanceTrackingPage = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

    const tabsConfig = [
      {
        label: "Student",
        value: "student",
        resource: "studentAttendances",
        columnsConfig: [
          { header: "Student ID", accessorKey: "id" },
          { header: "Name", accessorKey: "name" },
          {
            header: "Total Class",
            accessorKey: "totalClass",
            valueKey: "attendanceRecords",
            type: ["length"],
          },
          {
            header: "Present",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
          },
          {
            header: "Percentage",
            accessorKey: "percentage",
            type: ["percentage"],
            totalKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
          },
        ],
        filterConfig: [
          {
            id: "classId",
            label: "Class",
            type: "select",
            options: [],
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "select",
            options: [],
          },
          {
            id: "date",
            label: "Date",
            type: "date",
          },
        ],
        readOnly: true,
      },
      {
        label: "Teacher",
        value: "teacher",
        resource: "teacherAttendances",
        columnsConfig: [
          { header: "Teacher ID", accessorKey: "id" },
          { header: "Name", accessorKey: "name" },
          {
            header: "Total Class",
            accessorKey: "totalClass",
            valueKey: "attendanceRecords",
            type: ["length"],
          },
          {
            header: "Present",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
          },
          {
            header: "Percentage",
            accessorKey: "percentage",
            type: ["percentage"],
            totalKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
          },
        ],
        filterConfig: [
          {
            id: "classId",
            label: "Class",
            type: "select",
            options: [],
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "select",
            options: [],
          },
          {
            id: "date",
            label: "Date",
            type: "date",
          },
        ],
        readOnly: true,
      },
    ];

    return (
      <>
        <Header
          title="ATTENDANCE TRACKING"
          subTitle="Track Attendance Records In Real Time"
        />
        <AdvancedDataTableComponent tabsConfig={tabsConfig} token={token} />
      </>
    );
  } catch (error) {
    console.error("Error :", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default AttendanceTrackingPage;
