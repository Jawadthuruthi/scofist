"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions } from "@/lib/utils";
import { useMemo, useState } from "react";
import StudentProfileDialog from "@/components/StudentProfileDialog";

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

  const formFields = [
    // Personal Details Section
    {
      section: "Personal Details",
      name: "profilePic",
      label: "Add Profile",
      type: "object",
      inputType: "image",
      placeholder: "Profile Pic",
      defaultValue: {},
      className: "md:col-span-2",
      maxFileSize: 2 * 1024 * 1024, // 2MB in bytes
    },
    {
      section: "Personal Details",
      name: "_id",
      label: "Student ID",
      type: "text",
      placeholder: "Student ID",
      required: true,
      validators: {
        minLength: 3,
        minLengthMessage: "Student ID must be at least 3 characters long",
        pattern: "^[A-Z0-9-]+$",
        patternMessage:
          "Student ID can only contain letters, numbers, and hyphens",
      },
      hideOnEdit: true,
    },
    {
      section: "Personal Details",
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "Student name",
      required: true,
      validators: {
        minLength: 3,
        minLengthMessage: "Name must be at least 3 characters long",
      },
    },
    {
      section: "Personal Details",
      name: "dateOfBirth",
      label: "Date Of Birth",
      type: "date",
      placeholder: "Date Of Birth",
      required: true,
      validators: {
        maxDate: new Date().toISOString().split("T")[0],
        maxDateMessage: "Date of birth cannot be in the future",
      },
    },
    {
      section: "Personal Details",
      name: "bloodGroup",
      label: "Blood Group",
      type: "text",
      inputType: "select",
      options: [
        { label: "A+", value: "A+" },
        { label: "A-", value: "A-" },
        { label: "B+", value: "B+" },
        { label: "B-", value: "B-" },
        { label: "O+", value: "O+" },
        { label: "O-", value: "O-" },
        { label: "AB+", value: "AB+" },
        { label: "AB-", value: "AB-" },
      ],
    },
    {
      section: "Personal Details",
      name: "aadharNo",
      label: "Aadhar Number",
      type: "text",
      placeholder: "Aadhar Number",
      validators: {
        pattern: "^[0-9]{12}$",
        patternMessage: "Invalid Aadhar number format",
      },
    },
    {
      section: "Personal Details",
      name: "roles",
      label: "Roles",
      type: "text",
      inputType: "multiSelect",
      defaultValue: ["Student"],
      required: true,
      options: [
        { label: "Student", value: "Student" },
        { label: "Literary Leader", value: "Literary Leader" },
        { label: "Librarian", value: "Librarian" },
        { label: "Program Committee", value: "Program Committee" },
        { label: "Program Leader", value: "Program Leader" },
        { label: "Stationary", value: "Stationary" },
        { label: "IT Lab", value: "IT Lab" },
      ],
      validators: {
        minLength: 1,
        minLengthMessage: "Please select at least one role",
      },
    },

    // Contact Information Section
    {
      section: "Contact Information",
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "abcd@gmaill.com",
    },
    {
      section: "Contact Information",
      name: "contactNumber",
      label: "Contact Number",
      type: "text",
      placeholder: "Contact Number",
      required: true,
      validators: {
        pattern: "^(\\+?\\d{1, 3}[-.\\s]?)?\\d{10}$",
        patternMessage: "Invalid contact number format",
      },
    },
    {
      section: "Contact Information",
      name: "alternativeNumber",
      label: "Alternative Number",
      type: "text",
      placeholder: "Alternative Number",
      validators: {
        pattern: "^(\\+?\\d{1, 3}[-.\\s]?)?\\d{10}$",
        patternMessage: "Invalid contact number format",
      },
    },

    {
      section: "Contact Information",
      name: "guardianName",
      label: "Guardian Name",
      type: "text",
      placeholder: "Guardian Name",
      required: true,
      validators: {
        minLength: 3,
        minLengthMessage: "Guardian name must be at least 3 characters long",
      },
    },
    {
      section: "Contact Information",
      name: "relationship",
      label: "Guardian Relationship",
      type: "text",
      placeholder: "Guardian Relationship",
      required: true,
      validators: {
        minLength: 3,
        minLengthMessage:
          "Guardian relationship must be at least 3 characters long",
      },
    },
    {
      section: "Contact Information",
      name: "guardianContactNumber",
      label: "Guardian Contact Number",
      type: "text",
      placeholder: "Guardian Contact Number",
      required: true,
      validators: {
        pattern: "^(\\+?\\d{1, 3}[-.\\s]?)?\\d{10}$",
        patternMessage: "Invalid contact number format",
      },
    },
    {
      section: "Contact Information",
      name: "guardianAlternativeNumber",
      label: "Guardian Alternative Number",
      type: "text",
      placeholder: "Guardian Alternative Number",
      validators: {
        pattern: "^(\\+?\\d{1, 3}[-.\\s]?)?\\d{10}$",
        patternMessage: "Invalid alternative number format",
      },
    },

    // Address Details Section
    {
      section: "Address Details",
      name: "houseName",
      label: "House Name",
      type: "text",
      placeholder: "House Name",
    },
    {
      section: "Address Details",
      name: "place",
      label: "Place",
      type: "text",
      placeholder: "Place",
      required: true,
    },
    {
      section: "Address Details",
      name: "postOffice",
      label: "Post Office",
      type: "text",
      placeholder: "Post Office",
    },
    {
      section: "Address Details",
      name: "district",
      label: "District",
      type: "text",
      placeholder: "District",
      required: true,
    },
    {
      section: "Address Details",
      name: "state",
      label: "State",
      type: "text",
      placeholder: "State",
      required: true,
    },
    {
      section: "Address Details",
      name: "pin",
      label: "Pin Code",
      type: "text",
      placeholder: "Pin Code",
      validators: {
        pattern: "^\\d{6}$",
        patternMessage: "Pin Code must be a 6-digit number",
      },
    },

    // Academic Information Section
    {
      section: "Academic Information",
      name: "batchId",
      label: "Assign Batch",
      type: "text",
      inputType: "select",
      options: formatOptions(batches),
      validators: {
        minLength: 1,
        minLengthMessage: "Please select at least one batch",
      },
      required: true,
    },
    {
      section: "Academic Information",
      name: "classId",
      label: "Assign Class",
      type: "text",
      inputType: "select",
      options: formatOptions(classes),
      validators: {
        minLength: 1,
        minLengthMessage: "Please select at least one class",
      },
    },

    {
      section: "Academic Information",
      name: "admissionClassId",
      label: "Admission Class",
      type: "text",
      inputType: "select",
      options: formatOptions(classes),
      validators: {
        minLength: 1,
        minLengthMessage: "Please select at least one class",
      },
    },
    {
      section: "Academic Information",
      name: "admissionDate",
      label: "Admission Date",
      type: "date",
      placeholder: "Admission Date",
      validators: {
        maxDate: new Date().toISOString().split("T")[0],
        maxDateMessage: "Admission date cannot be in the future",
      },
    },
    {
      section: "Academic Information",
      name: "status",
      label: "Status",
      type: "text",
      inputType: "select",
      defaultValue: "Active",
      required: true,
      options: [
        { label: "Active", value: "Active" },
        { label: "Graduated", value: "Graduated" },
        { label: "Dropped Out", value: "Dropped Out" },
      ],
    },
    {
      section: "Academic Information",
      name: "droppedOutDate",
      label: "Dropped Out Date",
      type: "date",
      placeholder: "Dropped Out Date",
      validators: {
        maxDate: new Date().toISOString().split("T")[0],
        maxDateMessage: "Dropped out date cannot be in the future",
      },
      conditionalRender: {
        dependentField: "status",
        expectedValue: "Dropped Out",
      },
    },
    {
      section: "Academic Information",
      name: "droppedOutClass",
      label: "Dropped Out Class",
      type: "array",
      inputType: "select",
      options: formatOptions(classes),
      validators: {
        minLength: 1,
        minLengthMessage: "Please select at least one class",
      },
      conditionalRender: {
        dependentField: "status",
        expectedValue: "Dropped Out",
      },
    },
    {
      section: "Academic Information",
      name: "droppedOutReason",
      label: "Dropped Out Reason",
      type: "text",
      placeholder: "Dropped Out Reason",
      validators: {
        minLength: 3,
        minLengthMessage:
          "Dropped out reason must be at least 3 characters long",
      },
      conditionalRender: {
        dependentField: "status",
        expectedValue: "Dropped Out",
      },
    },
    {
      section: "Academic Information",
      name: "graduatedYear",
      label: "Graduated Year",
      type: "number",
      placeholder: "Graduated Year",
      validators: {
        pattern: "^\\d{4}$",
        patternMessage: "Graduation year must be a 4-digit number",
        max: new Date().getFullYear(),
        maxMessage: "Graduation year cannot be in the future",
        min: 2000,
        minMessage: "Graduation year must be at least 2000",
      },
      conditionalRender: {
        dependentField: "status",
        expectedValue: "Graduated",
      },
    },
    {
      section: "Academic Information",
      name: "islamicQualification",
      label: "Islamic Qualification",
      type: "text",
      placeholder: "Islamic Qualification",
      conditionalRender: {
        dependentField: "status",
        expectedValue: "Graduated",
      },
    },
    {
      section: "Academic Information",
      name: "academicQualification",
      label: "Academic Qualification",
      type: "text",
      placeholder: "Academic Qualification",
      conditionalRender: {
        dependentField: "status",
        expectedValue: "Graduated",
      },
    },
  ];

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
