"use client";

import TableComponent from "@/components/TableComponent";
import { useRouter } from "next/navigation";

const columnsConfig = [
    { accessorKey: "name", header: "Classes" },
];

const StudentsContactsTable = ({ data, apiKey }) => {
    const router = useRouter();

    const handleRowClick = (row) => {
        router.push(`/dashboard/students-contacts/${row.original._id}`);
    };

    return (
        <TableComponent
            data={data}
            columnsConfig={columnsConfig}
            apiKey={apiKey}
            hidePrintBtn={true}
            hideSearch={true}
            hideColumnManagement={true}
            onRowClick={handleRowClick}
        />
    );
};

export default StudentsContactsTable;
