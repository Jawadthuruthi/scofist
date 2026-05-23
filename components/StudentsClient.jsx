"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions } from "@/lib/utils";
import { useMemo, useState } from "react";
import StudentProfileDialog from "@/components/StudentProfileDialog";
import { getStudentFormFields } from "@/lib/studentFormConfig";
import { Button } from "@/components/ui/button";
import { Loader, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { getStudentColumns } from "@/components/table-configs/studentColumns";
import ProfileComparisonDialog from "./ProfileComparisonDialog";

export default function StudentsClient({ batches, classes, activeRole, apiKey, isReadOnly = false, pageTitle, excludedColumns = [], filterTitle, lastStudentId }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [comparisonStudent, setComparisonStudent] = useState(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAssignments = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/users/sync-subject-assignments", {
        method: "POST",
        headers: { "api-key": apiKey },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Subject assignments synced!");
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(data.message || "Failed to sync assignments.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while syncing assignments.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Use shared column configuration
  const columnsConfig = getStudentColumns({
    classes,
    pageTitle,
    onNameClick: (student) => {
      setSelectedStudent(student);
      setIsProfileOpen(true);
    },
    onProfileRequestClick: (student) => {
      setComparisonStudent(student);
      setIsComparisonOpen(true);
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

  const formFields = useMemo(() => getStudentFormFields(batches, classes, lastStudentId), [batches, classes, lastStudentId]);

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
    {
      id: "profileUpdateStatus",
      label: "Review Status",
      inputType: "select",
      options: [
        { label: "Verified", value: "Verified" },
        { label: "Requested", value: "Pending" },
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
    {
      id: "profileUpdateStatus",
      label: "Review Status",
      inputType: "select",
      options: [
        { label: "Verified", value: "Verified" },
        { label: "Requested", value: "Pending" },
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
        "updatedAt",
      ].includes(column.accessorKey);
    }
    return true;
  });

  const defaultSorting = useMemo(() => [{ id: "_id", desc: true }], []);

  return (
    <>
      <Header
        title={
          pageTitle || (activeRole !== "College Admin"
            ? "STUDENTS DETAILS"
            : "STUDENTS MANAGEMENT")
        }
        subTitle="Organize and Oversee Students"
        rightAction={
          activeRole === "College Admin" && !isReadOnly ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAssignments}
              disabled={isSyncing}
              title="Set every active student's Subject Type Assignments to match their assigned class"
            >
              {isSyncing ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Sync Assignments
            </Button>
          ) : null
        }
      />
      <DataTableComponent
        key={refreshKey}
        resource="users"
        initialData={[]}
        columnsConfig={filteredColumnsConfig}
        formFields={formFields}
        refetchInterval={15000}
        apiKey={apiKey}
        createFormTitle="Add New Student"
        editFormTitle="Edit Student"
        deleteFormTitle="Delete Student"
        createSuccessMessage={statusMessages.create}
        editSuccessMessage={statusMessages.edit}
        deleteSuccessMessage={statusMessages.delete}
        filterConfig={filterConfig}
        limit={100000}
        apiFilters={apiFilters}
        filterTitle={filterTitle || "Students"}
        printTitle={pageTitle || "Students"}
        enableSearch={true}
        filterType="api"
        readOnly={activeRole !== "College Admin" || isReadOnly}
        tableHeight="calc(100vh - 200px)"
        enableClickToEdit={true}
        clickToEditExcludeColumns={["_id", "select", "serialNo", "actions", "updatedAt"]}
        formClassName="sm:max-w-4xl"
        defaultSorting={defaultSorting}
        capitalizeInputs={true}
      />

      <StudentProfileDialog
        student={selectedStudent}
        open={isProfileOpen}
        onClose={setIsProfileOpen}
        classes={classes}
        batches={batches}
        apiKey={apiKey}
      />

      <ProfileComparisonDialog
        student={comparisonStudent}
        open={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onActionComplete={() => setRefreshKey(prev => prev + 1)}
      />
    </>
  );
}
