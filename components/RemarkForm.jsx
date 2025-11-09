"use client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { useForm, Controller } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import * as z from "zod";
  import { useEffect } from "react";

  const formSchema = z.object({
    studentId: z.string().min(1, "Student is required."),
    classId: z.string().min(1, "Class is required."),
    date: z.string().min(1, "Date is required."),
    comments: z.string().min(1, "Comments are required."),
    status: z.enum(["good", "bad", "pending"]),
  });

  const RemarkForm = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    students,
    classes,
  }) => {
    const {
      handleSubmit,
      control,
      reset,
      formState: { errors },
    } = useForm({
      resolver: zodResolver(formSchema),
      defaultValues: initialData || {
        status: "pending",
      },
    });

    useEffect(() => {
      if (initialData) {
        reset(initialData);
      }
    }, [initialData, reset]);

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{initialData ? "Edit Remark" : "Add Remark"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Controller
                name="classId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.classId && (
                <p className="text-red-500 text-xs">{errors.classId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Student</Label>
              <Controller
                name="studentId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.studentId && (
                <p className="text-red-500 text-xs">{errors.studentId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => <Input type="date" {...field} />}
              />
              {errors.date && (
                <p className="text-red-500 text-xs">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Controller
                name="comments"
                control={control}
                render={({ field }) => <Textarea {...field} />}
              />
              {errors.comments && (
                <p className="text-red-500 text-xs">{errors.comments.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="bad">Bad</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-red-500 text-xs">{errors.status.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  export default RemarkForm;