"use client";

import { useState } from "react";
import DynamicDataTable from "@/components/DynamicDataTable";
import ClassProfileDialog from "@/components/ClassProfileDialog";

export default function ClassesClient({ columnsConfig, formFields, filterConfig, apiKey, statusMessages }) {
  const [selectedClass, setSelectedClass] = useState(null);
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
                    setSelectedClass(row.original);
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
          resource="classes"
          initialData={[]}
          columnsConfig={modifiedColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Class"
          editFormTitle="Edit Class"
          deleteFormTitle="Delete Class"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
          enableSearch={true}
          defaultSorting={[{ id: "_id", desc: false }]}
        />

        <ClassProfileDialog
          classData={selectedClass}
          open={isProfileOpen}
          onClose={setIsProfileOpen}
          apiKey={apiKey}
        />
    </>
  );
}
