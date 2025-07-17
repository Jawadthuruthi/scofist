import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";
import { fetchData, formatOptions, OPERATORS } from "@/lib/utils";

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
  {
    pathname: "users",
    searchParams: "projection=_id,name&roles=Student&status=Active",
  },
];

const AttendanceTrackingPage = async () => {
  try {
    const cookieStore = await cookies();
    const apiKey = process.env.API_KEY;

    const activeRole = cookieStore.get("active-role")?.value;

    const [batches, classes, subjects, students] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    const tabsConfig = [
      {
        label: "Student",
        value: "student",
        resource: "studentAttendances",
        printTitle: "Student Attendance",
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
          { header: "Student ID", accessorKey: "_id" },
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
            id: "studentId",
            label: "Student",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(students),
          },
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
        filterType: "api",
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
          { header: "Teacher ID", accessorKey: "_id" },
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
        filterType: "api",
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
          { header: "Class", accessorKey: "className" },
          {
            header: "Students",
            accessorKey: "students",
            type: ["arrayWithValueKey", "list"],
            valueKey: "studentName",
          },

          {
            header: "Percentage",
            accessorKey: "highestPercentage",
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
            operator: OPERATORS.DATE_RANGE,

            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
        filterType: "api",
        filterType: "api",
      },
    ];
    const tabsConfig2 = [
      {
        label: "Student",
        value: "student",
        resource: "studentAttendances",
        printTitle: "Student Attendance",
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
          { header: "Student ID", accessorKey: "_id" },
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
            id: "studentId",
            label: "Student",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(students),
          },
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
        filterType: "api",
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
          { header: "Class", accessorKey: "className" },
          {
            header: "Students",
            accessorKey: "students",
            type: ["arrayWithValueKey", "list"],
            valueKey: "studentName",
          },

          {
            header: "Percentage",
            accessorKey: "highestPercentage",
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
            operator: OPERATORS.DATE_RANGE,
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
        filterType: "api",
        filterType: "api",
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
            tabsConfig={tabsConfig2}
            apiKey={apiKey}
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
        <AdvancedDataTableComponent tabsConfig={tabsConfig} apiKey={apiKey} />
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

export const revalidate = 0;
