import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";
import { fetchData, formatOptions, formatDateForDisplay, sortClasses } from "@/lib/utils";

const API_ENDPOINTS = [
    {
        pathname: "batches",
        searchParams: "projection=_id,name,endYear",
    },
    {
        pathname: "classes",
        searchParams: "status=Active&projection=_id,name,batchId,status",
    },
    {
        pathname: "users",
        searchParams: "projection=_id,name,studentSpecificField&roles=Student",
    },
    {
        pathname: "masjid/attendance",
        searchParams: "distinct=prayer",
        key: "prayer"
    },
];

const GeneralAttendanceHistoryPage = async ({ searchParams }) => {
    try {
        const cookieStore = await cookies();
        const apiKey = process.env.API_KEY;

        const [batches, classes, students, prayers] = await Promise.all(
            API_ENDPOINTS.map((endpoint) =>
                fetchData(endpoint.pathname, endpoint.searchParams, 60, endpoint.key)
            )
        );

        const formattedClasses = [...(classes || [])]
            .filter((c) => c?.status !== "Closed")
            .sort((a, b) => {
                const classCompare = sortClasses(a, b);
                if (classCompare !== 0) return classCompare;
                return String(a.name || "").localeCompare(String(b.name || ""));
            })
            .map((c) => ({
                ...c,
                name: c.name,
            }));

        const currentFilters = await searchParams;
        const dateFilter = currentFilters?.date || "";
        const displayDate = dateFilter ? formatDateForDisplay(dateFilter) : "";

        const formattedStudents = (students || []).map((s) => ({
            ...s,
            date: displayDate
        }));

        const MASJID_PRAYERS = ["ZUHR", "ASAR", "MAGRIB", "ISHA", "SUBH"];
        const DEFAULT_SESSIONS = ["Masjid", "Haddad", "Programs", "Spot"];

        const customSessions = (prayers || []).filter(
            (p) => p && !MASJID_PRAYERS.includes(p.toUpperCase()) && !DEFAULT_SESSIONS.some(s => s.toLowerCase() === p.toLowerCase())
        );

        const sessionOptions = [
            ...DEFAULT_SESSIONS.map((s) => ({ value: s, label: s })),
            ...customSessions.map((s) => ({ value: s, label: s })),
        ];

        const prayerOptions = [
            ...MASJID_PRAYERS.map((p) => ({ value: p, label: p, session: "Masjid" })),
            { value: "HADDAD", label: "Haddad", session: "Haddad" },
            { value: "PROGRAMS", label: "Programs", session: "Programs" },
            { value: "SPOT", label: "Spot", session: "Spot" },
            ...customSessions.map((s) => ({ value: s, label: s, session: s })),
        ];

        const tablesConfig = [
            {
                value: "student",
                resource: "studentMasjidAttendances",
                printTitle: "General Attendance History",
                filterTitle: "General attendance",
                filterDescription: "Refine the General attendance.",
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
                        header: "Total",
                        accessorKey: "totalClass",
                        valueKey: "attendanceRecords",
                        type: ["length"],
                        clickable: true,
                        viewType: "allRecords",
                    },
                    {
                        header: "Present",
                        id: "present",
                        accessorKey: "present",
                        type: ["filteredLength"],
                        valueKey: "attendanceRecords",
                        filterKey: "present",
                        filterValue: true,
                        clickable: true,
                    },
                    {
                        header: "Absent",
                        id: "absent",
                        accessorKey: "present",
                        type: ["filteredLength"],
                        valueKey: "attendanceRecords",
                        filterKey: "present",
                        filterValue: false,
                        clickable: true,
                    },
                    {
                        header: "Percentage",
                        accessorKey: "percentage",
                        type: ["percentage"],
                        totalKey: "attendanceRecords",
                        filterKey: "present",
                        filterValue: true,
                        clickable: true,
                    },
                ],
                filterConfig: [
                    {
                        id: "date",
                        label: "Date Range",
                        type: "date",
                        inputType: "dateRange",
                        nestedArrayField: "attendanceRecords",
                        className: "col-span-2",
                        defaultValue: dateFilter,
                    },
                    {
                        id: "batchId",
                        label: "Batch",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        className: "col-span-1",
                        options: formatOptions(batches),
                    },
                    {
                        id: "classId",
                        label: "Class",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        className: "col-span-1",
                        options: formatOptions(formattedClasses),
                    },
                    {
                        id: "session",
                        label: "Select Session/Prayer",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        className: "col-span-1",
                        options: sessionOptions,
                    },
                    {
                        id: "prayer",
                        label: "Prayer Name",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        className: "col-span-1",
                        options: prayerOptions,
                        filter: {
                            dependentField: "session",
                        },
                    },
                    {
                        id: "studentId",
                        label: "Student",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        className: "col-span-2",
                        options: formatOptions(formattedStudents),
                        filter: {
                            dependentField: "classId",
                        },
                    },
                ],
                readOnly: true,
                filterType: "api",
                enableSearch: true,
                limit: 1000,
                dateRangeInPopup: "mobileOnly",
                defaultSorting: [{ id: "absent", desc: true }, { id: "present", desc: true }],
            },
        ];

        return (
            <>
                <Header
                    title="GENERAL ATTENDANCE HISTORY"
                    subTitle="Track General Attendance Records."
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

export default GeneralAttendanceHistoryPage;

export const revalidate = 0;
