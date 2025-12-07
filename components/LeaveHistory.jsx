"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function LeaveHistory({ classes, students, apiKey, role }) {
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
        { accessorKey: "studentName", header: "Student Name" },
        { accessorKey: "className", header: "Class" },
        { accessorKey: "dateOfLeave", header: "Date of Leave", type: ["date"] },
        { accessorKey: "leaveReason", header: "Leave Reason" },
        { accessorKey: "dateOfArrival", header: "Exp. Arrival", type: ["date"] },
        { accessorKey: "arrivedDate", header: "Actual Arrival", type: ["date"] },
        { accessorKey: "lateReason", header: "Late Reason" },
        {
            accessorKey: "remark",
            header: "Remark",
            cell: ({ row }) => {
                const remark = row.original.remark;
                if (!remark) return <span className="text-muted-foreground">-</span>;

                const variants = {
                    "Very Good": "default",
                    Good: "default",
                    Acceptable: "secondary",
                    Bad: "destructive",
                    "Very Bad": "destructive",
                };

                return <Badge variant={variants[remark] || "outline"}>{remark}</Badge>;
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const { arrivedDate, dateOfArrival } = row.original;
                if (arrivedDate) {
                    return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Returned</Badge>;
                }
                const isOverdue = new Date() > new Date(dateOfArrival);
                if (isOverdue) {
                    return <Badge variant="destructive">Overdue</Badge>;
                }
                return <Badge variant="secondary">Pending</Badge>;
            }

        }
    ];

    const filterConfig = [
        {
            id: "classId",
            label: "Class",
            inputType: "select",
            options: formatOptions(classes),
        },
        { id: "studentName", label: "Student Name" }, // Text search by student name is handled by global search usually, but specific filter is good too if API supports it. 
        // API supports 'studentId' but not directly 'studentName' regex on the main query without population filter which might be tricky.
        // Let's stick to Class filter for now as it's robust.
        {
            id: "isArrived",
            label: "Status",
            inputType: "select",
            options: [
                { label: "Pending", value: "false" },
                { label: "Returned", value: "true" },
            ],
        },
    ];

    const formFields = [
        {
            name: "studentId",
            label: "Student",
            type: "text",
            inputType: "select",
            options: formatOptions(students),
            required: true,
            placeholder: "Select Student",
        },
        {
            name: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            options: formatOptions(classes),
            required: true,
            placeholder: "Select Class",
        },
        {
            name: "dateOfLeave",
            label: "Date of Leave",
            type: "date",
            required: true,
            validators: {
                maxDate: new Date().toISOString().split("T")[0],
                maxDateMessage: "Date cannot be in the future",
            },
        },
        {
            name: "leaveReason",
            label: "Leave Reason",
            type: "text",
            required: true,
            placeholder: "Reason for Leave",
        },
        {
            name: "dateOfArrival",
            label: "Date of Arrival",
            type: "date",
            required: true,
            validators: {
                compareWith: [
                    {
                        field: "dateOfLeave",
                        operator: ">=",
                        message: "Arrival date must be on or after the leave date",
                        errorPath: "dateOfArrival",
                    },
                ],
            },
        },
        {
            name: "arrivedDate",
            label: "Arrived Date",
            type: "date",
            placeholder: "Actual Arrival Date",
        },
        {
            name: "lateReason",
            label: "Late Reason",
            type: "text",
            placeholder: "Reason for being late (optional)",
        },
        {
            name: "remark",
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
            placeholder: "Select Remark",
            conditionalRender: {
                dependentField: "arrivedDate",
            },
        }
    ];

    return (
        <>
            <Header title="LEAVE HISTORY" subTitle="View and Manage All Leave Records" />
            <DataTableComponent
                resource="leave-records"
                columnsConfig={columnsConfig}
                formFields={formFields}
                apiKey={apiKey}
                createFormTitle="Add Leave Record"
                editFormTitle="Edit Leave Record"
                deleteFormTitle="Delete Leave Record"
                filterConfig={filterConfig}
                filterTitle="Leave Records"
                printTitle="Leave Records"
            />
        </>
    );
}
