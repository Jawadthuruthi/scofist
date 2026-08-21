"use client";

import React, { useState, useEffect } from "react";
import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";

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
        cell: ({ row }) => {
            const d = new Date(row.original.date);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        },
    },
    { accessorKey: "className", header: "Class" },
    {
        accessorKey: "studentName",
        header: "Student",
        cell: ({ row }) => `${row.original.studentId} - ${row.original.studentName}`
    },
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

            switch (status?.toLowerCase()) {
                case "advanced":
                    variant = "success";
                    style.backgroundColor = "#047857"; // emerald-700
                    style.color = "white";
                    break;
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
                case "unsatisfied":
                    variant = "warning";
                    style.backgroundColor = "#f97316"; // orange-500
                    style.color = "white";
                    break;
                case "poor":
                    variant = "destructive";
                    style.backgroundColor = "#ef4444"; // red-500
                    style.color = "white";
                    break;
                case "bad":
                    variant = "destructive";
                    style.backgroundColor = "#b91c1c"; // red-700
                    style.color = "white";
                    break;
                case "very bad":
                    variant = "destructive";
                    style.backgroundColor = "#7f1d1d"; // red-900
                    style.color = "white";
                    break;
                case "pending":
                    variant = "secondary";
                    style.backgroundColor = "#64748b"; // slate-500
                    style.color = "white";
                    break;
                default:
                    variant = "outline";
                    break;
            }

            return (
                <Badge variant={variant} style={style}>
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
                </Badge>
            );
        },
    },
    {
        id: "whatsapp",
        header: "",
        width: 50,
        maxWidth: 50,
        minWidth: 50,
        cell: ({ row }) => {
            const data = row.original;
            const handleWhatsAppClick = (e) => {
                e.stopPropagation();
                const d = new Date(data.date);
                const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                const msg = `Student Performance Details:\n\nDate: ${dateStr}\nClass: ${data.className}\nStudent: ${data.studentName}\nTeacher: ${data.teacherName}\nComment: ${data.comments}\nStatus: ${data.status}`;
                const number = data.guardianContactNumber;
                
                if (!number) {
                    toast.error("No guardian contact number found for this student.");
                    return;
                }
                
                const formattedNumber = number.replace(/\D/g, '');
                const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(msg)}`;
                
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            return (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-green-500 hover:text-green-600 hover:bg-green-50 h-8 w-8"
                    onClick={handleWhatsAppClick}
                    title="Send to WhatsApp"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </Button>
            );
        }
    },
];

const statusMessages = {
    create: "Performance record added successfully!",
    edit: "Performance record updated successfully!",
    delete: "Performance record(s) deleted successfully!",
};

export default function PerformanceClient({ apiKey, activeRole, user, classes, teachers }) {
    const isTeacher = activeRole === "Teacher";
    const isAdmin = activeRole === "College Admin";
    const canEdit = isAdmin || isTeacher;
    const [isMyRecordsOpen, setIsMyRecordsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [myRecordsCount, setMyRecordsCount] = useState(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    const statusOptions = [
        { value: "advanced", label: "Advanced" },
        { value: "very good", label: "Very Good" },
        { value: "good", label: "Good" },
        { value: "acceptable", label: "Acceptable" },
        { value: "unsatisfied", label: "Unsatisfied" },
        { value: "poor", label: "Poor" },
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
            inputType: "multiSelect",
            resource: "users",
            labelKey: ["_id", "name"],
            required: true,
            placeholder: "Select Student(s)",
            filter: {
                dependentField: "classId",
                key: "classId",
            },
            apiFilters: {
                roles: "Student",
                status: "Active",
            },
            className: "md:col-span-2",
        },
        {
            name: "comments",
            label: "Comment",
            type: "text",
            inputType: "textarea",
            required: true,
            placeholder: "Enter performance comment",
            validators: {
                minLength: 3,
                minLengthMessage: "Comment must be at least 3 characters long"
            },
            className: "md:col-span-2",
        },
        {
            name: "teacherId",
            label: "Teacher",
            type: "text",
            inputType: "select",
            options: teachers,
            required: !isTeacher,
            placeholder: "Select Teacher",
            defaultValue: isTeacher ? user?.userId : undefined,
            className: isTeacher ? "hidden" : "",
        },
        {
            name: "status",
            label: "Status",
            type: "text",
            inputType: "select",
            freeSolo: true,
            options: statusOptions,
            required: true,
            placeholder: "Select or type status",
            defaultValue: "good",
        },
    ];

    const filterConfig = [
        {
            id: "classId",
            label: "Class",
            inputType: "select",
            options: classes,
        },
        ...(isAdmin ? [{
            id: "teacherId",
            label: "Teacher",
            inputType: "select",
            options: teachers,
        }] : [])
    ];

    return (
        <>
            <Header
                title="PERFORMANCE"
                subTitle="Manage Student Performance"
            />
            <DataTableComponent
                activeRole={activeRole}
                resource="performance"
                initialData={[]}
                columnsConfig={columnsConfig}
                formFields={formFields}
                apiKey={apiKey}
                createFormTitle="Add New Performance Record"
                editFormTitle="Edit Performance Record"
                deleteFormTitle="Delete Performance Record"
                createSuccessMessage={statusMessages.create}
                editSuccessMessage={statusMessages.edit}
                deleteSuccessMessage={statusMessages.delete}
                filterConfig={filterConfig}
                limit={10000}
                readOnly={!canEdit}
                enableDelete={canEdit}
                formClassName="sm:max-w-2xl lg:max-w-3xl"
                enableSearch={true}
                searchBarClassName="w-[200px] sm:w-[280px] lg:w-[400px] xl:w-[500px]"
                desktopSearchPlaceholder="Search student or number..."
                extraSearchFields={["studentId", "admissionNumber"]}
                tableHeight="calc(100vh - 250px)"
                additionalProps={{
                    customActions: isTeacher ? (
                        <Button 
                            variant="outline" 
                            onClick={() => setIsMyRecordsOpen(true)}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white border-0 h-9 px-2 text-[11px] sm:text-sm sm:px-3"
                        >
                            MY RECORDS
                        </Button>
                    ) : null
                }}
            />

            <Dialog open={isMyRecordsOpen} onOpenChange={setIsMyRecordsOpen}>
                <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl">
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left space-y-0.5">
                            <DialogTitle className="text-xl font-bold m-0">
                                My Performance Records
                            </DialogTitle>
                        </div>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden p-4 sm:p-6 pt-2">
                        <DataTableComponent
                            activeRole={activeRole}
                            resource="performance"
                            apiFilters={{ teacherId: user?.userId, myRecords: "true" }}
                            initialData={[]}
                            columnsConfig={columnsConfig}
                            formFields={formFields}
                            apiKey={apiKey}
                            limit={10000}
                            readOnly={false}
                            enableDelete={true}
                            enableCreate={false}
                            editFormTitle="Edit Performance Record"
                            deleteFormTitle="Delete Performance Record"
                            editSuccessMessage={statusMessages.edit}
                            deleteSuccessMessage={statusMessages.delete}
                            filterConfig={filterConfig}
                            formClassName="sm:max-w-2xl lg:max-w-3xl"
                            enableSearch={true}
                            searchBarClassName="w-[200px] sm:w-[280px] lg:w-[400px]"
                            desktopSearchPlaceholder="Search student or number..."
                            extraSearchFields={["studentId", "admissionNumber"]}
                            tableHeight="calc(80vh - 180px)"
                            onDataFetched={(data) => setMyRecordsCount(data?.pagination?.total || 0)}
                        />
                    </div>
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm text-gray-500 font-medium">
                        Total Records: {myRecordsCount}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
