"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
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
import { Loader2, TrendingUp, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";
import ConfirmationPopup from "./ConfirmationPopup";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

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
  title = "Class Performance",
  subtitle,
}) {
  const [loading, setLoading] = useState(false);
  const [studentStatuses, setStudentStatuses] = useState({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(
    popupRef,
    `Class_Performance_${(slot?.subjectId?.name || "Subject").replace(/\s+/g, "_")}.jpeg`
  );

  const today = attendanceRecord?.date 
    ? new Date(attendanceRecord.date).toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0];
    
  const classId = slot?.classId?._id || slot?.classId;
  const comments = defaultComment || `${slot?.subjectId?.name || "Unknown"} - Class Performance`;

  const { data: attendanceDetailData, isLoading: isFetchingAttendanceDetail } = useQuery({
    queryKey: ["attendance-detail", attendanceRecord?._id],
    queryFn: async () => {
      const res = await axios.get(`/api/attendances?_id=${attendanceRecord._id}`, {
        headers: {
          "x-api-key": apiKey,
        },
        withCredentials: true,
      });
      return res.data;
    },
    enabled: !!open && !!attendanceRecord?._id && !attendanceRecord?.attendanceData,
    staleTime: 1000 * 60 * 5,
  });

  const { data: performanceData, isLoading: isFetchingPerformance } = useQuery({
    queryKey: ["performance", classId, today, comments],
    queryFn: async () => {
      const res = await axios.get(
        `/api/performance?classId=${classId}&date=${today}&comments=${encodeURIComponent(comments)}&myRecords=true`,
        {
          headers: {
            "x-api-key": apiKey,
          },
        }
      );
      return res.data;
    },
    enabled: !!open && !!classId,
    staleTime: 0, // Always fetch fresh data to avoid stale caching issues
    refetchOnMount: "always",
  });

  // Fetch existing statuses when modal opens
  useEffect(() => {
    if (open) {
      console.log("performanceData on open:", performanceData);
      if (performanceData?.performance) {
        const existingStatuses = {};
        performanceData.performance.forEach(perf => {
          const perfTeacherId = typeof perf.teacherId === 'object' ? perf.teacherId?._id : perf.teacherId;
          const perfStudentId = typeof perf.studentId === 'object' ? perf.studentId?._id : perf.studentId;
          console.log("Checking perf for student:", perfStudentId, "status:", perf.status, "teacherId:", teacherId, "perfTeacherId:", perfTeacherId);
          if (!teacherId || perfTeacherId === teacherId) {
            existingStatuses[perfStudentId] = perf.status;
          }
        });
        console.log("existingStatuses calculated:", existingStatuses);
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
      const date = attendanceRecord?.date 
        ? new Date(attendanceRecord.date).toISOString() 
        : new Date().toISOString();
      
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
        
        queryClient.setQueryData(["performance", classId, today, comments], (oldData) => ({
          ...oldData,
          performance: []
        }));

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
    const date = attendanceRecord?.date 
      ? new Date(attendanceRecord.date).toISOString() 
      : new Date().toISOString();

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
        
        queryClient.setQueryData(["performance", slot.classId?._id || slot.classId, today, defaultComment || `${slot?.subjectId?.name || "Unknown"} - Class Performance`], (oldData) => {
          const updatedPerformances = [...(oldData?.performance || [])];
          
          recordsToSave.forEach(newRec => {
            const existingIndex = updatedPerformances.findIndex(p => p.studentId === newRec.studentId);
            if (existingIndex >= 0) {
              updatedPerformances[existingIndex].status = newRec.status;
            } else {
              updatedPerformances.push(newRec);
            }
          });
          
          return { ...oldData, performance: updatedPerformances };
        });

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

  const students =
    attendanceRecord?.attendanceData ||
    attendanceDetailData?.attendances?.[0]?.attendanceData ||
    [];
  const isLoadingStudents = isFetchingAttendanceDetail && students.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={popupRef} 
        data-html2canvas-popup="true" 
        className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-2xl max-h-[85vh] sm:max-h-[85vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0"
      >
        <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
          <button 
            type="button"
            className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors focus:outline-none cursor-pointer text-indigo-600 dark:text-indigo-400 shrink-0"
            onClick={handleDownload}
            title="Download Image"
            data-html2canvas-ignore="true"
          >
            <TrendingUp className="h-5 w-5" />
          </button>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              {title}
              {(isFetchingPerformance || isLoadingStudents) && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
              )}
            </DialogTitle>
            <DialogDescription className="m-0 text-xs text-muted-foreground">
              {subtitle || `${slot?.subjectId?.name || "Subject"} • ${slot?.classId?.name || "Class"} (${students.length} students)`}
            </DialogDescription>
          </div>
          <DialogClose 
            className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            onClick={() => onOpenChange(false)}
            data-html2canvas-ignore="true"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[58vh] flex-1 bg-muted/5 p-4 sm:p-5">
          {isLoadingStudents ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <p>Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No students found for this class.
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40">
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
                      <TableRow key={sId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-muted-foreground font-medium text-xs">{index + 1}</TableCell>
                        <TableCell className="font-medium text-sm">
                          {student.studentName || "Unknown Student"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={studentStatuses[sId] || ""}
                            onValueChange={(val) => handleStatusChange(sId, val)}
                            disabled={isFetchingPerformance}
                          >
                            <SelectTrigger 
                              className="w-[130px] rounded-lg"
                              style={studentStatuses[sId] && studentStatuses[sId] !== "none" ? getStatusColor(studentStatuses[sId]) : {}}
                            >
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="none" className="text-muted-foreground italic">
                                None (Clear)
                              </SelectItem>
                              {performanceOptions.map((opt) => (
                                <SelectItem 
                                  key={opt} 
                                  value={opt}
                                  className="my-1 focus:text-white data-[highlighted]:text-white rounded-md"
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
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t bg-muted/50 dark:bg-muted/20 backdrop-blur-md sticky bottom-0 z-20" data-html2canvas-ignore="true">
          <ConfirmationPopup
            action="clear all"
            title="Clear All Performance Records"
            icon="Clear All"
            triggerClass="bg-transparent border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-medium"
            onClick={handleClearAll}
            disabled={loading || students.length === 0}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-lg text-xs" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || students.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs text-xs font-medium"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Performance
            </Button>
          </div>
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
