
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
        searchParams: "projection=_id,name,batchId",
    },
    {
        pathname: "users",
        searchParams: "projection=_id,name&roles=Student",
    },
];

const MasjidAttendanceHistoryPage = async () => {
    try {
        const cookieStore = await cookies();
        const apiKey = process.env.API_KEY;

        const [batches, classes, students] = await Promise.all(
            API_ENDPOINTS.map((endpoint) =>
                fetchData(endpoint.pathname, endpoint.searchParams)
            )
        );

        const formattedClasses = classes.map((c) => ({
            ...c,
            name: c.batchName ? `${c.name} (${c.batchName})` : c.name,
        }));

        const tablesConfig = [
            {
                // label: "Student", // No longer needed for single table view
                value: "student",
                resource: "studentMasjidAttendances",
                printTitle: "Student Masjid Attendance",
                filterTitle: "Student Masjid Attendance",
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
                        header: "Total Prayers",
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
                        options: formatOptions(formattedClasses),
                    },
                    {
                        id: "studentId",
                        label: "Student",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        options: formatOptions(students),
                        filter: {
                            dependentField: "batchId",
                        },
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

        return (
            <>
                <Header
                    title="MASJID ATTENDANCE HISTORY"
                    subTitle="Track Masjid Attendance Records"
                />
                <AdvancedDataTableComponent tablesConfig={tablesConfig} apiKey={apiKey} />
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

export default MasjidAttendanceHistoryPage;

export const revalidate = 0;
