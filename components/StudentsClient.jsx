"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions } from "@/lib/utils";
import { useMemo, useState } from "react";
import StudentProfileDialog from "@/components/StudentProfileDialog";
import { getStudentFormFields } from "@/lib/studentFormConfig";

export default function StudentsClient({ batches, classes, activeRole, apiKey, isReadOnly = false, pageTitle, excludedColumns = [], filterTitle }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    {
      accessorKey: "profilePic",
      header: "Image",
      type: ["avatar"],
      width: 70,
      maxWidth: 70,
      minWidth: 70,
    },
    {
      accessorKey: "_id",
      header: pageTitle === "ADMISSION REGISTER" ? <div>Student<br />ID</div> : "Student ID",
      type: ["sortable"]
    },
    {
      accessorKey: "name",
      header: pageTitle === "ADMISSION REGISTER" ? <div>Student Name &<br />Contact Number</div> : "Name",
      cell: ({ row }) => (
        <div
          className="flex flex-col cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
          onClick={() => {
            setSelectedStudent(row.original);
            setIsProfileOpen(true);
          }}
        >
          <span className="font-medium text-blue-600 hover:underline">{row.original.name}</span>
          {pageTitle === "ADMISSION REGISTER" && (
            <div className="flex flex-col gap-0.5 mt-1">
              {row.original.contactNumber && <span className="text-xs text-muted-foreground">Ph: {row.original.contactNumber}</span>}
              {row.original.alternativeNumber && <span className="text-xs text-muted-foreground">Alt: {row.original.alternativeNumber}</span>}
            </div>
          )}
        </div>
      ),
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "contactNumber", header: "Contact Number" },
    { accessorKey: "alternativeNumber", header: "Alternative Number" },
    { accessorKey: "aadharNo", header: "Aadhar Number" },
    { accessorKey: "batchName", header: "Batch" },
    { accessorKey: "className", header: "Class" },
    {
      accessorKey: "admissionClassName",
      header: pageTitle === "ADMISSION REGISTER" ? <div>Admission<br />Class</div> : "Admission Class"
    },
    {
      accessorKey: "admissionDate",
      header: pageTitle === "ADMISSION REGISTER" ? <div>Admission<br />Date & Class</div> : "Admission Date",
      cell: ({ row }) => {
        const date = row.getValue("admissionDate");
        const formattedDate = date ? new Date(date).toLocaleDateString() : "";
        return (
          <div className="flex flex-col">
            <span>{formattedDate}</span>
            {pageTitle === "ADMISSION REGISTER" && row.original.admissionClassName && (
              <span className="text-xs text-muted-foreground">{row.original.admissionClassName}</span>
            )}
          </div>
        );
      },
    },
    { accessorKey: "dateOfBirth", header: "Date Of Birth", type: ["date"] },
    { accessorKey: "bloodGroup", header: "Blood Group" },
    { accessorKey: "roles", header: "Roles", type: ["array"] },
    {
      accessorKey: "address",
      header: "Address",
      minWidth: 180,
      width: 200,
      cell: ({ row }) => {
        const addr = row.original.address || {};
        return (
          <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
            {addr.houseName && <span>{addr.houseName}</span>}
            {addr.place && <span>{addr.place}</span>}
            {addr.postOffice && <span>{addr.postOffice}</span>}
            {addr.district && <span>{addr.district}</span>}
            {(addr.state || addr.pin) && <span>{addr.state}{addr.pin ? ` - ${addr.pin}` : ''}</span>}
          </div>
        );
      }
    },
    {
      accessorKey: "guardianName",
      header: pageTitle === "ADMISSION REGISTER" ? <div>Guardian Name &<br />Contact Number</div> : "Guardian Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.guardianName}</span>
          <span className="text-xs text-muted-foreground">({row.original.relationship})</span>
          {pageTitle === "ADMISSION REGISTER" && (
            <div className="flex flex-col gap-0.5 mt-1">
              {row.original.guardianContactNumber && <span className="text-xs text-muted-foreground">Ph: {row.original.guardianContactNumber}</span>}
              {row.original.guardianAlternativeNumber && <span className="text-xs text-muted-foreground">Alt: {row.original.guardianAlternativeNumber}</span>}
            </div>
          )}
        </div>
      ),
    },
    { accessorKey: "guardianContactNumber", header: "Guardian Contact Number" },
    {
      accessorKey: "guardianAlternativeNumber",
      header: "Guardian Alternative Number",
    },

    { accessorKey: "status", header: "Status", type: ["badge"] },
    {
      id: "statusDetails",
      header: "Status Details",
      minWidth: 250,
      width: 300,
      cell: ({ row }) => {
        const {
          status,
          graduatedYear,
          islamicQualification,
          academicQualification,
          droppedOutDate,
          droppedOutClass,
          droppedOutReason,
        } = row.original;

        if (status === "Graduated") {
          return (
            <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
              <span className="font-semibold text-green-600">Graduated: {graduatedYear}</span>
              {islamicQualification && <span>Islamic: {islamicQualification}</span>}
              {academicQualification && <span>Academic: {academicQualification}</span>}
            </div>
          );
        } else if (status === "Dropped Out") {
          const formattedDate = droppedOutDate ? new Date(droppedOutDate).toLocaleDateString() : 'N/A';
          const classObj = classes?.find((c) => c._id === droppedOutClass);
          const className = classObj ? classObj.name : droppedOutClass;
          return (
            <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
              <span className="font-semibold text-red-600">Dropped Out: {formattedDate}</span>
              {droppedOutClass && <span>Class: {className}</span>}
              {droppedOutReason && droppedOutReason.toLowerCase() !== 'unknown' && <span>Reason: {droppedOutReason}</span>}
            </div>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      id: "liabilities",
      header: "Liabilities",
      cell: ({ row }) => (
        <span className="text-muted-foreground">-</span>
      ),
    },
  ];

  const statusMessages = {
    create: "Student added successfully!",
    edit: "Student Updated successfully!",
    delete: "Student deleted successfully!",
  };

  const apiFilters = useMemo(() => ({
    roles: ["Student"],
    populate: "funds",
  }), []);

  const formFields = useMemo(() => getStudentFormFields(batches, classes), [batches, classes]);

  const filterConfig = pageTitle === "ADMISSION REGISTER" ? [
    { id: "_id", label: "ID" },
    { id: "name", label: "Name" },
    {
      id: "batchId",
      label: "Batch",
      inputType: "select",
      options: formatOptions(batches),
    },
    {
      id: "classId",
      label: "Class",
      inputType: "select",
      options: formatOptions(classes),
    },
    {
      id: "status",
      label: "Status",
      inputType: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Graduated", value: "Graduated" },
        { label: "Dropped Out", value: "Dropped Out" },
      ],
    },
  ] : [
    { id: "name", label: "Name" },
    { id: "_id", label: "ID" },
    {
      id: "classId",
      label: "Class",
      inputType: "select",
      options: formatOptions(classes),
    },
    {
      id: "batchId",
      label: "Batch",
      inputType: "select",
      options: formatOptions(batches),
    },
    {
      id: "status",
      label: "Status",
      inputType: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Graduated", value: "Graduated" },
        { label: "Dropped Out", value: "Dropped Out" },
      ],
    },
  ];

  const filteredColumnsConfig = columnsConfig.filter((column) => {
    if (excludedColumns.includes(column.accessorKey) || excludedColumns.includes(column.id)) {
      return false;
    }
    if (activeRole === "Teacher" || isReadOnly) {
      return column.header !== "Select";
    }
    if (activeRole === "Student") {
      return [
        "serialNo",
        "profilePic",
        "_id",
        "name",
        "batchName",
        "className",
        "status",
      ].includes(column.accessorKey);
    }
    return true;
  });

  return (
    <>
      <Header
        title={
          pageTitle || (activeRole !== "College Admin"
            ? "STUDENTS DETAILS"
            : "STUDENTS MANAGEMENT")
        }
        subTitle="Organize and Oversee Students"
      />
      <DataTableComponent
        resource="users"
        initialData={[]}
        columnsConfig={filteredColumnsConfig}
        formFields={formFields}
        apiKey={apiKey}
        createFormTitle="Add New Student"
        editFormTitle="Edit Student"
        deleteFormTitle="Delete Student"
        createSuccessMessage={statusMessages.create}
        editSuccessMessage={statusMessages.edit}
        deleteSuccessMessage={statusMessages.delete}
        filterConfig={filterConfig}
        limit={20}
        apiFilters={apiFilters}
        filterTitle={filterTitle || "Students"}
        printTitle={pageTitle || "Students"}
        filterType="api"
        readOnly={activeRole !== "College Admin" || isReadOnly}
      />

      <StudentProfileDialog
        student={selectedStudent}
        open={isProfileOpen}
        onClose={setIsProfileOpen}
        classes={classes}
        apiKey={apiKey}
      />
    </>
  );
}
