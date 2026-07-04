"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";
import ConfirmationPopup from "./ConfirmationPopup";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const performanceOptions = [
  "advanced",
  "Very Good",
  "Good",
  "Acceptable",
  "Unsatisfied",
  "Poor",
  "Bad",
  "very bad",
];

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "advanced": return { backgroundColor: "#047857", color: "white" };
    case "very good": return { backgroundColor: "#15803d", color: "white" };
    case "good": return { backgroundColor: "#22c55e", color: "white" };
    case "acceptable": return { backgroundColor: "#eab308", color: "white" };
    case "unsatisfied": return { backgroundColor: "#f97316", color: "white" };
    case "poor": return { backgroundColor: "#ef4444", color: "white" };
    case "bad": return { backgroundColor: "#b91c1c", color: "white" };
    case "very bad": return { backgroundColor: "#7f1d1d", color: "white" };
    default: return {};
  }
};

export default function ClassPerformanceModal({
  open,
  onOpenChange,
  slot,
  attendanceRecord,
  teacherId,
  apiKey,
  defaultComment,
}) {
  const [loading, setLoading] = useState(false);
  const [studentStatuses, setStudentStatuses] = useState({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const classId = slot?.classId?._id || slot?.classId;
  const comments = defaultComment || `${slot?.subjectId?.name || "Unknown"} - Class Performance`;

  const { data: performanceData, isLoading: isFetchingPerformance } = useQuery({
    queryKey: ["performance", classId, today, comments],
    queryFn: async () => {
      const res = await axios.get(
        `/api/performance?classId=${classId}&date=${today}&comments=${encodeURIComponent(comments)}`,
        {
          headers: {
            "x-api-key": apiKey,
          },
        }
      );
      return res.data;
    },
    enabled: !!open && !!classId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fetch existing statuses when modal opens
  useEffect(() => {
    if (open) {
      if (performanceData?.performance) {
        const existingStatuses = {};
        performanceData.performance.forEach(perf => {
          if (perf.teacherId === teacherId) {
            existingStatuses[perf.studentId] = perf.status;
          }
        });
        setStudentStatuses(existingStatuses);
      } else {
        setStudentStatuses({});
      }
    } else {
      setStudentStatuses({});
    }
  }, [performanceData, open, teacherId]);

  const handleStatusChange = (studentId, status) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleClearAll = async () => {
    try {
      setLoading(true);
      const classId = slot.classId?._id || slot.classId;
      const comments = defaultComment || `${slot?.subjectId?.name || "Unknown"} - Class Performance`;
      const date = new Date().toISOString();
      
      const res = await axios.post(
        "/api/performance/bulk",
        { records: [], clearAll: true, classId, comments, date },
        {
          headers: {
            "x-api-key": apiKey,
          },
        }
      );

      if (res.status === 200) {
        setSuccessMessage("All performances cleared successfully.");
        setShowSuccessDialog(true);
        setTimeout(() => {
          setShowSuccessDialog(false);
          setStudentStatuses({});
          onOpenChange(false);
        }, 1000);
        queryClient.invalidateQueries({ queryKey: ["performance"] });
        router.refresh();
      } else {
        toast.error("Failed to clear performances.");
      }
    } catch (error) {
      console.error("Error clearing performances:", error);
      toast.error(error.response?.data?.message || "An error occurred while clearing.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Filter out students who don't have a status selected
    const recordsToSave = [];
    const date = new Date().toISOString();

    for (const [studentId, status] of Object.entries(studentStatuses)) {
      if (status && status !== "none") {
        recordsToSave.push({
          studentId,
          classId: slot.classId?._id || slot.classId,
          teacherId,
          date,
          status,
          comments: defaultComment || `${slot?.subjectId?.name || "Unknown"} - Class Performance`,
        });
      }
    }

    if (recordsToSave.length === 0) {
      toast.info("No performance statuses selected to save.");
      onOpenChange(false);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        "/api/performance/bulk",
        { records: recordsToSave },
        {
          headers: {
            "x-api-key": apiKey,
          },
        }
      );

      if (res.status === 201) {
        setSuccessMessage(res.data.message || "Class performance saved successfully.");
        setShowSuccessDialog(true);
        queryClient.invalidateQueries({ queryKey: ["performance"] });
        router.refresh();
        setTimeout(() => {
          setShowSuccessDialog(false);
          onOpenChange(false);
        }, 1000);
      } else {
        toast.error("Failed to save class performance.");
      }
    } catch (error) {
      console.error("Error saving performance:", error);
      toast.error(error.response?.data?.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  const students = attendanceRecord?.attendanceData || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <TrendingUp className="h-5 w-5" />
            Class Performance
          </DialogTitle>
          <DialogDescription>
            Select performance status for students in {slot?.subjectId?.name || "this subject"}.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6 py-2">
          {isFetchingPerformance ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found for this class.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sl No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[140px]">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const sId = typeof student.studentId === "object" ? student.studentId?._id : student.studentId;
                  return (
                    <TableRow key={sId}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {student.studentName || "Unknown Student"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={studentStatuses[sId] || ""}
                          onValueChange={(val) => handleStatusChange(sId, val)}
                        >
                          <SelectTrigger 
                            className="w-[130px]"
                            style={studentStatuses[sId] && studentStatuses[sId] !== "none" ? getStatusColor(studentStatuses[sId]) : {}}
                          >
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-muted-foreground italic">
                              None (Clear)
                            </SelectItem>
                            {performanceOptions.map((opt) => (
                              <SelectItem 
                                key={opt} 
                                value={opt}
                                className="my-1 focus:text-white data-[highlighted]:text-white"
                                style={getStatusColor(opt)}
                              >
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
          <ConfirmationPopup
            action="clear all"
            title="Clear All Performance Records"
            icon="Clear All"
            triggerClass="mr-auto bg-transparent border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleClearAll}
            disabled={loading || students.length === 0}
          />
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || students.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Performance
          </Button>
        </div>
      </DialogContent>
    </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
          <DialogHeader className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Successful
            </DialogTitle>
            <DialogDescription className="text-lg">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
