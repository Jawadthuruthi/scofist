"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions } from "@/lib/utils";
import { useMemo, useState } from "react";
import StudentProfileDialog from "@/components/StudentProfileDialog";
import { getStudentFormFields } from "@/lib/studentFormConfig";

import { getStudentColumns } from "@/components/table-configs/studentColumns";

export default function StudentsClient({ batches, classes, activeRole, apiKey, isReadOnly = false, pageTitle, excludedColumns = [], filterTitle }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Use shared column configuration
  const columnsConfig = getStudentColumns({
    classes,
    pageTitle,
    onNameClick: (student) => {
      setSelectedStudent(student);
      setIsProfileOpen(true);
    },
    excludeColumns: ["remarks"]
  });

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
        limit={1000}
        apiFilters={apiFilters}
        filterTitle={filterTitle || "Students"}
        printTitle={pageTitle || "Students"}
        enableSearch={true}
        filterType="api"
        readOnly={activeRole !== "College Admin" || isReadOnly}
        tableHeight="calc(100vh - 200px)"
        enableClickToEdit={true}
        formClassName="sm:max-w-4xl"
      />

      <StudentProfileDialog
        student={selectedStudent}
        open={isProfileOpen}
        onClose={setIsProfileOpen}
        classes={classes}
        batches={batches}
        apiKey={apiKey}
      />
    </>
  );
}
