"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { formatOptions } from "@/lib/utils";
import RemarkForm from "./RemarkForm";

const Remarks = ({
  apiKey,
  role,
  classes = [],
  teachers = [],
  students = [],
}) => {
  const [filters, setFilters] = useState({
    classId: "",
    status: "All",
    teacherId: "",
    studentName: "",
    date: "",
    comments: "",
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState(null);

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    "remarks",
    apiKey
  );

  const { data: remarksData, isLoading, refetch } = useFetchItems(
    null,
    null,
    { ...filters, status: filters.status === "All" ? "" : filters.status }
  );

  useEffect(() => {
    refetch();
  }, [filters.status, refetch]);

  const remarks = useMemo(() => remarksData?.remarks || [], [remarksData]);

  const addRemark = useAddItem();
  const updateRemark = useUpdateItem();
  const deleteRemark = useDeleteItem();

  const classOptions = useMemo(() => formatOptions(classes), [classes]);
  const teacherOptions = useMemo(() => formatOptions(teachers), [teachers]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    refetch();
  };

  const handleAddSubmit = async (formData) => {
    await addRemark.mutateAsync(formData);
    setIsAddModalOpen(false);
    refetch();
  };

  const handleEditSubmit = async (formData) => {
    await updateRemark.mutateAsync({ id: editingRemark._id, data: formData });
    setEditingRemark(null);
    refetch();
  };

  const handleDelete = async (id) => {
    await deleteRemark.mutateAsync(id);
    refetch();
  };

  return (
    <div className="min-h-screen">
      <Header title="REMARKS" subTitle="Manage Student Remarks" />
      <Tabs
        value={filters.status}
        onValueChange={(value) => handleFilterChange("status", value)}
      >
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="good">Good</TabsTrigger>
          <TabsTrigger value="bad">Bad</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter remarks by class, status, or teacher.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Student Name"
              value={filters.studentName}
              onChange={(e) => handleFilterChange("studentName", e.target.value)}
            />
            <Select
              value={filters.classId}
              onValueChange={(value) => handleFilterChange("classId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange("date", e.target.value)}
            />
            <Input
              placeholder="Remarks / Comments"
              value={filters.comments}
              onChange={(e) => handleFilterChange("comments", e.target.value)}
            />
            {role === "College Admin" && (
              <Select
                value={filters.teacherId}
                onValueChange={(value) => handleFilterChange("teacherId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="By (Teacher Name)" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Remark
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Remark</DialogTitle>
            </DialogHeader>
            <RemarkForm
              onSubmit={handleAddSubmit}
              students={students}
              classes={classes}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Remarks List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan="7" className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : remarks.length > 0 ? (
                remarks.map((remark) => (
                  <TableRow key={remark._id}>
                    <TableCell>{remark.studentId.name}</TableCell>
                    <TableCell>{remark.classId.name}</TableCell>
                    <TableCell>
                      {new Date(remark.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{remark.comments}</TableCell>
                    <TableCell>{remark.status}</TableCell>
                    <TableCell>{remark.teacherId.name}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditingRemark(remark)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(remark._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="7" className="text-center">
                    No remarks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingRemark && (
        <Dialog
          open={!!editingRemark}
          onOpenChange={() => setEditingRemark(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Remark</DialogTitle>
            </DialogHeader>
            <RemarkForm
              onSubmit={handleEditSubmit}
              initialData={editingRemark}
              students={students}
              classes={classes}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Remarks;
