"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader, CheckCircle2, FileText, AlertCircle, Check, ChevronsUpDown, CalendarDays, ChevronRight, TrendingUp, BookOpenCheck, Save, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Hooks and Utils
import { formatDate, formatDateForDisplay, cn } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import { fetchItems } from "@/lib/api";
import Header from "./Header";
import ClassPerformanceModal from "./ClassPerformanceModal";
import TodayStatusModal from "./TodayStatusModal";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Cookies from "js-cookie";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import { useRef } from "react";

const leaveReasons = [
  "Home Leave",
  "In a Function",
  "Unfitness",
  "Study Leave",
  "Duty Leave",
  "Campus Function",
  "Fiqh Council",
  "Exam",
  "Hospital",
];

const MyPeriods = ({ apiKey, teacherId, isPrincipal }) => {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [classId, setClassId] = useState("");
  const [periodNumber, setPeriodNumber] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [error, setError] = useState(false);

  // ── Bulk reason state ────────────────────────────────────────────────
  const [bulkReasonOpen, setBulkReasonOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkComboboxOpen, setBulkComboboxOpen] = useState(false);
  const [bulkError, setBulkError] = useState(false);
  const [bulkExistingRecordIds, setBulkExistingRecordIds] = useState([]); // _ids of existing leave records

  const bulkPopupRef = useRef(null);
  const { handleDownload: handleBulkDownload } = useDownloadPopup(bulkPopupRef, `Bulk_Leave_Reason.jpeg`);

  const reasonPopupRef = useRef(null);
  const { handleDownload: handleReasonDownload } = useDownloadPopup(reasonPopupRef, `Leave_Reason.jpeg`);

  // ── Hifz & Doura state ───────────────────────────────────────────────
  const [hifzEnrollments, setHifzEnrollments] = useState([]);
  const [hifzLoadingEnroll, setHifzLoadingEnroll] = useState(true);
  const [hifzSelectedClassId, setHifzSelectedClassId] = useState("");
  const [hifzDialogOpen, setHifzDialogOpen] = useState(false);
  const [hifzDate, setHifzDate] = useState(formatDate(new Date()));
  const [hifzPageInputs, setHifzPageInputs] = useState({});  // { studentId: pagesCount }
  const [hifzSaving, setHifzSaving] = useState(false);
  const [hifzLoadingRecords, setHifzLoadingRecords] = useState(false);
  const [whatsappLoadingId, setWhatsappLoadingId] = useState(null);
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [performanceSlot, setPerformanceSlot] = useState(null);
  const [performanceAttendanceRecord, setPerformanceAttendanceRecord] = useState(null);
  // { [classId]: { byStudent: { [studentId]: { totalPages, lastDate, records: [{date, pagesCount}] } } } }
  const [hifzClassSummary, setHifzClassSummary] = useState({});
  const [hifzRecordsDialogClassId, setHifzRecordsDialogClassId] = useState("");
  const [selectedRecordsStudent, setSelectedRecordsStudent] = useState(null); // { sId, sName }
  const [hifzWhatsappClassId, setHifzWhatsappClassId] = useState(""); // classId of open WA dialog
  const [hifzStudentContacts, setHifzStudentContacts] = useState({}); // { [studentId]: guardianContactNumber }
  const [hifzContactsLoading, setHifzContactsLoading] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [hifzSuccessOpen, setHifzSuccessOpen] = useState(false);

  const router = useRouter();

  const handleNavigation = (slot) => {
    router.push(
      `/dashboard/attendances?classId=${slot.classId?._id}&batchId=${slot.classId.batchId}&subjectId=${slot.subjectId?._id}&periodNumber=${slot.periodNumber}&day=${slot.day}`
    );
  };
  // Use refs or state instead of deriving too many values
  const days = useMemo(
    () => [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    []
  );
  const today = useMemo(() => days[new Date().getDay()], [days]);
  const date = useMemo(() => formatDateForDisplay(new Date()), []);
  const formattedDate = useMemo(() => formatDate(new Date()), []);

  const { useFetchItems } = useCrud("timeTables", apiKey);
  const { useFetchItems: useFetchPeriods } = useCrud("periods", apiKey);
  const { useFetchItems: useFetchAttendance } = useCrud("attendances", apiKey);
  const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);

  const usersQuery = useFetchUsers(0, 0, { roles: "Teacher" }, { 
    staleTime: 1000 * 60 * 60,
    enabled: isPrincipal 
  });
  const teachers = useMemo(() => usersQuery.data?.users || [], [usersQuery.data]);

  const { useFetchItems: useFetchSettings } = useCrud("settings", apiKey);
  const {
    useFetchItems: useFetchTeachersLeaveRecord,
    useAddItem,
    useUpdateItem,
    useDeleteItem,
  } = useCrud("teachers-leave-record", apiKey);

  const addLeaveRecord = useAddItem();
  const updateLeaveRecord = useUpdateItem();
  const deleteLeaveRecord = useDeleteItem();

  // Reduce network requests by passing proper options
  const periodsQuery = useFetchPeriods(
    0,
    0,
    {},
    {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
    }
  );

  const timeTablesQuery = useFetchItems(
    0,
    100, // Reasonable limit
    { teacherId, day: today, projection: "classId,timeSlots" },
    {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
    }
  );

  const attendanceQuery = useFetchAttendance(
    0,
    0,
    {
      date: formattedDate,
      teacherId,
    },
    {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    }
  );

  const settingsQuery = useFetchSettings(
    0,
    0,
    {},
    {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
    }
  );
  const settings = settingsQuery.data?.settings;
  const { useFetchItems: useFetchCalendarEvents } = useCrud("academic-calendar", apiKey);

  const currentYear = new Date().getFullYear();
  const calendarEventsQuery = useFetchCalendarEvents(
    0, 0,
    { year: currentYear },
    { staleTime: 1000 * 60 * 30, refetchOnWindowFocus: false }
  );

  const upcomingEvent = useMemo(() => {
    const events = calendarEventsQuery.data?.["academic-calendar"];
    if (!events || events.length === 0) return null;

    const now = new Date();

    const parseEndTime = (ev) => {
      const d = new Date(ev.date);
      if (isNaN(d.getTime())) return new Date(0);

      const timeStr = ev.time || "";
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, mins, 0);
      }
      // If no valid time match, event is over at the end of the day
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    };

    const validEvents = events
      .map(ev => ({ ...ev, endTime: parseEndTime(ev) }))
      .filter(ev => ev.endTime > now)
      .sort((a, b) => a.endTime - b.endTime);

    return validEvents.length > 0 ? validEvents[0] : null;
  }, [calendarEventsQuery.data]);

  const dateISO = useMemo(() => new Date().toISOString(), []);

  const leaveRecordQuery = useFetchTeachersLeaveRecord(
    0,
    0,
    {
      teacherId,
      date: formattedDate,
    },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }
  );

  const leaveRecords = useMemo(() => {
    return leaveRecordQuery.data?.teachersLeaveRecord || [];
  }, [leaveRecordQuery.data?.teachersLeaveRecord]);

  // Memoize periods to avoid unnecessary re-renders
  const periods = useMemo(() => {
    if (!periodsQuery.data?.periods) return [];
    return [...periodsQuery.data.periods].sort(
      (a, b) => a.periodNumber - b.periodNumber
    );
  }, [periodsQuery.data?.periods]);

  // Memoize and process timetable data more efficiently
  const filteredSlots = useMemo(() => {
    if (!timeTablesQuery.data?.timeTables || !periods.length) return [];

    // Section working day status from settings
    const isSeniorOn = settings?.general?.seniorDaawa?.isWorkingDay !== false;
    const isJuniorOn = settings?.general?.juniorDaawa?.isWorkingDay !== false;

    // Process all timeTables in one pass
    const teachersSlots = timeTablesQuery.data.timeTables.flatMap(
      (timeTable) => {
        const classSection = timeTable.classId?.section || "";

        // Skip slots from off sections
        if (classSection === "Senior Da-awa" && !isSeniorOn) return [];
        if (classSection === "Junior Da-awa" && !isJuniorOn) return [];

        return timeTable.timeSlots
          .filter(
            (slot) => slot.teacherId?._id === teacherId && slot.day === today && !slot.validTo
          )
          .map((slot) => ({
            ...slot,
            classId: timeTable.classId,
            periodDetails: periods.find(
              (p) => p.periodNumber === slot.periodNumber
            ),
          }));
      }
    );

    return teachersSlots.sort((a, b) => a.periodNumber - b.periodNumber);
  }, [timeTablesQuery.data?.timeTables, periods, teacherId, today, settings]);

  // Precompute attendance status once
  const attendanceStatus = useMemo(() => {
    if (!attendanceQuery.data?.attendances) return {};

    const statusMap = {};
    attendanceQuery.data.attendances.forEach((attendance) => {
      const key = `${attendance.classId?._id}:${attendance.subjectId?._id}:${attendance.periodNumber}`;
      statusMap[key] = attendance;
    });

    return statusMap;
  }, [attendanceQuery.data?.attendances]);

  // Set loading state only when needed
  useEffect(() => {
    if (
      periodsQuery.isLoading ||
      timeTablesQuery.isLoading ||
      attendanceQuery.isLoading ||
      settingsQuery.isLoading ||
      leaveRecordQuery.isLoading
    ) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [
    periodsQuery.isLoading,
    timeTablesQuery.isLoading,
    attendanceQuery.isLoading,
    settingsQuery.isLoading,
    leaveRecordQuery.isLoading,
  ]);

  // Memoize attendance check function
  const isAttendanceMarked = useCallback(
    (slot) => {
      if (!slot) return false;
      const key = `${slot.classId?._id}:${slot.subjectId?._id}:${slot.periodNumber}`;
      return !!attendanceStatus[key];
    },
    [attendanceStatus]
  );

  const handleBulkLeave = async () => {
    if (bulkReason.trim() !== "" && bulkReason.length > 20) {
      setBulkError(true);
      toast.error("Leave reason should not exceed 20 characters.");
      return;
    }

    // Only apply to slots that don't already have attendance marked
    const slotsToUpdate = filteredSlots.filter((slot) => !isAttendanceMarked(slot));
    if (slotsToUpdate.length === 0) {
      toast.info("All periods already have attendance marked.");
      setBulkReasonOpen(false);
      return;
    }

    try {
      await Promise.all(
        slotsToUpdate.map((slot) =>
          addLeaveRecord.mutateAsync({
            teacherId,
            classId: slot.classId._id,
            periodNumber: slot.periodNumber,
            date: new Date(),
            leaveReason: bulkReason,
          })
        )
      );
      toast.success("Leave reason applied to all periods.");
      setBulkReasonOpen(false);
      setBulkReason("");
      setBulkError(false);
      await leaveRecordQuery.refetch();
      router.refresh();
    } catch (error) {
      console.error("Error submitting bulk leave reason:", error);
      toast.error(error.message || "Error submitting leave reason");
    }
  };

  const handleBulkClear = async () => {
    if (bulkExistingRecordIds.length === 0) return;
    try {
      await Promise.all(
        bulkExistingRecordIds.map((id) =>
          deleteLeaveRecord.mutateAsync({ data: { _id: id } })
        )
      );
      toast.success("Leave reasons cleared for all periods.");
      setBulkReasonOpen(false);
      setBulkReason("");
      setBulkExistingRecordIds([]);
      setBulkError(false);
      await leaveRecordQuery.refetch();
      router.refresh();
    } catch (error) {
      console.error("Error clearing bulk leave reasons:", error);
      toast.error(error.message || "Error clearing leave reasons");
    }
  };

  const handleLeave = async () => {
    if (reason.trim() !== "" && reason.length > 20) {
      toast.error("Leave reason should not exceed 20 characters.");
      return;
    }

    try {
      await addLeaveRecord.mutateAsync({
        teacherId,
        classId,
        periodNumber,
        date: new Date(),
        leaveReason: reason,
      });
      toast.success("Leave reason submitted successfully.");
      setOpen(false);
      setReason("");
      setSelectedRecordId("");
      await leaveRecordQuery.refetch();
      router.refresh();
    } catch (error) {
      console.error("Error submitting leave reason:", error);
      toast.error(error.message || "Error submitting leave reason");
    }
  };

  const handleClear = async () => {
    if (!selectedRecordId) return;

    try {
      await deleteLeaveRecord.mutateAsync({ data: { _id: selectedRecordId } });
      toast.success("Leave reason cleared successfully.");
      setOpen(false);
      setReason("");
      setSelectedRecordId("");
      await leaveRecordQuery.refetch();
      router.refresh();
    } catch (error) {
      console.error("Error clearing leave reason:", error);
      toast.error(error.message || "Error clearing leave reason");
    }
  };

  const handleWhatsAppClick = async (e, slot) => {
    e.stopPropagation();
    
    const key = `${slot.classId?._id}:${slot.subjectId?._id}:${slot.periodNumber}`;
    const attendanceRecord = attendanceStatus[key];
    
    if (!attendanceRecord || typeof attendanceRecord !== "object") {
      toast.error("Attendance not found or not marked yet.");
      return;
    }
    
    const subjectName = slot.subjectId?.name || "this subject";
    
    // Use pre-fetched attendanceData from attendanceQuery
    const absentStudents = attendanceRecord.attendanceData?.filter(student => !student.present) || [];
    
    if (absentStudents.length === 0) {
      toast.info("No absent students for this period.");
      return;
    }
    
    setWhatsappModalData({
      subjectName,
      loading: true,
      students: []
    });

    let leaveRecordsData = [];
    try {
      const response = await fetchItems("leave-records", apiKey, 0, 0, { classId: slot.classId?._id, isArrived: "false" });
      leaveRecordsData = response?.["leave-records"] || [];
    } catch (err) {
      console.error("Failed to fetch leave records:", err);
    }

    const studentsToMessage = [];
    absentStudents.forEach(student => {
      const number = student.guardianContactNumber || student.contactNumber;
      if (number) {
        const formattedNumber = number.replace(/\D/g, '');
        if (!studentsToMessage.some(s => s.contactNumber === formattedNumber)) {
          const studentLeave = leaveRecordsData.find(record => {
            const rId = typeof record.studentId === 'object' ? record.studentId?._id : record.studentId;
            const sId = typeof student.studentId === 'object' ? student.studentId?._id : student.studentId;
            return String(rId) === String(sId);
          });
          const leaveReason = studentLeave?.leaveReason || student?.leaveReason || "No Reason";

          studentsToMessage.push({
            name: student.studentName || "Student",
            contactNumber: formattedNumber,
            leaveReason: leaveReason
          });
        }
      }
    });
    
    if (studentsToMessage.length === 0) {
      setWhatsappModalData(null);
      toast.error("No contact numbers found for absent students.");
      return;
    }
    
    setWhatsappModalData({
      subjectName,
      loading: false,
      students: studentsToMessage
    });
  };

  // ── Hifz & Doura logic ───────────────────────────────────────────────
  const activeYear = Cookies.get("active-year") || "";

  // Fetch enrollments where this teacher is the designated teacher
  const fetchHifzEnrollments = useCallback(async () => {
    setHifzLoadingEnroll(true);
    try {
      const res = await fetch(`/api/hifz-doura-class?teacherId=${teacherId}&year=${activeYear}&projection=studentId,classId,teacherId,enrolledAt`, {
        credentials: "include",
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      setHifzEnrollments(data?.enrollments || []);
    } catch {
      /* silent */
    } finally {
      setHifzLoadingEnroll(false);
    }
  }, [teacherId, apiKey, activeYear]);

  useEffect(() => {
    if (teacherId) fetchHifzEnrollments();
  }, [fetchHifzEnrollments, teacherId]);

  // Fetch current teacher's name once
  useEffect(() => {
    if (!teacherId) return;
    fetch(`/api/users?_id=${teacherId}`, {
      credentials: "include",
      headers: { "api-key": apiKey },
    })
      .then((r) => r.json())
      .then((data) => {
        const name = data?.users?.[0]?.name || "";
        if (name) setTeacherName(name);
      })
      .catch(() => {});
  }, [teacherId, apiKey]);

  // Classes where this teacher is the Hifz teacher
  const hifzClasses = useMemo(() => {
    const map = {};
    hifzEnrollments.forEach((e) => {
      const cId = e.classId?._id || e.classId;
      if (!map[cId]) {
        map[cId] = { classId: cId, className: e.classId?.name || cId, students: [] };
      }
      map[cId].students.push(e);
    });
    return Object.values(map);
  }, [hifzEnrollments]);

  const hifzSelectedClass = useMemo(
    () => hifzClasses.find((c) => c.classId === hifzSelectedClassId),
    [hifzClasses, hifzSelectedClassId]
  );

  // Load existing records for the selected class+date
  const loadHifzRecords = useCallback(async () => {
    if (!hifzSelectedClassId || !hifzDate) return;
    setHifzLoadingRecords(true);
    try {
      const res = await fetch(
        `/api/hifz-doura?classId=${hifzSelectedClassId}&date=${hifzDate}&year=${activeYear}`,
        { credentials: "include", headers: { "api-key": apiKey } }
      );
      const data = await res.json();
      const inputs = {};
      (data?.records || []).forEach((r) => {
        const sId = r.studentId?._id || r.studentId;
        inputs[sId] = r.pagesCount;
      });
      setHifzPageInputs(inputs);
    } catch {
      /* silent */
    } finally {
      setHifzLoadingRecords(false);
    }
  }, [hifzSelectedClassId, hifzDate, apiKey, activeYear]);

  useEffect(() => {
    loadHifzRecords();
  }, [loadHifzRecords]);

  // Fetch summary (total pages + last date) for all hifz classes
  const fetchHifzClassSummary = useCallback(async (classIds) => {
    if (!classIds || classIds.length === 0) return;
    try {
      const res = await fetch(
        `/api/hifz-doura?classId=${classIds.join(",")}&year=${activeYear}`,
        { credentials: "include", headers: { "api-key": apiKey } }
      );
      const data = await res.json();
      const summaryMap = {};

      // Initialize map for all requested classIds
      classIds.forEach((cId) => {
        summaryMap[cId] = { byStudent: {} };
      });

      (data?.records || []).forEach((r) => {
        const cId = r.classId?._id || r.classId;
        const sId = r.studentId?._id || r.studentId;
        const sName = r.studentId?.name || sId;

        if (!summaryMap[cId]) return;
        const byStudent = summaryMap[cId].byStudent;

        if (!byStudent[sId]) {
          byStudent[sId] = { name: sName, totalPages: 0, lastDate: null, records: [] };
        }
        byStudent[sId].totalPages += r.pagesCount || 0;
        const rDate = r.date ? new Date(r.date) : null;
        if (rDate && (!byStudent[sId].lastDate || rDate > byStudent[sId].lastDate)) {
          byStudent[sId].lastDate = rDate;
        }
        byStudent[sId].records.push({ date: r.date, pagesCount: r.pagesCount || 0 });
      });

      // Sort each student's records newest first
      Object.values(summaryMap).forEach((c) => {
        Object.values(c.byStudent).forEach((s) => {
          s.records.sort((a, b) => new Date(b.date) - new Date(a.date));
        });
      });

      setHifzClassSummary(summaryMap);
    } catch {
      /* silent */
    }
  }, [apiKey, activeYear]);

  useEffect(() => {
    if (hifzClasses.length > 0) {
      fetchHifzClassSummary(hifzClasses.map((c) => c.classId));
    }
  }, [hifzClasses, fetchHifzClassSummary]);

  // Fetch guardian contact numbers for all students in the selected WA class
  useEffect(() => {
    if (!hifzWhatsappClassId) return;
    const waClass = hifzClasses.find((c) => c.classId === hifzWhatsappClassId);
    if (!waClass) return;
    const studentIds = waClass.students.map((e) => e.studentId?._id || e.studentId).filter(Boolean);
    if (studentIds.length === 0) return;

    setHifzContactsLoading(true);
    Promise.all(
      studentIds.map((sId) =>
        fetch(`/api/users?_id=${sId}`, {
          credentials: "include",
          headers: { "api-key": apiKey },
        })
          .then((r) => r.json())
          .then((data) => {
            const u = data?.users?.[0];
            // guardianContactNumber is inside studentSpecificField in DB;
            // the users API formatter maps it to top-level guardianContactNumber
            return { sId, contact: u?.guardianContactNumber || "" };
          })
          .catch(() => ({ sId, contact: "" }))
      )
    ).then((results) => {
      const map = {};
      results.forEach(({ sId, contact }) => { map[sId] = contact; });
      setHifzStudentContacts(map);
      setHifzContactsLoading(false);
    });
  }, [hifzWhatsappClassId, hifzClasses, apiKey]);

  const handleHifzSave = async () => {
    if (!hifzSelectedClass) return;
    setHifzSaving(true);
    try {
      const Cookies2 = Cookies;
      const activeRole = Cookies2.get("active-role");
      const year = Cookies2.get("active-year") || "";
      const entries = hifzSelectedClass.students.map((enrollment) => {
        const sId = enrollment.studentId?._id || enrollment.studentId;
        return {
          studentId: sId,
          classId: hifzSelectedClassId,
          pagesCount: parseInt(hifzPageInputs[sId] || "0", 10),
          date: hifzDate,
        };
      });
      const res = await fetch("/api/hifz-doura", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          "active-role": activeRole,
          "active-year": year,
        },
        body: JSON.stringify({ entries, recordedBy: teacherId, year }),
      });
      const data = await res.json();
      if (res.ok) {
        setHifzSuccessOpen(true);
        setHifzDialogOpen(false);
        setHifzPageInputs({});
        setTimeout(() => {
          setHifzSuccessOpen(false);
        }, 1500);
      } else {
        toast.error(data.message || "Failed to save records");
      }
    } catch {
      toast.error("Failed to save Hifz records");
    } finally {
      setHifzSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <div>
          <Header
            title="MY PERIODS"
            subTitle="View Schedule & Take Attendance"
          />
        </div>
        <div className="flex flex-row items-center justify-between w-full mb-3 gap-2 overflow-hidden">
          {/* Day selector */}
          <div className="py-1.5 px-4 md:px-8 border border-border rounded-lg text-sm md:text-base font-medium whitespace-nowrap shrink-0">
            {date}
          </div>
          
          {isPrincipal && (
            <div className="shrink-0">
              <TodayStatusModal 
                type="teacher" 
                students={teachers} 
                customTrigger={
                  <Button variant="outline" className="flex items-center gap-1.5 md:gap-2 font-semibold text-sm md:text-base h-9 md:h-10 px-3 md:px-4">
                    <CalendarDays className="h-4 w-4" />
                    Teacher Status
                  </Button>
                }
              />
            </div>
          )}
        </div>

        <div>

          {/* ── Upcoming Special Day Banner ── */}
          {upcomingEvent && (
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="mb-4 w-full overflow-hidden rounded-lg border hover:opacity-90 transition-opacity text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-900 font-medium">
                <CalendarDays className="h-5 w-5 shrink-0 text-yellow-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center bg-yellow-200/60 text-yellow-800 rounded-md px-3 py-1.5 text-xs font-bold leading-tight whitespace-nowrap">
                      <span>{new Date(upcomingEvent.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {upcomingEvent.time && <span className="mt-0.5">{upcomingEvent.time}</span>}
                    </div>
                    <span className="text-sm font-semibold">{upcomingEvent.title}</span>
                  </div>
                  {upcomingEvent.description && (
                    <p className="text-xs opacity-80 mt-0.5">{upcomingEvent.description}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-yellow-600 shrink-0" />
              </div>
            </button>
          )}
          {/* ─────────────────────────────────────────── */}

          {/* Periods Table */}
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredSlots.length > 0 && settings?.general?.isWorkingDay ? (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 hidden md:table-cell">
                      Period
                    </TableHead>
                    <TableHead className="w-32 whitespace-nowrap">Time</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Subject
                    </TableHead>
                    <TableHead className="text-left md:text-center w-24 md:w-auto pl-0 md:pl-4">
                      <div
                        className="flex justify-start md:justify-center items-center pl-1 md:pl-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Pre-populate with existing reason from non-attended slots
                          const nonAttendedSlots = filteredSlots.filter((slot) => !isAttendanceMarked(slot));
                          const existingRecords = nonAttendedSlots
                            .map((slot) =>
                              leaveRecords.find(
                                (record) =>
                                  String(record.classId?._id || record.classId) === String(slot.classId?._id) &&
                                  record.periodNumber === slot.periodNumber &&
                                  formatDate(new Date(record.date)) === formattedDate
                              )
                            )
                            .filter(Boolean);
                          const existingIds = existingRecords.map((r) => r._id).filter(Boolean);
                          // Use the first found reason to pre-fill
                          const firstReason = existingRecords[0]?.leaveReason || "";
                          setBulkExistingRecordIds(existingIds);
                          setBulkReason(firstReason);
                          setBulkError(false);
                          setBulkReasonOpen(true);
                        }}
                      >
                        <FileText className="text-muted-foreground h-5 w-5 md:hidden cursor-pointer" title="Add reason for all periods" />
                        <Button size="sm" className="hidden md:inline-flex">
                          Reason
                        </Button>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlots.map((slot) => {
                    const leaveRecord = leaveRecords.find(
                      (record) =>
                        String(record.classId?._id || record.classId) === String(slot.classId?._id) &&
                        record.periodNumber === slot.periodNumber &&
                        formatDate(new Date(record.date)) === formattedDate
                    );
                    return (
                      <TableRow
                        key={slot._id}
                        className="hover:bg-accent/50"
                        onClick={() => {
                          handleNavigation(slot);
                        }}
                      >
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center justify-center font-medium">
                            <Badge variant="outline">{slot.periodNumber}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap w-32">
                          <div className="flex items-center gap-2">
                            {slot.periodDetails?.formattedTime ||
                              `Period ${slot.periodNumber}`}
                          </div>
                          {isAttendanceMarked(slot) && (
                            <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                              <CheckCircle2 className="text-green-500 h-3 w-3" />
                              <span>Attendance Marked</span>
                            </div>
                          )}
                          {leaveRecord && !isAttendanceMarked(slot) && leaveRecord.leaveReason && (
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-[10px] text-red-600 leading-tight">
                                {leaveRecord.leaveReason}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-xs md:text-base">
                            {slot.classId?.name}
                          </div>
                          <div className="text-xs md:hidden mt-1 text-muted-foreground">
                            {slot.subjectId?.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {slot.subjectId?.name}
                        </TableCell>
                        <TableCell className="text-left md:text-center align-middle pl-0 md:pl-4">
                          {isAttendanceMarked(slot) ? (
                            <div className="flex items-center justify-start md:justify-center gap-1 md:gap-2 -ml-2 md:ml-0">
                              <button
                                onClick={(e) => handleWhatsAppClick(e, slot)}
                                className="text-green-500 hover:text-green-600 transition-colors p-2 md:px-3 md:py-1.5 rounded-full md:rounded-md hover:bg-green-50 inline-flex items-center justify-center gap-1.5"
                                title="Message Absent Students"
                              >
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                <span className="hidden md:inline font-medium text-sm">Message</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const key = `${slot.classId?._id}:${slot.subjectId?._id}:${slot.periodNumber}`;
                                  setPerformanceSlot(slot);
                                  setPerformanceAttendanceRecord(attendanceStatus[key]);
                                  setPerformanceModalOpen(true);
                                }}
                                className="text-indigo-500 hover:text-indigo-600 transition-colors p-2 md:px-3 md:py-1.5 rounded-full md:rounded-md hover:bg-indigo-50 inline-flex items-center justify-center gap-1.5"
                                title="Class Performance"
                              >
                                <TrendingUp className="h-4 w-4" />
                                <span className="hidden md:inline font-medium text-sm">Performance</span>
                              </button>
                            </div>
                          ) : (
                            <div
                              className="z-10 flex justify-start md:justify-center items-center pl-1 md:pl-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(true);
                                setClassId(slot.classId._id);
                                setPeriodNumber(slot.periodNumber);
                                setReason(leaveRecord?.leaveReason || "");
                                setSelectedRecordId(leaveRecord?._id || "");
                              }}
                            >
                              <FileText className="text-muted-foreground h-5 w-5 md:hidden" />
                              <Button size="sm" className="hidden md:inline-flex">
                                Reason
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 border rounded-md font-bold text-muted-foreground text-lg">
              {(() => {
                if (!settings?.general?.isWorkingDay) {
                  return settings?.general?.occasion || "Today is a non-working day.";
                }
                const isSeniorOn = settings?.general?.seniorDaawa?.isWorkingDay !== false;
                const isJuniorOn = settings?.general?.juniorDaawa?.isWorkingDay !== false;
                if (!isSeniorOn && !isJuniorOn) {
                  return settings?.general?.seniorDaawa?.occasion
                    || settings?.general?.juniorDaawa?.occasion
                    || "Both sections are off today.";
                }
                if (!isSeniorOn) {
                  return settings?.general?.seniorDaawa?.occasion || "Senior Da-awa section is off today.";
                }
                if (!isJuniorOn) {
                  return settings?.general?.juniorDaawa?.occasion || "Junior Da-awa section is off today.";
                }
                return "No periods scheduled for " + today + ".";
              })()}
            </div>
          )}
        </div>

        {/* ── Hifz & Doura Section ────────────────────────────────────────── */}
        {hifzLoadingEnroll ? null : hifzClasses.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <h2 className="font-bold text-lg">HIFZ &amp; DOURA</h2>
                <p className="text-sm text-muted-foreground">Quran memorization and revision tracking</p>
              </div>
            </div>

            {/* Classes table — click a row to open the students dialog */}
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 text-center">Sl.No</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-center w-24"></TableHead>
                    <TableHead className="text-center w-32">Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hifzClasses.map((cls, idx) => {
                    const summary = hifzClassSummary[cls.classId];
                    const summaryEntries = summary
                      ? cls.students.map((enrollment, si) => {
                          const sId = enrollment.studentId?._id || enrollment.studentId;
                          const sName = enrollment.studentId?.name || summary?.byStudent?.[sId]?.name || sId;
                          const info = summary?.byStudent?.[sId];
                          return {
                            sl: si + 1,
                            sId,
                            sName,
                            totalPages: info?.totalPages ?? 0,
                            lastDate: info?.lastDate ?? null,
                          };
                        })
                      : null;
                    return (
                      <TableRow
                        key={cls.classId}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => {
                          setHifzSelectedClassId(cls.classId);
                          setHifzDialogOpen(true);
                        }}
                      >
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{cls.className}</TableCell>
                        {/* WhatsApp column */}
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setHifzWhatsappClassId(cls.classId);
                            }}
                            className="inline-flex items-center justify-center gap-1 text-green-600 hover:text-green-700 transition-colors p-1.5 rounded-md hover:bg-green-50"
                            title="Send WhatsApp to guardians"
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                          </button>
                        </TableCell>

                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHifzRecordsDialogClassId(cls.classId);
                            }}
                          >
                            <BookOpenCheck className="h-3 w-3" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Students dialog */}
            <Dialog open={hifzDialogOpen} onOpenChange={(o) => { setHifzDialogOpen(o); if (!o) { setHifzSelectedClassId(""); setHifzPageInputs({}); } }}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpenCheck className="h-5 w-5 text-primary" />
                    {hifzSelectedClass?.className} — HIFZ &amp; DOURA
                  </DialogTitle>
                  <DialogDescription className="flex justify-center mt-2">
                    <input
                      type="date"
                      value={hifzDate}
                      onChange={(e) => setHifzDate(e.target.value)}
                      className="border-2 border-primary/20 rounded-md px-4 py-2 text-base font-semibold bg-primary/5 text-primary shadow-sm cursor-pointer hover:bg-primary/10 transition-colors"
                    />
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                  {hifzLoadingRecords ? (
                    <div className="flex justify-center py-12">
                      <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Sl.No</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="text-center w-36">Pages Recited</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(hifzSelectedClass?.students || []).map((enrollment, idx) => {
                          const sId = enrollment.studentId?._id || enrollment.studentId;
                          const sName = enrollment.studentId?.name || sId;
                          const admNo = enrollment.studentId?.studentSpecificField?.admissionNumber || "";
                          return (
                            <TableRow key={sId}>
                              <TableCell className="text-center text-muted-foreground font-medium">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <p className="font-medium text-sm">{sName}</p>
                                {admNo && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Adm: {admNo}</p>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="604"
                                  className="w-20 text-center mx-auto"
                                  value={hifzPageInputs[sId] ?? ""}
                                  onChange={(e) =>
                                    setHifzPageInputs((prev) => ({
                                      ...prev,
                                      [sId]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="border-t pt-3 flex justify-end">
                  <Button
                    onClick={handleHifzSave}
                    disabled={hifzSaving}
                    className="flex items-center gap-2"
                  >
                    {hifzSaving ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Records
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Records summary dialog */}
            {(() => {
              const recordsClass = hifzClasses.find((c) => c.classId === hifzRecordsDialogClassId);
              const summary = hifzClassSummary[hifzRecordsDialogClassId];
              const summaryEntries = recordsClass && summary
                ? recordsClass.students.map((enrollment, si) => {
                    const sId = enrollment.studentId?._id || enrollment.studentId;
                    const sName = enrollment.studentId?.name || summary?.byStudent?.[sId]?.name || sId;
                    const info = summary?.byStudent?.[sId];
                    return {
                      sl: si + 1,
                      sId,
                      sName,
                      totalPages: info?.totalPages ?? 0,
                      lastDate: info?.lastDate ?? null,
                      records: info?.records ?? [],
                    };
                  })
                : null;

              const drillStudent = selectedRecordsStudent
                ? summaryEntries?.find((e) => e.sId === selectedRecordsStudent.sId)
                : null;

              return (
                <Dialog
                  open={!!hifzRecordsDialogClassId}
                  onOpenChange={(o) => { if (!o) { setHifzRecordsDialogClassId(""); setSelectedRecordsStudent(null); } }}
                >
                  <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader className="text-left space-y-0">
                      <div className="flex justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                          <DialogTitle className="flex items-start sm:items-center gap-2">
                            <BookOpenCheck className="h-5 w-5 text-primary shrink-0 mt-1 sm:mt-0" />
                            {drillStudent ? (
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span>{drillStudent.sName}</span>
                                <span className="hidden sm:inline text-muted-foreground font-normal text-sm">/</span>
                                <button
                                  onClick={() => setSelectedRecordsStudent(null)}
                                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-normal underline underline-offset-2 text-left mt-1 sm:mt-0"
                                >
                                  {recordsClass?.className}
                                </button>
                              </div>
                            ) : (
                              <span>{recordsClass?.className} — Records</span>
                            )}
                          </DialogTitle>

                        </div>
                      </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto">
                      {!summaryEntries ? (
                        <div className="flex justify-center py-12">
                          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : drillStudent ? (
                        /* ── Per-student records view ── */
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-2 pt-2 pb-1">
                            <div className="flex items-center justify-center gap-1.5 bg-primary/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md border border-primary/20 shrink-0">
                              <span className="text-[10px] sm:text-xs text-primary font-bold uppercase tracking-wider">Total Sessions:</span>
                              <span className="text-base sm:text-lg font-black text-primary leading-none">{drillStudent.records.length}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 bg-primary/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md border border-primary/20 shrink-0">
                              <span className="text-[10px] sm:text-xs text-primary font-bold uppercase tracking-wider">Total Pages:</span>
                              <span className="text-base sm:text-lg font-black text-primary leading-none">{drillStudent.totalPages}</span>
                            </div>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12 text-center">Sl.No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-center w-28">Pages</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {drillStudent.records.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No sessions recorded yet.</TableCell>
                                </TableRow>
                              ) : (
                                drillStudent.records.map((rec, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-center text-muted-foreground font-medium">{idx + 1}</TableCell>
                                    <TableCell className="text-sm">
                                      {rec.date
                                        ? new Date(rec.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant={rec.pagesCount > 0 ? "default" : "secondary"}>
                                        {rec.pagesCount}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        /* ── Student list view ── */
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 text-center">Sl.No</TableHead>
                              <TableHead>Student Name</TableHead>
                              <TableHead className="text-center w-28">Total Pages</TableHead>
                              <TableHead className="text-center w-32">Last Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryEntries.map((entry) => (
                              <TableRow
                                key={entry.sId}
                                className="cursor-pointer hover:bg-accent/60"
                                onClick={() => setSelectedRecordsStudent({ sId: entry.sId, sName: entry.sName })}
                              >
                                <TableCell className="text-center text-muted-foreground font-medium">
                                  {entry.sl}
                                </TableCell>
                                <TableCell>
                                  <p className="font-medium text-sm">{entry.sName}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={entry.totalPages > 0 ? "default" : "secondary"}>
                                    {entry.totalPages}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                  {entry.lastDate
                                    ? new Date(entry.lastDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })()}

            {/* WhatsApp guardian message dialog */}
            {(() => {
              const waClass = hifzClasses.find((c) => c.classId === hifzWhatsappClassId);
              const summary = hifzClassSummary[hifzWhatsappClassId];
              return (
                <Dialog
                  open={!!hifzWhatsappClassId}
                  onOpenChange={(o) => { if (!o) setHifzWhatsappClassId(""); }}
                >
                  <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {waClass?.className} - Hifz &amp; Doura
                      </DialogTitle>
                      <DialogDescription>
                        Send Hifz &amp; Doura progress
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                      {hifzContactsLoading ? (
                        <div className="flex justify-center items-center py-12">
                          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">Sl.No</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="text-center w-32">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(waClass?.students || []).map((enrollment, idx) => {
                            const sId = enrollment.studentId?._id || enrollment.studentId;
                            const sName = enrollment.studentId?.name || sId;
                            // Use fetched contact map (handles String-typed ref — populate doesn't work)
                            const guardian = hifzStudentContacts[sId] || "";
                            const formattedNumber = guardian.replace(/\D/g, "");

                            const studentInfo = summary?.byStudent?.[sId];
                            const todayRecord = studentInfo?.records?.find((r) => {
                              if (!r.date) return false;
                              const rStr = new Date(r.date).toISOString().slice(0, 10);
                              return rStr === hifzDate;
                            });
                            const pagesCount = todayRecord?.pagesCount ?? 0;

                            const dateLabel = hifzDate
                              ? new Date(hifzDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                              : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

                            const msg = `*Hifz & Doura Progress Report*
Date: ${dateLabel}
Student: ${sName}
Class: ${waClass?.className}
*Pages Recited: ${pagesCount}*
Teacher: ${teacherName || "Teacher"}`;
                            const waUrl = formattedNumber
                              ? `https://wa.me/${formattedNumber}?text=${encodeURIComponent(msg)}`
                              : null;

                            return (
                              <TableRow key={sId}>
                                <TableCell className="text-center text-muted-foreground font-medium">{idx + 1}</TableCell>
                                <TableCell>
                                  <p className="font-medium text-sm">{sName}</p>
                                  {guardian ? (
                                    <p className="text-xs text-muted-foreground mt-0.5">{guardian}</p>
                                  ) : (
                                    <p className="text-xs text-destructive mt-0.5">No contact</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {waUrl ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex items-center gap-1.5 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                                      onClick={() => {
                                        const a = document.createElement("a");
                                        a.href = waUrl;
                                        a.target = "_blank";
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                      </svg>
                                      Message
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })()}
          </div>
        ) : null}


        {/* ── Academic Calendar Events Popup ── */}
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-yellow-600" />
                Academic Calendar — {currentYear}
              </DialogTitle>
              <DialogDescription>
                Special days and events for the current year.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
              {calendarEventsQuery.isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (() => {
                const allEvents = calendarEventsQuery.data?.["academic-calendar"] || [];
                const sorted = [...allEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
                if (sorted.length === 0) {
                  return (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No special days marked for {currentYear}.
                    </p>
                  );
                }
                const grouped = sorted.reduce((acc, ev) => {
                  const m = new Date(ev.date).getMonth();
                  if (!acc[m]) acc[m] = [];
                  acc[m].push(ev);
                  return acc;
                }, {});
                const MONTHS_LIST = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date &amp; Time</TableHead>
                        <TableHead className="text-xs">Event</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(grouped).flatMap(([monthIdx, evs]) => [
                        <TableRow key={`m-${monthIdx}`} className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={2} className="font-semibold py-1.5 h-auto text-xs text-center">
                            {MONTHS_LIST[parseInt(monthIdx)]}
                          </TableCell>
                        </TableRow>,
                        ...evs.map(ev => (
                          <TableRow key={ev._id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              <div>{new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                              {ev.time && <div className="text-muted-foreground mt-0.5">{ev.time}</div>}
                            </TableCell>
                            <TableCell>
                              <p className="text-xs font-medium">{ev.title}</p>
                              {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                            </TableCell>
                          </TableRow>
                        ))
                      ])}
                    </TableBody>
                  </Table>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Bulk Reason Dialog ── */}
        <Dialog open={bulkReasonOpen} onOpenChange={(o) => { setBulkReasonOpen(o); if (!o) { setBulkReason(""); setBulkError(false); setBulkExistingRecordIds([]); } }}>
          <DialogContent ref={bulkPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
            <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
              <button 
                type="button"
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
                onClick={handleBulkDownload}
                title="Download Image"
                data-html2canvas-ignore="true"
              >
                <FileText className="h-5 w-5 text-primary" />
              </button>
              <div className="flex-1 text-left space-y-0.5">
                <DialogTitle className="text-xl font-bold m-0">
                  Reason for All Periods
                </DialogTitle>
                <DialogDescription className="m-0 text-xs">
                  This reason will be applied to all periods that don&apos;t have attendance marked yet.
                </DialogDescription>
              </div>
              <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                <X className="h-5 w-5" />
              </DialogClose>
            </DialogHeader>
            <div className="p-5 space-y-4 bg-muted/5 flex-1 overflow-y-auto">
              <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
              <div className="relative">
                <Input
                  placeholder="Select or type a reason..."
                  value={bulkReason}
                  onChange={(e) => {
                    if (e.target.value.length > 20) {
                      setBulkError(true);
                    } else {
                      setBulkError(false);
                    }
                    setBulkReason(e.target.value);
                  }}
                  className="pl-10 pr-10"
                />
                <Popover open={bulkComboboxOpen} onOpenChange={setBulkComboboxOpen}>
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
                          {leaveReasons.map((r) => (
                            <CommandItem
                              key={r}
                              value={r}
                              onSelect={(currentValue) => {
                                setBulkReason(currentValue);
                                setBulkComboboxOpen(false);
                                setBulkError(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  bulkReason === r ? "opacity-100" : "opacity-0"
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
              {bulkError && (
                <p className="text-destructive text-xs p-1 mt-1">
                  Leave reason should not exceed 20 characters.
                </p>
              )}
              </div>
              <div className="flex gap-2">
                {bulkExistingRecordIds.length > 0 && (
                <Button
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  disabled={deleteLeaveRecord.isPending}
                  onClick={handleBulkClear}
                >
                  Clear All
                </Button>
              )}
              <Button
                disabled={addLeaveRecord.isPending || bulkError}
                onClick={handleBulkLeave}
                className={bulkExistingRecordIds.length > 0 ? "flex-1" : "w-full"}
              >
                {bulkExistingRecordIds.length > 0 ? "Update All" : "Apply to All Periods"}
              </Button>
            </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent ref={reasonPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
            <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
              <button 
                type="button"
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
                onClick={handleReasonDownload}
                title="Download Image"
                data-html2canvas-ignore="true"
              >
                <FileText className="h-5 w-5 text-primary" />
              </button>
              <div className="flex-1 text-left space-y-0.5">
                <DialogTitle className="text-xl font-bold m-0">
                  Leave Reason
                </DialogTitle>
                <DialogDescription className="m-0 text-xs">
                  Provide a leave reason.
                </DialogDescription>
              </div>
              <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                <X className="h-5 w-5" />
              </DialogClose>
            </DialogHeader>
            <div className="p-5 space-y-4 bg-muted/5 flex-1 overflow-y-auto">
              <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
              <div className="relative">
                <Input
                  placeholder="Select or type a reason..."
                  value={reason}
                  onChange={(e) => {
                    if (e.target.value.length > 20) {
                      setError(true);
                    }
                    setReason(e.target.value);
                  }}
                  className="pl-10 pr-10"
                />
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
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
                          {leaveReasons.map((r) => (
                            <CommandItem
                              key={r}
                              value={r}
                              onSelect={(currentValue) => {
                                setReason(currentValue);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  reason === r ? "opacity-100" : "opacity-0"
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
              </div>{" "}
                {error && (
                  <p className="text-destructive text-xs p-1 mt-1">
                    Leave reason should not exceed 20 characters.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {selectedRecordId && (
                <Button 
                  variant="outline" 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  disabled={deleteLeaveRecord.isPending} 
                  onClick={handleClear}
                >
                  Clear
                </Button>
              )}
                <Button 
                  disabled={addLeaveRecord.isPending || error} 
                  onClick={handleLeave}
                  className={selectedRecordId ? "flex-1" : "w-full"}
                >
                  Submit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── WhatsApp Absent Students Dialog ── */}
        <Dialog open={!!whatsappModalData} onOpenChange={(open) => !open && setWhatsappModalData(null)}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                Absent Students
              </DialogTitle>
              <DialogDescription>
                Message the parents of students who are absent for {whatsappModalData?.subjectName}.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6 pb-2">
              {whatsappModalData?.loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader className="h-8 w-8 animate-spin text-green-500" />
                  <p className="text-sm font-medium">Fetching absent students...</p>
                </div>
              ) : (
                <Table>
                  <TableBody>
                    {whatsappModalData?.students?.map((student, idx) => {
                      const msg = `Dear parent, your child ${student.name} is absent today for ${whatsappModalData.subjectName}.\nLeave Reason : ${student.leaveReason}`;
                      const url = `https://wa.me/${student.contactNumber}?text=${encodeURIComponent(msg)}`;
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <p className="font-medium text-sm">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.contactNumber}</p>
                          </TableCell>
                          <TableCell align="right">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = url;
                                a.target = '_blank';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                              Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <ClassPerformanceModal 
          open={performanceModalOpen} 
          onOpenChange={setPerformanceModalOpen}
          slot={performanceSlot}
          attendanceRecord={performanceAttendanceRecord}
          teacherId={teacherId}
          apiKey={apiKey}
        />

        {/* ── Hifz Success Popup ── */}
        <Dialog open={hifzSuccessOpen} onOpenChange={setHifzSuccessOpen}>
          <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
            <DialogHeader className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
                Successful
              </DialogTitle>
              <DialogDescription className="text-lg">
                Hifz records saved successfully.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyPeriods;
