"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";

const columnsConfig = [
    {
        id: "select",
        header: "Select",
        type: ["checkbox"],
        width: 30,
        maxWidth: 30,
        minWidth: 30,
    },
    {
        accessorKey: "serialNo",
        header: "Sl.No",
        type: ["serialNo"],
        width: 60,
        maxWidth: 60,
        minWidth: 60,
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    { accessorKey: "className", header: "Class" },
    { accessorKey: "studentName", header: "Student" },
    {
        accessorKey: "comments",
        header: "Comment",
        meta: {
            minWidth: "200px",
            maxWidth: "300px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        }
    },
    { accessorKey: "teacherName", header: "Teacher" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status;
            let variant = "secondary";
            const style = {};

            switch (status) {
                case "very good":
                    variant = "success";
                    style.backgroundColor = "#15803d"; // green-700
                    style.color = "white";
                    break;
                case "good":
                    variant = "success";
                    style.backgroundColor = "#22c55e"; // green-500
                    style.color = "white";
                    break;
                case "acceptable":
                    variant = "warning";
                    style.backgroundColor = "#eab308"; // yellow-500
                    style.color = "white";
                    break;
                case "bad":
                    variant = "destructive";
                    style.backgroundColor = "#ef4444"; // red-500
                    style.color = "white";
                    break;
                case "very bad":
                    variant = "destructive";
                    style.backgroundColor = "#b91c1c"; // red-700
                    style.color = "white";
                    break;
                case "pending":
                    variant = "secondary";
                    style.backgroundColor = "#64748b"; // slate-500
                    style.color = "white";
                    break;
                default:
                    break;
            }

            return (
                <Badge variant={variant} style={style}>
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
                </Badge>
            );
        },
    },
];

const statusMessages = {
    create: "Remark added successfully!",
    edit: "Remark updated successfully!",
    delete: "Remark(s) deleted successfully!",
};

export default function RemarksClient({ apiKey, activeRole, user, classes, teachers }) {
    const isTeacher = activeRole === "Teacher";
    const isAdmin = activeRole === "College Admin";
    const canEdit = isAdmin || isTeacher;

    const statusOptions = [
        { value: "very good", label: "Very Good" },
        { value: "good", label: "Good" },
        { value: "acceptable", label: "Acceptable" },
        { value: "bad", label: "Bad" },
        { value: "very bad", label: "Very Bad" },
    ];

    const formFields = [
        {
            name: "date",
            label: "Date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split('T')[0],
        },
        {
            name: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            options: classes,
            required: true,
            placeholder: "Select Class",
        },
        {
            name: "studentId",
            label: "Student",
            type: "text",
            inputType: "select",
            resource: "users",
            required: true,
            placeholder: "Select Student",
            filter: {
                dependentField: "classId",
                key: "classId",
            },
            apiFilters: {
                roles: "Student",
            },
        },
        {
            name: "comments",
            label: "Comment",
            type: "text",
            inputType: "textarea",
            required: true,
            placeholder: "Enter remark comment",
            validators: {
                minLength: 3,
                minLengthMessage: "Comment must be at least 3 characters long"
            }
        },
        {
            name: "teacherId",
            label: "Teacher",
            type: "text",
            inputType: "select",
            options: teachers,
            required: true,
            placeholder: "Select Teacher",
            readOnly: isTeacher,
            defaultValue: isTeacher ? user?.userId : undefined,
        },
        {
            name: "status",
            label: "Status",
            type: "text",
            inputType: "select",
            options: statusOptions,
            required: true,
            placeholder: "Select Status",
            defaultValue: "very good",
        },
    ];

    const filterConfig = [
        {
            id: "classId",
            label: "Class",
            inputType: "select",
            options: classes,
        },
        {
            id: "studentName",
            label: "Student Name",
            inputType: "text",
        },
        {
            id: "teacherId",
            label: "Teacher",
            inputType: "select",
            options: teachers,
        },
        {
            id: "status",
            label: "Status",
            inputType: "select",
            options: statusOptions,
        }
    ];

    return (
        <>
            <Header
                title="REMARKS"
                subTitle="Manage Student Remarks"
            />
            <DataTableComponent
                resource="remarks"
                initialData={[]}
                columnsConfig={columnsConfig}
                formFields={formFields}
                apiKey={apiKey}
                createFormTitle="Add New Remark"
                editFormTitle="Edit Remark"
                deleteFormTitle="Delete Remark"
                createSuccessMessage={statusMessages.create}
                editSuccessMessage={statusMessages.edit}
                deleteSuccessMessage={statusMessages.delete}
                filterConfig={filterConfig}
                limit={20}
                readOnly={!canEdit}
                enableDelete={canEdit}
            />
        </>
    );
}
