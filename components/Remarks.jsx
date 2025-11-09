"use client";
import { useState } from "react";
import useCrud from "@/hooks/use-crud";
import Header from "./Header";
import { DataTableComponent } from "./DataTableComponent";
import RemarkForm from "./RemarkForm";
import { Button } from "./ui/button";

const Remarks = ({ apiKey, role, teacherId }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRemark, setSelectedRemark] = useState(null);

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    "remarks",
    apiKey
  );
  const { data: remarksData, isLoading: remarksLoading } = useFetchItems();
  const { data: classesData } = useCrud("classes", apiKey).useFetchItems();
  const { data: studentsData } = useCrud("users", apiKey).useFetchItems(0, 0, {
    roles: "Student",
  });

  const addRemark = useAddItem();
  const updateRemark = useUpdateItem();
  const deleteRemark = useDeleteItem();

  const handleAdd = () => {
    setSelectedRemark(null);
    setIsFormOpen(true);
  };

  const handleEdit = (remark) => {
    setSelectedRemark(remark);
    setIsFormOpen(true);
  };

  const handleDelete = (remarkIds) => {
    deleteRemark.mutate({ ids: remarkIds });
  };

  const handleSubmit = (data) => {
    if (selectedRemark) {
      updateRemark.mutate({ ids: [selectedRemark._id], ...data });
    } else {
      addRemark.mutate(data);
    }
    setIsFormOpen(false);
  };

  const columns = [
    {
      accessorKey: "studentName",
      header: "Student",
    },
    {
      accessorKey: "className",
      header: "Class",
    },
    {
      accessorKey: "teacherName",
      header: "Teacher",
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
        accessorKey: "comments",
        header: "Comments",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
  ];

  return (
    <div className="space-y-4">
      <Header title="REMARKS" subTitle="Manage Remarks Of Students" />
      <Button onClick={handleAdd}>Add Remark</Button>
      <DataTableComponent
        columns={columns}
        data={remarksData?.remarks || []}
        isLoading={remarksLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canApprove={role === "College Admin"}
        canDelete={role === "College Admin"}
      />
      <RemarkForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedRemark}
        students={studentsData?.users || []}
        classes={classesData?.classes || []}
      />
    </div>
  );
};

export default Remarks;