import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";
import { fetchData, formatOptions } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "batches",
    searchParams: "projection=_id,name",
  },
  {
    pathname: "classes",
    searchParams: "projection=_id,name",
  },
  {
    pathname: "subjects",
    searchParams: "projection=_id,name",
  },
];

const AttendanceTrackingPage = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    const activeRole = cookieStore.get("active-role")?.value;

    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

    const [batches, classes, subjects] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, token, endpoint.searchParams)
      )
    );

    const tabsConfig = [
      {
        label: "Student",
        value: "student",
        resource: "studentAttendances",
        filterTitle: "Student Attendance",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
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
            id: "batchId",
            label: "Batch",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(batches),
          },
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(classes),
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(subjects),
          },
          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
      },
      {
        label: "Teacher",
        value: "teacher",
        resource: "teacherAttendances",
        filterTitle: "Teacher Attendance",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
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
            id: "batchId",
            label: "Batch",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(batches),
          },
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(classes),
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(subjects),
          },

          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
      },
      {
        label: "Toppers",
        value: "toppers",
        resource: "attendanceToppers",
        filterTitle: "Attendance Toppers",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
          { header: "Student ID", accessorKey: "studentId" },
          { header: "Name", accessorKey: "studentName" },
          {
            header: "Total Class",
            accessorKey: "totalClasses",
          },
          {
            header: "Present",
            accessorKey: "presentCount",
          },
          {
            header: "Percentage",
            accessorKey: "attendancePercentage",
          },
        ],
        filterConfig: [
          {
            id: "batchId",
            label: "Batch",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(batches),
          },
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(classes),
          },

          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
        filterType: "api",
      },
    ];

    const tablesConfig = [
      {
        id: "student",
        resource: "studentAttendances",
        filterTitle: "Student Attendance",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
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
            id: "batchId",
            label: "Batch",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",
            options: formatOptions(batches),
          },
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",
            options: formatOptions(classes),
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",
            options: formatOptions(subjects),
          },
          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
      },
    ];

    if (activeRole !== "College Admin") {
      return (
        <>
          <Header
            title="ATTENDANCE TRACKING"
            subTitle="Track Attendance Records In Real Time"
          />
          <AdvancedDataTableComponent
            tablesConfig={tablesConfig}
            token={token}
          />
        </>
      );
    }

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
