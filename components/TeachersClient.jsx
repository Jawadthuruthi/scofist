"use client";

import { useState } from "react";
import DynamicDataTable from "@/components/DynamicDataTable";
import TeacherProfileDialog from "@/components/TeacherProfileDialog";
import PendingTeacherRequestsWrapper from "@/components/PendingTeacherRequestsWrapper";

export default function TeachersClient({ columnsConfig, formFields, filterConfig, apiFilters, apiKey, statusMessages }) {
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const modifiedColumnsConfig = columnsConfig.map(col => {
    if (col.accessorKey === "name") {
      return {
        ...col,
        cell: ({ row }) => (
            <div
                className="flex flex-col cursor-pointer hover:text-blue-600 group"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTeacher(row.original);
                    setIsProfileOpen(true);
                }}
            >
                <span className="font-bold text-sky-950 dark:text-sky-200 group-hover:underline">{row.original.name}</span>
            </div>
        )
      };
    }
    return col;
  });

  return (
    <>
        <DynamicDataTable
          resource="users"
          initialData={[]}
          columnsConfig={modifiedColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Teacher"
          editFormTitle="Edit Teacher"
          deleteFormTitle="Delete Teacher"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={50}
          tableHeight="calc(100vh - 340px)"
          apiFilters={apiFilters}
          printTitle={"Teachers"}
          enableSearch={true}
          defaultSorting={[{ id: "dateOfBirth", desc: false }]}
          customTopRightButtons={<PendingTeacherRequestsWrapper key="pending-requests" apiKey={apiKey} />}
          formClassName="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
        />

        <TeacherProfileDialog
          teacher={selectedTeacher}
          open={isProfileOpen}
          onClose={setIsProfileOpen}
          apiKey={apiKey}
        />
    </>
  );
}
