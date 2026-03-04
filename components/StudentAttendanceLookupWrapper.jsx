"use client";
import dynamic from "next/dynamic";

const StudentAttendanceLookup = dynamic(
    () => import("./StudentAttendanceLookup"),
    { ssr: false, loading: () => null }
);

export default function StudentAttendanceLookupWrapper({ students, classes, setFilter, removeFilter, filterMonth, filterYear, tableData, apiKey }) {
    return <StudentAttendanceLookup
        students={students}
        classes={classes}
        setFilter={setFilter}
        removeFilter={removeFilter}
        filterMonth={filterMonth}
        filterYear={filterYear}
        tableData={tableData}
        apiKey={apiKey}
    />;
}
