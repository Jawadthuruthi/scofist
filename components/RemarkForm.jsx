"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatOptions } from "@/lib/utils";

const RemarkForm = ({
  onSubmit,
  initialData = {},
  students = [],
  classes = [],
}) => {
  const [formData, setFormData] = useState({
    studentId: initialData.studentId || "",
    classId: initialData.classId || "",
    date: initialData.date ? new Date(initialData.date).toISOString().split("T")[0] : "",
    comments: initialData.comments || "",
    status: initialData.status || "",
  });

  const studentOptions = formatOptions(students);
  const classOptions = formatOptions(classes);
  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Resolved", label: "Resolved" },
    { value: "Pending", label: "Pending" },
  ];

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Student</Label>
        <Select
          value={formData.studentId}
          onValueChange={(value) => handleChange("studentId", value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {studentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Class</Label>
        <Select
          value={formData.classId}
          onValueChange={(value) => handleChange("classId", value)}
          required
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => handleChange("date", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comments">Comments</Label>
        <Textarea
          id="comments"
          placeholder="Enter comments"
          value={formData.comments}
          onChange={(e) => handleChange("comments", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => handleChange("status", value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
};

export default RemarkForm;
