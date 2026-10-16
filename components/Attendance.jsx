"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader, Save, Calendar, Clock, CheckCircle2, FilePlus, X, History, Check, ChevronsUpDown, FileText } from "lucide-react";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Hooks and Utils
import useCrud from "@/hooks/use-crud";
import { formatDate, formatDateForDisplay, cn } from "@/lib/utils";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import Header from "./Header";
import AbsenteeStatus from "./AbsenteeStatus";

const Attendance = ({ apiKey, teacherId }) => {
  const searchParams = useSearchParams();

  // Extract and memoize query parameters
  const queryParams = useMemo(
    () => ({
      classId: searchParams.get("classId"),
      batchId: searchParams.get("batchId"),
      subjectId: searchParams.get("subjectId"),
      periodNumber: searchParams.get("periodNumber"),
      day: searchParams.get("day"),
      dateParam: searchParams.get("date"),
    }),
    [searchParams]
  );

  const { classId, batchId, subjectId, periodNumber, day, dateParam } = queryParams;

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classDetails, setClassDetails] = useState(null);
  const [periodDetails, setPeriodDetails] = useState(null);
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [attendanceDate] = useState(dateParam || formatDate(new Date()));
  const [existingAttendanceId, setExistingAttendanceId] = useState(null);
  const [studentLeaveStatus, setStudentLeaveStatus] = useState({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Quick Leave states
  const [quickLeaveOpen, setQuickLeaveOpen] = useState(false);
  const [quickLeaveStudent, setQuickLeaveStudent] = useState(null);
  const [quickLeaveReason, setQuickLeaveReason] = useState("");
  const [quickLeaveSaving, setQuickLeaveSaving] = useState(false);
  const [quickLeaveComboboxOpen, setQuickLeaveComboboxOpen] = useState(false);
  const [attendanceReasons, setAttendanceReasons] = useState({});
  const [bulkLeaveReason, setBulkLeaveReason] = useState("");
  const [previousAttendanceState, setPreviousAttendanceState] = useState(null);

  const quickLeavePopupRef = useRef(null);
  const { handleDownload: handleQuickLeaveDownload } = useDownloadPopup(quickLeavePopupRef, `Leave_Reason.jpeg`);

  const today = useMemo(() => formatDateForDisplay(dateParam ? new Date(dateParam) : new Date()), [dateParam]);

  const successPopupRef = useRef(null);
  const { handleDownload: handleSuccessDownload } = useDownloadPopup(
    successPopupRef,
    `Attendance_${(classDetails?.name || "Class").replace(/\s+/g, '_')}_${today.replace(/\s+/g, '_')}.jpeg`
  );

  // CRUD hooks with optimized options
  const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
  const { useFetchItems: useFetchClass } = useCrud("classes", apiKey);
  const { useFetchItems: useFetchSubject } = useCrud("subjects", apiKey);
  const { useFetchItems: useFetchPeriod } = useCrud("periods", apiKey);
  const { useFetchItems: useFetchLeaveRecords } = useCrud(
    "leave-records",
    apiKey
  );
  const {
    useFetchItems: useFetchAttendance,
    useAddItem: useCreateAttendance,
    useUpdateItem: useUpdateAttendance,
    useDeleteItem: useDeleteAttendance,
  } = useCrud("attendances", apiKey);

  // Fetch data with appropriate stale times
  const classQuery = useFetchClass(
    null,
    null,
    { _id: classId },
    {
      staleTime: 1000 * 60 * 60, // 1 hour - classes don't change frequently
      enabled: !!classId,
    }
  );

  const subjectQuery = useFetchSubject(
    null,
    null,
    { _id: subjectId },
    {
      staleTime: 1000 * 60 * 60,
      enabled: !!subjectId,
    }
  );

  const periodQuery = useFetchPeriod(
    null,
    null,
    { periodNumber },
    {
      staleTime: 1000 * 60 * 60, // 1 hour - periods are static
      enabled: !!periodNumber,
    }
  );

  const studentsQuery = useFetchUsers(
    0,
    1000,
    {
      roles: ["Student"],
      attendanceClassId: classId,
      status: "Active",
      sort: "asc",
    },
    {
      staleTime: 1000 * 60 * 10, // 10 minutes - students don't change frequently
      enabled: !!classId,
    }
  );

  const attendanceQuery = useFetchAttendance(
    null,
    null,
    {
      classId,
      subjectId,
      periodNumber: parseInt(periodNumber),
      date: attendanceDate,
    },
    {
      staleTime: 1000 * 30, // 30 seconds - attendance changes frequently
      enabled: !!classId && !!subjectId && !!periodNumber,
    }
  );

  const studentIds = useMemo(() => {
    return studentsQuery.data?.users?.map((u) => u._id).join(",") || "";
  }, [studentsQuery.data]);

  // Fetch leave records for students who haven't arrived yet
  const leaveRecordsQuery = useFetchLeaveRecords(
    null,
    null,
    {
      studentIds,
      isArrived: "false", // Only fetch students who haven't arrived yet
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes - leave status changes moderately
      enabled: !!studentIds,
    }
  );

  // Fetch historical attendance for absentee tracking
  const historicalAttendanceQuery = useFetchAttendance(
    0,
    1000,
    {
      classId,
      batchId,
      subjectId,
      teacherId,
      trackAbsentees: true,
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes - historical data is relatively stable
      enabled: !!classId && !!batchId && !!subjectId && !!teacherId,
    }
  );

  // API mutations
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();

  // Memoize subject name for performance
  const subjectName = useMemo(() => {
    if (subjectQuery.data?.subjects?.[0]?.name) {
      return subjectQuery.data.subjects[0].name;
    }
    if (!classDetails) return undefined;
    const allSubjects = [
      ...(classDetails.coreSubjects || []),
      ...(classDetails.majorSubjects || []),
      ...(classDetails.subjects || [])
    ];
    const found = allSubjects.find((subject) => {
      const id = typeof subject === "object" ? subject?._id : subject;
      return String(id) === String(subjectId);
    });
    return typeof found === "object" ? found?.name : found || undefined;
  }, [subjectQuery.data, classDetails, subjectId]);

  // Process leave records to determine student status
  const processLeaveStatus = useCallback((leaveRecords, studentList) => {
    const leaveStatusMap = {};

    // Initialize all students as present/arrived
    studentList.forEach((student) => {
      leaveStatusMap[student._id] = {
        isOnLeave: false,
        hasArrived: true,
        leaveReason: null,
        expectedArrival: null,
        actualArrival: null,
      };
    });

    // Update status for students who are on leave and haven't arrived
    leaveRecords.forEach((record) => {
      if (
        record.studentId &&
        (!record.arrivedDate || record.arrivedDate === "")
      ) {
        leaveStatusMap[record.studentId] = {
          isOnLeave: true,
          hasArrived: false,
          leaveReason: record.leaveReason,
          expectedArrival: record.dateOfArrival,
          actualArrival: record.arrivedDate,
        };
      }
    });

    return leaveStatusMap;
  }, []);

  // Process leave records effect
  useEffect(() => {
    if (leaveRecordsQuery.data?.["leave-records"] && students.length > 0) {
      const leaveStatus = processLeaveStatus(
        leaveRecordsQuery.data["leave-records"],
        students
      );
      setStudentLeaveStatus(leaveStatus);
    }
  }, [leaveRecordsQuery.data, students, processLeaveStatus]);

  // Process class and period data
  useEffect(() => {
    if (classQuery.data?.classes?.[0]) {
      setClassDetails(classQuery.data.classes[0]);
    }
    if (periodQuery.data?.periods?.[0]) {
      setPeriodDetails(periodQuery.data.periods[0]);
    }
  }, [classQuery.data, periodQuery.data]);

  // Initialize attendance based on student list and leave status
  const initializeAttendance = useCallback((studentList, leaveStatusMap) => {
    const initialAttendance = {};

    studentList.forEach((student) => {
      const leaveInfo = leaveStatusMap[student._id];
      // Mark as absent if student is on leave and hasn't arrived
      initialAttendance[student._id] = !(
        leaveInfo?.isOnLeave && !leaveInfo?.hasArrived
      );
    });

    return initialAttendance;
  }, []);

  // Process student data and initialize attendance
  useEffect(() => {
    if (studentsQuery.data?.users?.length > 0) {
      const studentsList = studentsQuery.data.users;
      setStudents(studentsList);

      // Initialize attendance if it's empty
      if (Object.keys(attendance).length === 0) {
        const initialAttendance = initializeAttendance(
          studentsList,
          studentLeaveStatus || {}
        );
        setAttendance(initialAttendance);
      }
      // If we have unsaved attendance and leave status updates, apply leave overrides
      else if (!attendanceExists && Object.keys(studentLeaveStatus).length > 0) {
        setAttendance(prev => {
          const next = { ...prev };
          let changed = false;
          studentsList.forEach(student => {
            const leaveInfo = studentLeaveStatus[student._id];
            if (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived && next[student._id] !== false) {
              next[student._id] = false;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    }
  }, [
    studentsQuery.data,
    studentLeaveStatus,
    initializeAttendance,
    attendanceExists
  ]);

  // Process existing attendance data
  useEffect(() => {
    if (attendanceQuery.data?.attendances?.length > 0) {
      const attendanceRecord = attendanceQuery.data.attendances[0];
      setAttendanceExists(true);
      setExistingAttendanceId(attendanceRecord._id);

      // Update attendance state with existing data
      if (attendanceRecord.attendanceData?.length > 0) {
        const existingAttendance = {};
        const existingReasons = {};
        attendanceRecord.attendanceData.forEach((item) => {
          existingAttendance[item.studentId] = item.present;
          if (item.leaveReason) {
            existingReasons[item.studentId] = item.leaveReason;
          }
        });
        setAttendance(existingAttendance);
        setAttendanceReasons(existingReasons);
        setPreviousAttendanceState(null);
      }
    } else {
      setAttendanceExists(false);
      setExistingAttendanceId(null);
      setPreviousAttendanceState(null);
    }
  }, [attendanceQuery.data]);

  // Manage loading state
  useEffect(() => {
    const isLoading =
      classQuery.isLoading ||
      periodQuery.isLoading ||
      studentsQuery.isLoading ||
      attendanceQuery.isLoading ||
      leaveRecordsQuery.isLoading;

    setLoading(isLoading);
  }, [
    classQuery.isLoading,
    periodQuery.isLoading,
    studentsQuery.isLoading,
    attendanceQuery.isLoading,
    leaveRecordsQuery.isLoading,
  ]);
  
  // Auto-redirect after successful save
  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        window.location.href = "/dashboard/my-periods";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  // Memoize absentee data processing
  const absenteeData = useMemo(() => {
    if (
      !historicalAttendanceQuery.data?.attendances?.absenteeTracking ||
      !students.length
    ) {
      return [];
    }
    return historicalAttendanceQuery.data.attendances.absenteeTracking;
  }, [historicalAttendanceQuery.data, students]);

  // Memoize filtered students based on subject type assignments
  const filteredStudents = useMemo(() => {
    if (!students.length || !classDetails || !subjectId) return students;

    const isCore = (classDetails.coreSubjects || []).some(
      (s) => (typeof s === "object" ? s._id : s) === subjectId
    );
    const isMajor = (classDetails.majorSubjects || []).some(
      (s) => (typeof s === "object" ? s._id : s) === subjectId
    );

    return students.filter((student) => {
      const assignments = student.subjectTypeAssignments || [];
      const studentClassId = student.studentSpecificField?.classId || student.classId;

      // 1. If student is assigned specifically to this class:type, include them
      if (isCore && assignments.includes(`${classId}:CORE`)) return true;
      if (isMajor && assignments.includes(`${classId}:MAJOR`)) return true;

      // 2. If student belongs to this class and NO assignments are specified for this type, include them by default
      const hasCoreAssignment = assignments.some(a => a.endsWith(':CORE'));
      const hasMajorAssignment = assignments.some(a => a.endsWith(':MAJOR'));

      if (studentClassId === classId) {
        if (isCore && !hasCoreAssignment) return true;
        if (isMajor && !hasMajorAssignment) return true;
      }

      // 3. Backward compatibility: if no assignments at all, show for both by default
      if (assignments.length === 0) return true;

      // 4. If the subject is neither core nor major in this class, show everyone from the primary class
      if (!isCore && !isMajor) return true;

      return false;
    }).sort((a, b) => {
      const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
      const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
      return String(idA).localeCompare(String(idB), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students, classDetails, subjectId, classId]);

  // Toggle individual student attendance
  const toggleAttendance = useCallback((studentId) => {
    setPreviousAttendanceState(null);
    setAttendance((prev) => {
      const isCurrentlyPresent = prev[studentId];
      if (!isCurrentlyPresent) {
        // Marking as present, so clear the leave reason
        setAttendanceReasons((reasons) => {
          const newReasons = { ...reasons };
          delete newReasons[studentId];
          return newReasons;
        });
      }
      return {
        ...prev,
        [studentId]: !isCurrentlyPresent,
      };
    });
  }, []);

  // Memoize attendance statistics
  const attendanceStats = useMemo(() => {
    const total = filteredStudents.length;
    const present = filteredStudents.filter(st => attendance[st._id]).length;
    const absent = total - present;
    const presentPercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPercentage = total > 0 ? Math.round((absent / total) * 100) : 0;

    return { total, present, absent, presentPercentage, absentPercentage };
  }, [filteredStudents, attendance]);

  // Memoize absentee info lookup
  const getStudentAbsenteeInfo = useCallback(
    (studentId) =>
      absenteeData.find((student) => student.studentId === studentId),
    [absenteeData]
  );

  // Determine row styling based on student status
  const getRowStyling = useCallback(
    (studentId, isPresent) => {
      const leaveInfo = studentLeaveStatus[studentId];

      if (isPresent) {
        return { className: "hover:bg-muted/50", textColor: "" };
      }

      // Student is absent - check leave status
      if (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived) {
        return {
          className:
            "bg-red-100 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-950",
          textColor: "text-red-900 dark:text-red-100",
        };
      }

      // Regular absent student
      return {
        className:
          "bg-rose-50 dark:bg-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950",
        textColor: "text-rose-900 dark:text-rose-100",
      };
    },
    [studentLeaveStatus]
  );

  // Handle save attendance
  const handleSaveAttendance = useCallback(async () => {
    if (saving) return;

    try {
      setSaving(true);

      const attendanceData = filteredStudents.map((student) => ({
        studentId: student._id,
        present: !!attendance[student._id],
        leaveReason: attendance[student._id] ? null : (attendanceReasons[student._id] || null),
      }));

      const payload = {
        classId,
        batchId,
        subjectId,
        teacherId,
        periodNumber: parseInt(periodNumber),
        day,
        date: attendanceDate,
        attendanceData,
      };

      if (attendanceExists && existingAttendanceId) {
        await updateAttendance.mutateAsync({
          data: { _id: existingAttendanceId, ...payload },
        });
        setSuccessMessage("Attendance Updated Successfully!");
        setShowSuccessDialog(true);
        setPreviousAttendanceState(null);
      } else {
        await createAttendance.mutateAsync(payload);
        setSuccessMessage("Attendance Saved Successfully!");
        setShowSuccessDialog(true);
        setAttendanceExists(true);
        setPreviousAttendanceState(null);
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(`Failed to save attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    filteredStudents,
    attendance,
    classId,
    batchId,
    subjectId,
    teacherId,
    periodNumber,
    day,
    attendanceDate,
    attendanceExists,
    existingAttendanceId,
    updateAttendance,
    createAttendance,
  ]);

  // Handle delete attendance
  const handleDeleteAttendance = useCallback(async () => {
    if (saving || !attendanceExists || !existingAttendanceId) return;

    try {
      setSaving(true);
      await deleteAttendance.mutateAsync({
        data: { ids: [existingAttendanceId] },
      });
      setSuccessMessage("Attendance Reset Successfully!");
      setShowSuccessDialog(true);

      setAttendanceExists(false);
      setExistingAttendanceId(null);
      setPreviousAttendanceState(null);

      // Reset attendance based on leave status
      const resetAttendance = initializeAttendance(
        filteredStudents,
        studentLeaveStatus
      );
      setAttendance(resetAttendance);
    } catch (error) {
      console.error("Error resetting attendance:", error);
      toast.error(`Failed to reset attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    attendanceExists,
    existingAttendanceId,
    deleteAttendance,
    students,
    studentLeaveStatus,
    initializeAttendance,
  ]);

  const handleQuickLeaveSubmit = async () => {
    if (!quickLeaveStudent) return;
    setPreviousAttendanceState(null);

    if (quickLeaveStudent === 'bulk') {
      const applicableStudents = filteredStudents.filter(student => {
        const isPresent = attendance[student._id];
        const leaveInfo = studentLeaveStatus[student._id];
        const isOfficialLeave = leaveInfo?.isOnLeave && !leaveInfo?.hasArrived;
        return !isPresent && !isOfficialLeave;
      });

      setBulkLeaveReason(quickLeaveReason);

      if (!quickLeaveReason.trim()) {
        setAttendanceReasons((prev) => {
          const next = { ...prev };
          applicableStudents.forEach(s => delete next[s._id]);
          return next;
        });
        toast.success("Leave reasons cleared for all absentees!");
      } else {
        setAttendanceReasons((prev) => {
          const next = { ...prev };
          applicableStudents.forEach(s => {
            next[s._id] = quickLeaveReason;
          });
          return next;
        });
        toast.success("Leave reason added for all absentees!");
      }
      setQuickLeaveOpen(false);
      return;
    }

    if (!quickLeaveReason.trim()) {
      // Clear existing leave reason locally
      setAttendanceReasons((prev) => {
        const next = { ...prev };
        delete next[quickLeaveStudent._id];
        return next;
      });
      toast.success("Leave reason cleared!");
      setQuickLeaveOpen(false);
      return;
    }

    setAttendanceReasons((prev) => ({
      ...prev,
      [quickLeaveStudent._id]: quickLeaveReason,
    }));
    toast.success("Leave reason added!");
    setQuickLeaveOpen(false);
  };

  // Handle Present count touch / click
  const handlePresentCountClick = useCallback(() => {
    if (!filteredStudents.length) return;

    const allPresent = filteredStudents.every((st) => !!attendance[st._id]);

    // If currently in all-present mode or all students are present and we have an earlier state saved:
    if (previousAttendanceState && (previousAttendanceState.mode === "present" || allPresent)) {
      setAttendance(previousAttendanceState.attendance);
      setAttendanceReasons(previousAttendanceState.reasons);
      setPreviousAttendanceState(null);
      toast.info("Restored earlier attendance");
      return;
    }

    // If all are already present and no earlier state exists
    if (allPresent) {
      toast.info("All students are already marked present");
      return;
    }

    // Save previous state (preserve original snapshot if switching between bulk modes)
    setPreviousAttendanceState((prev) =>
      prev
        ? { ...prev, mode: "present" }
        : {
            attendance: { ...attendance },
            reasons: { ...attendanceReasons },
            mode: "present",
          }
    );

    // Mark all filtered students as present
    setAttendance((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((st) => {
        next[st._id] = true;
      });
      return next;
    });

    toast.success("Marked all students as present");
  }, [filteredStudents, attendance, attendanceReasons, previousAttendanceState]);

  // Handle Absent count touch / click
  const handleAbsentCountClick = useCallback(() => {
    if (!filteredStudents.length) return;

    const allAbsent = filteredStudents.every((st) => !attendance[st._id]);

    // If currently in all-absent mode or all students are absent and we have an earlier state saved:
    if (previousAttendanceState && (previousAttendanceState.mode === "absent" || allAbsent)) {
      setAttendance(previousAttendanceState.attendance);
      setAttendanceReasons(previousAttendanceState.reasons);
      setPreviousAttendanceState(null);
      toast.info("Restored earlier attendance");
      return;
    }

    // If all are already absent and no earlier state exists
    if (allAbsent) {
      toast.info("All students are already marked absent");
      return;
    }

    // Save previous state (preserve original snapshot if switching between bulk modes)
    setPreviousAttendanceState((prev) =>
      prev
        ? { ...prev, mode: "absent" }
        : {
            attendance: { ...attendance },
            reasons: { ...attendanceReasons },
            mode: "absent",
          }
    );

    // Mark all filtered students as absent
    setAttendance((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((st) => {
        next[st._id] = false;
      });
      return next;
    });

    toast.success("Marked all students as absent");
  }, [filteredStudents, attendance, attendanceReasons, previousAttendanceState]);

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          title="ATTENDANCE MANAGEMENT"
          subTitle="Loading attendance data..."
        />
        <div className="flex justify-center items-center h-40">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Metadata */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div className="flex-1 -mb-4 md:mb-0">
          <Header
            title="ATTENDANCE MANAGEMENT"
            subTitle={`${classDetails?.name || "Class"} - ${subjectName || "Subject"}`}
          />
        </div>

        {/* Metadata */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-muted-foreground px-3 md:px-0 pb-0 md:pb-0 -mb-1 md:mb-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">{today}</span>
          </div>
          <div className="hidden md:block h-4 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Period {periodNumber}: {periodDetails?.formattedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="border border-border rounded-lg p-2 md:p-4 bg-card/30">
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div className="flex flex-col items-center gap-1 md:gap-2">
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
              Total
            </span>
            <div className="w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center">
              {attendanceStats.total}
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={handlePresentCountClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePresentCountClick();
              }
            }}
            className="flex flex-col items-center gap-1 md:gap-2 cursor-pointer select-none group touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg transition-all"
            title={
              previousAttendanceState && (previousAttendanceState.mode === "present" || (attendanceStats.present === attendanceStats.total && attendanceStats.total > 0))
                ? "Click to restore earlier attendance"
                : "Click to mark all present"
            }
          >
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Present
            </span>
            <div
              className={cn(
                "w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center transition-all group-active:scale-95 group-hover:border-emerald-500/60 group-hover:shadow-md",
                previousAttendanceState?.mode === "present" && "border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold"
              )}
            >
              {attendanceStats.present}
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={handleAbsentCountClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleAbsentCountClick();
              }
            }}
            className="flex flex-col items-center gap-1 md:gap-2 cursor-pointer select-none group touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg transition-all"
            title={
              previousAttendanceState && (previousAttendanceState.mode === "absent" || (attendanceStats.absent === attendanceStats.total && attendanceStats.total > 0))
                ? "Click to restore earlier attendance"
                : "Click to mark all absent"
            }
          >
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              Absent
            </span>
            <div
              className={cn(
                "w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg bg-red-500 text-white text-base md:text-xl font-bold shadow-sm flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-red-600 group-hover:shadow-md",
                previousAttendanceState?.mode === "absent" && "ring-2 ring-red-400 ring-offset-2 dark:ring-offset-background font-extrabold"
              )}
            >
              {attendanceStats.absent}
            </div>
          </div>
        </div>
      </div>


      {/* Students Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center px-2">R.no</TableHead>
              <TableHead className="px-2">Students</TableHead>
              <TableHead className="w-[50px] md:w-[70px] text-center px-1">
                <span className="hidden md:inline">History</span>
                <History className="h-5 w-5 md:hidden mx-auto" />
              </TableHead>
              <TableHead className="w-[50px] md:w-[90px] text-center px-1">
                <div
                  className="cursor-pointer flex items-center justify-center mx-auto"
                  onClick={() => {
                    setQuickLeaveStudent('bulk');
                    setQuickLeaveReason(bulkLeaveReason);
                    setQuickLeaveComboboxOpen(false);
                    setQuickLeaveOpen(true);
                  }}
                  title="Add reason for all absentees"
                >
                  <FilePlus className="text-muted-foreground h-5 w-5 md:hidden mx-auto hover:text-foreground" />
                  <Button size="sm" className="hidden md:inline-flex">
                    Leave
                  </Button>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => {
                const absenteeInfo = getStudentAbsenteeInfo(student._id);
                const hasAbsenceHistory = absenteeInfo?.continuousAbsences > 0;
                const isPresent = attendance[student._id];
                const rowStyling = getRowStyling(student._id, isPresent);
                const leaveInfo = studentLeaveStatus[student._id];

                return (
                  <TableRow
                    key={student._id}
                    className={`cursor-pointer ${rowStyling.className}`}
                    onClick={() => toggleAttendance(student._id)}
                  >
                    <TableCell className={`text-center align-middle px-2 ${rowStyling.textColor}`}>
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.profilePic?.url} />
                            <AvatarFallback>
                              {student.name.substring(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <p className={`text-[9px] ${rowStyling.textColor || "text-muted-foreground"}`}>
                            {student.studentSpecificField?.admissionNumber || student.admissionNumber || student._id}
                          </p>
                        </div>
                        <div className="flex flex-col">
                          <p className={`font-medium text-[13px] ${rowStyling.textColor}`}>
                            {student.name}
                          </p>
                          {(!isPresent && (attendanceReasons[student._id] || (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived))) && (
                            <span className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-0.5">
                              {attendanceReasons[student._id] || leaveInfo?.leaveReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      {hasAbsenceHistory && (
                        <div className="inline-flex items-center justify-center text-sm font-bold text-white bg-red-500 px-2.5 py-1 rounded-md">
                          {absenteeInfo.continuousAbsences}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      {(!isPresent && !(leaveInfo?.isOnLeave && !leaveInfo?.hasArrived)) && (
                        <div
                          className="cursor-pointer flex justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickLeaveStudent(student);
                            setQuickLeaveReason(attendanceReasons[student._id] || "");
                            setQuickLeaveOpen(true);
                          }}
                        >
                          <FilePlus className="text-muted-foreground h-5 w-5 md:hidden hover:text-foreground" />
                          <Button size="sm" className="hidden md:inline-flex">
                            Leave
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  No students found in this class
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          className="border border-border"
          onClick={handleDeleteAttendance}
          disabled={!attendanceExists || saving}
        >
          {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Reset
        </Button>
        <Button
          onClick={handleSaveAttendance}
          disabled={saving || !filteredStudents.length}
        >
          {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {attendanceExists ? "Update" : "Save"}
        </Button>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent
          ref={successPopupRef}
          data-html2canvas-popup="true"
          className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md [&>button.absolute]:hidden flex flex-col p-0 gap-0"
        >
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <button 
              type="button"
              className={`p-2 rounded-lg transition-colors focus:outline-none cursor-pointer ${
                successMessage?.toLowerCase().includes("reset")
                  ? "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                  : "bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
              }`}
              onClick={handleSuccessDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <CheckCircle2 className={`h-5 w-5 ${
                successMessage?.toLowerCase().includes("reset")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`} />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className={`text-xl font-bold m-0 ${
                successMessage?.toLowerCase().includes("reset")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {successMessage?.toLowerCase().includes("reset")
                  ? "Attendance Reset"
                  : successMessage?.toLowerCase().includes("update")
                  ? "Attendance Updated"
                  : "Attendance Saved"}
              </DialogTitle>
              <DialogDescription className="m-0 text-xs text-muted-foreground">
                {successMessage || (successMessage?.toLowerCase().includes("reset") ? "Attendance records have been reset." : "Attendance marked and saved successfully.")}
              </DialogDescription>
            </div>
            <DialogClose 
              className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" 
              data-html2canvas-ignore="true"
              onClick={() => {
                setShowSuccessDialog(false);
                window.location.href = "/dashboard/my-periods";
              }}
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="p-5 space-y-4 bg-muted/5 flex-1">
            {/* Class & Period Details Card */}
            <div className="bg-card border rounded-xl p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base text-foreground">
                  {classDetails?.name || "Class"}
                </span>
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20 font-medium">
                  {periodNumber ? `Period ${periodNumber}` : (periodDetails?.name || "Period")}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-muted-foreground">
                {subjectName && (
                  <span className="font-medium text-foreground">
                    {subjectName}
                  </span>
                )}
                {subjectName && <span>•</span>}
                <span>{today}</span>
              </div>
            </div>

            {/* Metrics Summary Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-card shadow-sm">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xl font-bold text-foreground mt-0.5">
                  {filteredStudents.length}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Present
                </span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {Object.values(attendance).filter(Boolean).length}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 shadow-sm">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Absent
                </span>
                <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {Math.max(0, filteredStudents.length - Object.values(attendance).filter(Boolean).length)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Leave Dialog */}
      <Dialog open={quickLeaveOpen} onOpenChange={setQuickLeaveOpen}>
        <DialogContent ref={quickLeavePopupRef} data-html2canvas-popup="true" className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden">
          <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-red-50 dark:bg-red-950/20 sticky top-0 z-20 backdrop-blur-md">
            <button 
              type="button"
              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus:outline-none cursor-pointer"
              onClick={handleQuickLeaveDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <FilePlus className="h-5 w-5 text-red-600 dark:text-red-400" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0 text-red-700 dark:text-red-400">
                Leave Reason
              </DialogTitle>
              <DialogDescription className="m-0 text-xs font-medium text-muted-foreground mt-1">
                {quickLeaveStudent === 'bulk' ? 'All Absentees' : quickLeaveStudent?.name}
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="px-5 py-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason" className="text-sm font-medium">Leave Reason</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 z-10" />
                <div className="relative">
                  <Input
                    autoFocus
                    id="reason"
                    value={quickLeaveReason}
                    onChange={(e) => setQuickLeaveReason(e.target.value)}
                    placeholder="Select or type a reason..."
                    className="pl-10 pr-10 h-10"
                  />
                  <Popover open={quickLeaveComboboxOpen} onOpenChange={setQuickLeaveComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      >
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="end">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {["Sick", "Fever", "Headache", "Function", "No reason"].map((r) => (
                              <CommandItem
                                key={r}
                                value={r}
                                onSelect={(currentValue) => {
                                  setQuickLeaveReason(currentValue);
                                  setQuickLeaveComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    quickLeaveReason === r ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {r}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="px-5 py-4 border-t bg-muted/20 sm:justify-start">
            <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setQuickLeaveOpen(false)} disabled={quickLeaveSaving}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={() => setQuickLeaveReason("")} disabled={quickLeaveSaving}>
                  Clear
                </Button>
              </div>
              <Button onClick={handleQuickLeaveSubmit} disabled={quickLeaveSaving}>
                {quickLeaveSaving ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Attendance;
