"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader, Save, ArrowLeft, Clock, X, Calendar, History, CheckCircle2, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import useCrud from "@/hooks/use-crud";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

const AttendanceSheet = ({
    classId,
    className,
    batchId,
    prayer,
    date,
    apiKey,
    user,
    sessionLabel,
}) => {
    const router = useRouter();
    const [attendance, setAttendance] = useState({});
    const [saving, setSaving] = useState(false);
    const [previousAttendanceState, setPreviousAttendanceState] = useState(null);
    const [existingRecordId, setExistingRecordId] = useState(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [currentStudentHistory, setCurrentStudentHistory] = useState([]);
    const [currentStudentName, setCurrentStudentName] = useState("");
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const displaySessionPrayer = useMemo(() => {
        if (!sessionLabel || sessionLabel === "General") {
            return prayer;
        }
        if (sessionLabel.trim().toLowerCase() === prayer?.trim().toLowerCase()) {
            return sessionLabel;
        }
        return `${sessionLabel} · ${prayer}`;
    }, [sessionLabel, prayer]);

    const returnUrl = useMemo(() => {
        const isStandardPrayer = ["ZUHR", "ASAR", "MAGRIB", "ISHA", "SUBH"].includes(prayer?.toUpperCase());
        const isMasjid = (!sessionLabel || sessionLabel === "General" || sessionLabel === "Masjid") && isStandardPrayer;

        if (isMasjid) {
            return `/dashboard/general-attendance?session=Masjid&expanded=${prayer}`;
        }

        const targetSession = sessionLabel && sessionLabel !== "General" ? sessionLabel : prayer;
        return `/dashboard/general-attendance?session=${encodeURIComponent(targetSession || "Masjid")}`;
    }, [sessionLabel, prayer]);

    useEffect(() => {
        if (!showSuccessDialog) return;

        const timer = setTimeout(() => {
            setShowSuccessDialog(false);
            router.push(returnUrl);
        }, 2000);

        return () => clearTimeout(timer);
    }, [showSuccessDialog, returnUrl, router]);

    const isPastDate = useMemo(() => {
        if (!date) return false;
        const todayStr = formatDate(new Date());
        let dateStr = "";
        if (typeof date === "string" && date.includes("T")) {
            dateStr = date.split("T")[0];
        } else if (typeof date === "string" && date.length === 10) {
            dateStr = date;
        } else {
            dateStr = formatDate(new Date(date));
        }
        return dateStr < todayStr;
    }, [date]);

    const displayDate = useMemo(() => {
        if (!date) return "";
        const d = new Date(date);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const day = d.toLocaleDateString('en-US', { weekday: 'long' });
        return `${dd}-${mm}-${yyyy}, ${day}`;
    }, [date]);

    const popupRef = useRef(null);
    const { handleDownload } = useDownloadPopup(popupRef, `Absent_History_${currentStudentName.replace(/\s+/g, '_')}.jpeg`);

    const successPopupRef = useRef(null);
    const { handleDownload: handleSuccessDownload } = useDownloadPopup(
        successPopupRef,
        `Attendance_${(className || "Class").replace(/\s+/g, '_')}_${prayer}_${(date || "").replace(/\s+/g, '_')}.jpeg`
    );

    // Fetch students
    const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
    const studentsQuery = useFetchStudents(
        0,
        0,
        {
            classId,
            roles: "Student",
            status: "Active",
        },
        {
            staleTime: 1000 * 60 * 10,
        }
    );

    const students = useMemo(() => {
        const list = studentsQuery.data?.users || [];
        return [...list].sort((a, b) => {
            const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
            const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
            return String(idA).localeCompare(String(idB), undefined, { numeric: true });
        });
    }, [studentsQuery.data]);

    const displayedStudents = useMemo(() => {
        if (!searchQuery.trim()) {
            return students.map((student, index) => ({
                student,
                originalIndex: index + 1,
            }));
        }

        const query = searchQuery.trim().toLowerCase();

        return students
            .map((student, index) => ({
                student,
                originalIndex: index + 1,
            }))
            .filter(({ student, originalIndex }) => {
                const name = (student.name || "").toLowerCase();
                const admNo = String(
                    student.studentSpecificField?.admissionNumber ||
                    student.admissionNumber ||
                    ""
                ).toLowerCase();
                const id = String(student._id || "").toLowerCase();
                const rollStr = String(originalIndex);

                return (
                    name.includes(query) ||
                    admNo.includes(query) ||
                    id.includes(query) ||
                    rollStr === query
                );
            });
    }, [students, searchQuery]);

    // Fetch existing attendance for current day/prayer
    const {
        useFetchItems: useFetchAttendance,
        useAddItem: useSaveAttendance,
        useUpdateItem: useUpdateAttendance,
        useDeleteItem: useDeleteAttendance,
    } = useCrud("masjid/attendance", apiKey);

    const attendanceQuery = useFetchAttendance(
        0,
        0,
        {
            date,
            prayer,
            classId,
        },
        {
            refetchOnMount: true,
        }
    );

    // Fetch leave records for the class to identify students on leave
    const { useFetchItems: useFetchLeaveRecords } = useCrud("leave-records", apiKey);
    const leaveRecordsQuery = useFetchLeaveRecords(
        0,
        0,
        {
            classId,
            projection: "studentId,dateOfLeave,arrivedDate",
        },
        {
            refetchOnMount: true,
        }
    );

    const studentsOnLeave = useMemo(() => {
        if (!leaveRecordsQuery.data?.["leave-records"]) return {};

        const onLeaveMap = {};
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        leaveRecordsQuery.data["leave-records"].forEach((record) => {
            if (!record.studentId) return;

            const studentId = record.studentId._id || record.studentId;
            const leaveDate = new Date(record.dateOfLeave);
            leaveDate.setHours(0, 0, 0, 0);

            // Check if student is on leave for the attendance date
            // Condition: Leave started on or before attendance date
            // AND (Not arrived yet OR Arrived AFTER attendance date)
            if (leaveDate <= attendanceDate) {
                if (!record.arrivedDate) {
                    onLeaveMap[studentId] = true;
                } else {
                    const arrivedDate = new Date(record.arrivedDate);
                    arrivedDate.setHours(0, 0, 0, 0);
                    if (arrivedDate > attendanceDate) {
                        onLeaveMap[studentId] = true;
                    }
                }
            }
        });

        return onLeaveMap;
    }, [leaveRecordsQuery.data, date]);

    // Fetch ALL historical attendance for this class to calculate stats
    // Note: This might be heavy if there are many records. 
    // Ideally, the backend should provide stats, but we are doing it client-side as per request.
    const historyQuery = useFetchAttendance(
        0,
        0,
        {
            classId,
        },
        {
            staleTime: 1000 * 60 * 5,
        }
    );

    // Calculate absent days per student
    const studentHistory = useMemo(() => {
        if (!historyQuery.data?.attendances) return {};

        const historyMap = {};

        // Initialize for all current students
        students.forEach(s => {
            historyMap[s._id] = [];
        });

        historyQuery.data.attendances.forEach(record => {
            record.attendanceData.forEach(item => {
                const studentId = item.studentId._id || item.studentId;
                if (item.status === "ABSENT" || item.status === "LEAVE") {
                    if (!historyMap[studentId]) historyMap[studentId] = [];
                    historyMap[studentId].push({
                        date: record.date,
                        prayer: record.prayer,
                        status: item.status
                    });
                }
            });
        });

        return historyMap;
    }, [historyQuery.data, students]);


    useEffect(() => {
        // Wait for leave records to load before initializing logic that depends on them
        if (leaveRecordsQuery.isLoading) return;

        if (attendanceQuery.data?.attendances?.length > 0) {
            const record = attendanceQuery.data.attendances[0];
            setExistingRecordId(record._id);

            const initialAttendance = {};
            record.attendanceData.forEach((item) => {
                initialAttendance[item.studentId._id || item.studentId] =
                    item.status === "PRESENT";
            });
            setAttendance(initialAttendance);
        } else if (students.length > 0 && Object.keys(attendance).length === 0) {
            // Initialize:
            // - Normal students: Present (true)
            // - Leave students: Absent/Leave (false)
            const initialAttendance = {};
            students.forEach((student) => {
                const isOnLeave = studentsOnLeave[student._id];
                initialAttendance[student._id] = !isOnLeave; // Default false (absent) if on leave, true otherwise
            });
            setAttendance(initialAttendance);
        }
    }, [attendanceQuery.data, students, studentsOnLeave, leaveRecordsQuery.isLoading]);

    const toggleAttendance = (studentId) => {
        // Toggle is now allowed for EVERYONE including leave students
        setPreviousAttendanceState(null);
        setAttendance((prev) => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    };

    // Handle Present count touch / click
    const handlePresentCountClick = useCallback(() => {
        if (isPastDate || saving || !students.length) return;

        const allPresent = students.every((st) => !!attendance[st._id]);

        // If currently in all-present mode or all students are present and we have an earlier state saved:
        if (previousAttendanceState && (previousAttendanceState.mode === "present" || allPresent)) {
            setAttendance(previousAttendanceState.attendance);
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
                      mode: "present",
                  }
        );

        // Mark all students as present
        setAttendance((prev) => {
            const next = { ...prev };
            students.forEach((st) => {
                next[st._id] = true;
            });
            return next;
        });

        toast.success("Marked all students as present");
    }, [students, attendance, previousAttendanceState, isPastDate, saving]);

    // Handle Absent count touch / click
    const handleAbsentCountClick = useCallback(() => {
        if (isPastDate || saving || !students.length) return;

        const allAbsent = students.every((st) => !attendance[st._id]);

        // If currently in all-absent mode or all students are absent and we have an earlier state saved:
        if (previousAttendanceState && (previousAttendanceState.mode === "absent" || allAbsent)) {
            setAttendance(previousAttendanceState.attendance);
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
                      mode: "absent",
                  }
        );

        // Mark all students as absent
        setAttendance((prev) => {
            const next = { ...prev };
            students.forEach((st) => {
                next[st._id] = false;
            });
            return next;
        });

        toast.success("Marked all students as absent");
    }, [students, attendance, previousAttendanceState, isPastDate, saving]);

    const saveAttendance = useSaveAttendance();
    const updateAttendance = useUpdateAttendance();
    const deleteAttendance = useDeleteAttendance();

    const handleSave = async () => {
        if (isPastDate) {
            toast.error("Marking or updating attendance for previous dates is not allowed.");
            return;
        }

        setSaving(true);
        try {
            const attendanceData = students.map((student) => {
                const isLeave = studentsOnLeave[student._id];
                const isPresent = attendance[student._id];

                let status = "ABSENT";
                if (isPresent) {
                    status = "PRESENT"; // If marked present, it overrides leave
                } else if (isLeave) {
                    status = "LEAVE"; // If absent and on leave, status is LEAVE
                } else {
                    status = "ABSENT"; // If absent and not on leave
                }

                return {
                    studentId: student._id,
                    status,
                };
            });

            const payload = {
                date,
                day: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
                prayer,
                classId,
                batchId,
                markedBy: user._id,
                attendanceData,
            };

            await saveAttendance.mutateAsync(payload);
            setSuccessMessage(existingRecordId ? "Attendance Updated Successfully!" : "Attendance Marked Successfully!");
            setShowSuccessDialog(true);
            setExistingRecordId(true);
            setPreviousAttendanceState(null);
        } catch (error) {
            console.error("Error saving attendance:", error);
            toast.error("Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!existingRecordId || isPastDate) return;

        setSaving(true);
        try {
            await deleteAttendance.mutateAsync({ data: { ids: [existingRecordId] } });
            setResetDialogOpen(false);
            setSuccessMessage("Attendance Reset Successfully!");
            setShowSuccessDialog(true);
            setExistingRecordId(null);
            setPreviousAttendanceState(null);
            
            // Reset attendance based on leave status
            const resetAttendance = {};
            students.forEach((student) => {
                const isOnLeave = studentsOnLeave[student._id];
                resetAttendance[student._id] = !isOnLeave;
            });
            setAttendance(resetAttendance);
        } catch (error) {
            console.error("Error resetting attendance:", error);
            toast.error("Failed to reset attendance");
        } finally {
            setSaving(false);
        }
    };

    const stats = useMemo(() => {
        const total = students.length;
        let present = 0;
        let absent = 0;

        students.forEach(student => {
            // If attendance is true -> Present
            // If attendance is false -> Absent (regardless of leave status)
            if (attendance[student._id]) {
                present++;
            } else {
                absent++;
            }
        });

        return { total, present, absent };
    }, [students, attendance]);

    if (studentsQuery.isLoading || attendanceQuery.isLoading || leaveRecordsQuery.isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-3 md:pt-4">
            {/* Read-Only Banner for Past Dates */}
            {isPastDate && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                        <strong>Read-only mode:</strong> Viewing attendance for a previous date. Marking or updating attendance is disabled.
                    </span>
                </div>
            )}

            {/* Header & Metadata */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <div className="flex items-start md:items-center gap-2 flex-1">
                    <Button variant="ghost" size="icon" className="shrink-0 -mt-0.5 md:mt-0" onClick={() => router.push(returnUrl)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">
                            {isPastDate ? "VIEW ATTENDANCE" : "MARK ATTENDANCE"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {displaySessionPrayer} - {className}
                        </p>
                        {/* Mobile Date - aligned directly under heading and subheading */}
                        <div className="flex md:hidden items-center gap-1.5 text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">
                                {(() => {
                                    const d = new Date(date);
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const yyyy = d.getFullYear();
                                    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
                                    return `${dd}-${mm}-${yyyy}, ${day}`;
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Desktop Date */}
                <div className="hidden md:flex items-center gap-2 text-muted-foreground px-0">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">
                        {(() => {
                            const d = new Date(date);
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yyyy = d.getFullYear();
                            const day = d.toLocaleDateString('en-US', { weekday: 'long' });
                            return `${dd}-${mm}-${yyyy}, ${day}`;
                        })()}
                    </span>
                </div>
            </div>

            {/* Stats Cards - Exactly same style as in /dashboard/periods */}
            <div className="border border-border rounded-lg p-2 md:p-4 bg-card/30">
                <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                    <div
                        role={!isPastDate ? "button" : undefined}
                        tabIndex={!isPastDate ? 0 : undefined}
                        onClick={!isPastDate ? handlePresentCountClick : undefined}
                        onKeyDown={
                            !isPastDate
                                ? (e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handlePresentCountClick();
                                      }
                                  }
                                : undefined
                        }
                        className={cn(
                            "flex flex-col items-center gap-1 md:gap-2 select-none",
                            !isPastDate &&
                                "cursor-pointer group touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg transition-all"
                        )}
                        title={
                            !isPastDate
                                ? previousAttendanceState &&
                                  (previousAttendanceState.mode === "present" ||
                                      (stats.present === stats.total && stats.total > 0))
                                    ? "Click to restore earlier attendance"
                                    : "Click to mark all present"
                                : undefined
                        }
                    >
                        <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            Total
                        </span>
                        <div
                            className={cn(
                                "w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center transition-all",
                                !isPastDate && "group-active:scale-95 group-hover:border-emerald-500/60 group-hover:shadow-md",
                                previousAttendanceState?.mode === "present" &&
                                    "border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold"
                            )}
                        >
                            {stats.total}
                        </div>
                    </div>

                    <div
                        role={!isPastDate ? "button" : undefined}
                        tabIndex={!isPastDate ? 0 : undefined}
                        onClick={!isPastDate ? handlePresentCountClick : undefined}
                        onKeyDown={
                            !isPastDate
                                ? (e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handlePresentCountClick();
                                      }
                                  }
                                : undefined
                        }
                        className={cn(
                            "flex flex-col items-center gap-1 md:gap-2 select-none",
                            !isPastDate &&
                                "cursor-pointer group touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg transition-all"
                        )}
                        title={
                            !isPastDate
                                ? previousAttendanceState &&
                                  (previousAttendanceState.mode === "present" ||
                                      (stats.present === stats.total && stats.total > 0))
                                    ? "Click to restore earlier attendance"
                                    : "Click to mark all present"
                                : undefined
                        }
                    >
                        <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            Present
                        </span>
                        <div
                            className={cn(
                                "w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center transition-all",
                                !isPastDate && "group-active:scale-95 group-hover:border-emerald-500/60 group-hover:shadow-md",
                                previousAttendanceState?.mode === "present" &&
                                    "border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold"
                            )}
                        >
                            {stats.present}
                        </div>
                    </div>

                    <div
                        role={!isPastDate ? "button" : undefined}
                        tabIndex={!isPastDate ? 0 : undefined}
                        onClick={!isPastDate ? handleAbsentCountClick : undefined}
                        onKeyDown={
                            !isPastDate
                                ? (e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleAbsentCountClick();
                                      }
                                  }
                                : undefined
                        }
                        className={cn(
                            "flex flex-col items-center gap-1 md:gap-2 select-none",
                            !isPastDate &&
                                "cursor-pointer group touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg transition-all"
                        )}
                        title={
                            !isPastDate
                                ? previousAttendanceState &&
                                  (previousAttendanceState.mode === "absent" ||
                                      (stats.absent === stats.total && stats.total > 0))
                                    ? "Click to restore earlier attendance"
                                    : "Click to mark all absent"
                                : undefined
                        }
                    >
                        <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            Absent
                        </span>
                        <div
                            className={cn(
                                "w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg bg-red-500 text-white text-base md:text-xl font-bold shadow-sm flex items-center justify-center transition-all",
                                !isPastDate && "group-active:scale-95 group-hover:bg-red-600 group-hover:shadow-md",
                                previousAttendanceState?.mode === "absent" &&
                                    "ring-2 ring-red-400 ring-offset-2 dark:ring-offset-background font-extrabold"
                            )}
                        >
                            {stats.absent}
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="overflow-auto max-h-[calc(100vh-365px)] md:max-h-[calc(100vh-339px)] border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10 text-center px-2">R.no</TableHead>
                            <TableHead className="px-2 py-1.5 min-w-[150px]">
                                <div className="relative flex items-center w-full max-w-xs">
                                    <Search className="absolute left-1.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="text"
                                        placeholder="Search students..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") setSearchQuery("");
                                        }}
                                        className="h-8 pl-7 pr-6 text-xs bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none w-full placeholder:text-muted-foreground font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSearchQuery("");
                                            }}
                                            className="absolute right-1 text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors"
                                            title="Clear search"
                                            aria-label="Clear search"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="w-[50px] md:w-[70px] text-center px-1">
                                <span className="hidden md:inline">History</span>
                                <History className="h-5 w-5 md:hidden mx-auto" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedStudents.length > 0 ? (
                            displayedStudents.map(({ student, originalIndex }) => {
                                const isOnLeave = studentsOnLeave[student._id];
                                const isPresent = attendance[student._id];
                                const studentHistoryList = studentHistory[student._id] || [];
                                const historyCount = studentHistoryList.length;

                                // Visual state determination matching Attendance.jsx
                                let rowClass = "hover:bg-muted/50";
                                let textColor = "";

                                if (!isPresent) {
                                    if (isOnLeave) {
                                        rowClass = "bg-red-100 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-950";
                                        textColor = "text-red-900 dark:text-red-100";
                                    } else {
                                        rowClass = "bg-rose-50 dark:bg-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950";
                                        textColor = "text-rose-900 dark:text-rose-100";
                                    }
                                }

                                return (
                                    <TableRow
                                        key={student._id}
                                        className={cn(
                                            !isPastDate ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
                                            rowClass
                                        )}
                                        onClick={!isPastDate ? () => toggleAttendance(student._id) : undefined}
                                    >
                                        <TableCell className={`text-center align-middle px-2 ${textColor}`}>
                                            {originalIndex}
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
                                                    <p className={`text-[9px] ${textColor || "text-muted-foreground"}`}>
                                                        {student.studentSpecificField?.admissionNumber || student.admissionNumber || student._id}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className={`font-medium text-[13px] ${textColor}`}>
                                                        {student.name}
                                                    </p>
                                                    {isOnLeave && (
                                                        <span className="text-[10px] text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1 py-0.5 rounded border border-yellow-200 dark:border-yellow-800 mt-0.5 w-fit flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            On Leave
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle px-1">
                                            <div 
                                                className="cursor-pointer flex items-center justify-center mx-auto hover:bg-muted/50 p-1 rounded transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentStudentHistory(studentHistoryList);
                                                    setCurrentStudentName(student.name);
                                                    setHistoryDialogOpen(true);
                                                }}
                                                title="View Absent History"
                                            >
                                                {historyCount > 0 ? (
                                                    <div className="inline-flex items-center justify-center text-xs md:text-sm font-bold text-white bg-red-500 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md">
                                                        {historyCount}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">0</span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {searchQuery ? `No students found matching "${searchQuery}"` : "No students found in this class."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Action Buttons */}
            {!isPastDate ? (
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        className="border border-border"
                        onClick={() => setResetDialogOpen(true)}
                        disabled={!existingRecordId || saving}
                    >
                        {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        Reset
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !students.length}
                    >
                        {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        {existingRecordId ? "Update" : "Save"}
                    </Button>
                </div>
            ) : (
                <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
                    <span>Attendance marking and updating is disabled for previous dates.</span>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/general-attendance?expanded=${prayer}`)}>
                        Back to Dashboard
                    </Button>
                </div>
            )}

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md [&>button.absolute]:hidden flex flex-col p-0 gap-0">
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-3 sm:py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">
                            <RotateCcw className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left space-y-0.5">
                            <DialogTitle className="text-xl font-bold m-0 text-red-600 dark:text-red-400">
                                Reset Attendance?
                            </DialogTitle>
                            <DialogDescription className="m-0 text-xs text-muted-foreground">
                                {className || "Class"} · {displaySessionPrayer}
                            </DialogDescription>
                        </div>
                        <DialogClose 
                            className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => setResetDialogOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    <div className="p-5 space-y-3 bg-muted/5 flex-1">
                        <div className="bg-card border border-destructive/20 dark:border-destructive/30 rounded-xl p-4 space-y-1.5 shadow-sm">
                            <p className="text-sm font-semibold text-foreground">
                                Are you sure you want to reset this record?
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                This will remove the attendance record for this class. All students will be marked as pending. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="px-5 py-3 bg-muted/20 border-t flex flex-row items-center justify-end gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setResetDialogOpen(false)}
                            disabled={saving}
                            className="rounded-lg text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleReset}
                            disabled={saving}
                            className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                        >
                            {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Reset Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                <DialogContent ref={popupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-2 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
                        <button 
                            type="button"
                            className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors focus:outline-none cursor-pointer"
                            onClick={handleDownload}
                            title="Download Image"
                            data-html2canvas-ignore="true"
                        >
                            <Clock className="h-5 w-5 text-orange-500" />
                        </button>
                        <div className="flex-1 text-left space-y-0.5">
                            <DialogTitle className="text-xl font-bold m-0 text-orange-600 dark:text-orange-400">
                                Absent History - {currentStudentName}
                            </DialogTitle>
                            <DialogDescription className="m-0">
                                Past instances of being absent or on leave.
                            </DialogDescription>
                        </div>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    <div className="text-sm border-0 px-4 py-1 max-h-80 overflow-y-auto bg-muted/5 flex-1">
                        {currentStudentHistory.length > 0 ? (
                            <div className="space-y-0">
                                {currentStudentHistory.map((record, idx) => (
                                    <div key={idx} className="flex items-center gap-3 py-1.5 px-3 border-b last:border-0 hover:bg-muted/50 rounded transition-colors">
                                        <span className="font-medium text-muted-foreground w-6 text-center">{idx + 1}.</span>
                                        <div className="flex-1">
                                            <span className="font-medium">
                                                {(() => {
                                                    const d = new Date(record.date);
                                                    const dd = String(d.getDate()).padStart(2, '0');
                                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                    const yyyy = d.getFullYear();
                                                    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
                                                    return `${dd}-${mm}-${yyyy}, ${day}`;
                                                })()}
                                            </span>
                                            <span className="text-xs text-muted-foreground block">{record.prayer}</span>
                                        </div>
                                        {record.status === "LEAVE" && (
                                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full border border-yellow-200">
                                                On Leave
                                            </span>
                                        )}
                                        {record.status === "ABSENT" && (
                                            <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                                Absent
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No absent history found.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Dialog matching My Periods / Attendance.jsx */}
            <Dialog open={showSuccessDialog} onOpenChange={(open) => {
                if (!open) {
                    setShowSuccessDialog(false);
                    router.push(`/dashboard/general-attendance?expanded=${prayer}`);
                }
            }}>
                <DialogContent 
                    ref={successPopupRef}
                    data-html2canvas-popup="true"
                    className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden flex flex-col max-h-[90vh]"
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
                                    : "Attendance Marked"}
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
                                router.push(returnUrl);
                            }}
                        >
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>

                    <div className="p-5 space-y-4 bg-muted/5 flex-1">
                        {/* Class & Prayer Details Card */}
                        <div className="bg-card border rounded-xl p-3.5 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-base text-foreground">
                                    {className || "Class"}
                                </span>
                                <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20 font-medium">
                                    {displaySessionPrayer}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-muted-foreground">
                                <span>{displayDate}</span>
                            </div>
                        </div>

                        {/* Metrics Summary Grid */}
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-card shadow-sm">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Total
                                </span>
                                <span className="text-xl font-bold text-foreground mt-0.5">
                                    {stats.total}
                                </span>
                            </div>

                            <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-sm">
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    Present
                                </span>
                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {stats.present}
                                </span>
                            </div>

                            <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 shadow-sm">
                                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                    Absent
                                </span>
                                <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                    {stats.absent}
                                </span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AttendanceSheet;
