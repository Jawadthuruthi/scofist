"use client";
import { Button } from "@/components/ui/button";
import useCrud from "@/hooks/use-crud";
import { useReactToPrint } from "react-to-print";
import { DAYS, formatDateForDisplay, getISTDate, getISTDateString } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Check, ChevronsUpDown, FileText, Loader, UserX, X, Columns, Rows } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import PrintHeader from "@/components/PrintHeader";

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

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Absentees Dialog Component
const AbsenteesDialog = ({
  open,
  setOpen,
  cellData,
  day,
  periodNumber,
  absenteesList = [],
  useShortName = false,
  apiKey,
  date,
  leaveRecords: propLeaveRecords = [],
}) => {
  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `Absentees_${day}_Period_${periodNumber}.jpeg`);
  
  const hasPreloadedLeaves = Array.isArray(propLeaveRecords) && propLeaveRecords.length > 0;

  const studentIds = useMemo(() => {
    if (hasPreloadedLeaves) return "";
    return (absenteesList || [])
      .map((s) => s.studentId?._id || s.studentId)
      .filter(Boolean)
      .join(",");
  }, [absenteesList, hasPreloadedLeaves]);

  const { useFetchItems: useFetchLeaveRecords } = useCrud("leave-records", apiKey);
  const leaveRecordsQuery = useFetchLeaveRecords(
    0,
    0,
    { studentIds },
    { enabled: !!studentIds && open && !hasPreloadedLeaves, refetchOnWindowFocus: false }
  );

  const leaveRecords = hasPreloadedLeaves
    ? propLeaveRecords
    : (leaveRecordsQuery.data?.["leave-records"] || []);

  const studentLeaveMap = useMemo(() => {
    const map = new Map();
    if (!leaveRecords?.length) return map;
    for (const record of leaveRecords) {
      const sId = (record.studentId?._id || record.studentId)?.toString();
      if (!sId) continue;
      if (!map.has(sId)) {
        map.set(sId, []);
      }
      map.get(sId).push(record);
    }
    return map;
  }, [leaveRecords]);

  const targetDateMs = useMemo(() => {
    const d = new Date(date || new Date());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [date]);

  const getLeaveReason = useCallback((studentObj) => {
    // 1. Check if the reason is saved directly on the attendance record
    if (studentObj.leaveReason) return studentObj.leaveReason;

    // 2. Lookup in pre-indexed student leaves
    const sId = (studentObj.studentId?._id || studentObj.studentId)?.toString();
    if (!sId || !studentLeaveMap.has(sId)) return null;
    
    const studentLeaves = studentLeaveMap.get(sId);
    for (const record of studentLeaves) {
       if (!record.dateOfLeave) continue;
       const leaveDate = new Date(record.dateOfLeave);
       leaveDate.setHours(0, 0, 0, 0);
       const leaveDateMs = leaveDate.getTime();
       
       // If student has arrived back, use arrivedDate as end; otherwise use dateOfArrival if present
       const hasArrived = !!record.arrivedDate;
       let endDate = hasArrived ? new Date(record.arrivedDate) : (record.dateOfArrival ? new Date(record.dateOfArrival) : null);
       if (endDate) {
           endDate.setHours(23, 59, 59, 999);
       } else {
           endDate = new Date(leaveDate);
           endDate.setHours(23, 59, 59, 999);
       }
       const endDateMs = endDate.getTime();
       
       if (targetDateMs >= leaveDateMs && targetDateMs <= endDateMs) {
          return record.leaveReason;
       }
       // Overdue: leave started on or before targetDate, student hasn't arrived back yet
       if (!hasArrived && targetDateMs > endDateMs && targetDateMs >= leaveDateMs) {
          return record.leaveReason;
       }
    }
    return null;
  }, [studentLeaveMap, targetDateMs]);

  const dateStrForAbs = getISTDateString(date) || getISTDateString();
  const [ay, am, ad] = dateStrForAbs.split('-').map(Number);
  const formattedDateStr = `${String(ad).padStart(2, '0')}/${String(am).padStart(2, '0')}/${ay}, ${day}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent ref={popupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
        <DialogHeader className="flex flex-row items-center gap-3 px-4 py-4 border-b space-y-0 bg-red-50 dark:bg-red-950/20 sticky top-0 z-20 backdrop-blur-md">
          <button
            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus:outline-none"
            onClick={handleDownload}
            title="Download Image"
            data-html2canvas-ignore="true"
          >
            <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
          </button>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0 text-red-700 dark:text-red-400">
              Absentees ({absenteesList.length})
            </DialogTitle>
            <DialogDescription className="m-0 text-xs flex flex-col gap-1 text-muted-foreground mt-1">
              <span className="flex flex-wrap gap-x-1 items-center">
                <span className="font-medium text-foreground">{formattedDateStr}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>Period: <span className="font-medium text-foreground">{periodNumber}</span></span>
                <span className="text-muted-foreground/50">|</span>
                <span>Class: <span className="font-medium text-foreground">
                  {cellData?.classId?.shortname || cellData?.classId?.name || "N/A"}
                </span></span>
              </span>
              <span className="flex flex-wrap gap-x-1 items-center">
                <span className="font-medium text-foreground">{cellData?.subjectId?.name || "N/A"}</span>
                <span className="text-muted-foreground/50">|</span>
                <span className="font-medium text-foreground">{cellData?.teacherId?.name || "N/A"}</span>
              </span>
            </DialogDescription>
          </div>
          <div className="flex items-center self-stretch" data-html2canvas-ignore="true">
            <DialogClose className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>
        {absenteesList.length > 0 ? (
          <div className="text-sm border-0 px-4 pb-4 pt-2 max-h-80 overflow-y-auto bg-muted/5 space-y-1 flex-1">
            <div className="border rounded-md overflow-hidden bg-background">
              <Table>
                <TableHeader className="bg-red-50 dark:bg-red-950/20">
                  <TableRow>
                    <TableHead className="h-9 py-1">ID</TableHead>
                    <TableHead className="h-9 py-1">Student Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absenteesList.map((student) => {
                    const leaveReason = getLeaveReason(student);
                    return (
                      <TableRow key={student.studentId}>
                        <TableCell className="py-2 font-medium">{student.studentId || "Unknown"}</TableCell>
                        <TableCell className="py-2 font-medium">
                          {student.studentName || "-"}
                          {leaveReason && (
                            <div className="text-xs text-red-500 font-normal mt-0.5">
                              {leaveReason}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground flex-1 bg-muted/5">
            <Check className="h-10 w-10 text-green-500 mb-2 opacity-80" />
            <p className="font-medium">Full attendance for this period</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Edit Leave Reason Dialog (for College Admin - single slot)
const EditLeaveReasonDialog = ({ open, onOpenChange, leaveRecord, apiKey, onSuccess }) => {
  const [reason, setReason] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [error, setError] = useState(false);
  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, "Leave_Reason.jpeg");

  const { useAddItem, useDeleteItem } = useCrud("teachers-leave-record", apiKey);
  const addLeaveRecord = useAddItem();
  const deleteLeaveRecord = useDeleteItem();

  useEffect(() => {
    if (open && leaveRecord) {
      setReason(leaveRecord.leaveReason || "");
      setError(false);
    }
  }, [open, leaveRecord]);

  const handleSubmit = async () => {
    if (reason.trim() !== "" && reason.length > 20) {
      toast.error("Leave reason should not exceed 20 characters.");
      return;
    }
    try {
      await addLeaveRecord.mutateAsync({
        teacherId: leaveRecord.teacherId,
        classId: leaveRecord.classId,
        periodNumber: leaveRecord.periodNumber,
        date: leaveRecord.date,
        leaveReason: reason,
      });
      toast.success("Leave reason updated successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error updating leave reason:", err);
      toast.error(err.message || "Error updating leave reason");
    }
  };

  const handleClear = async () => {
    if (!leaveRecord?._id) return;
    try {
      await deleteLeaveRecord.mutateAsync({ data: { _id: leaveRecord._id } });
      toast.success("Leave reason cleared successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error clearing leave reason:", err);
      toast.error(err.message || "Error clearing leave reason");
    }
  };

  if (!leaveRecord) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={popupRef}
        data-html2canvas-popup="true"
        className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0"
      >
        <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
          <button
            type="button"
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
            onClick={handleDownload}
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
              {leaveRecord?.teacherName ? (
                <>
                  Leave reason for <span className="font-semibold">{leaveRecord.teacherName}</span> — Period {leaveRecord.periodNumber}
                </>
              ) : (
                "Provide a leave reason."
              )}
            </DialogDescription>
          </div>
          <DialogClose
            className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            data-html2canvas-ignore="true"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>
        <div className="p-5 space-y-4 bg-muted/5 flex-1 overflow-y-auto">
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
            <div className="relative">
              <Input
                autoFocus
                placeholder="Select or type a reason..."
                value={reason}
                onChange={(e) => {
                  if (e.target.value.length > 20) {
                    setError(true);
                  } else {
                    setError(false);
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
                              setError(false);
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
            </div>
            {error && (
              <p className="text-destructive text-xs p-1 mt-1">
                Leave reason should not exceed 20 characters.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {leaveRecord._id && (
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
              onClick={handleSubmit}
              className={leaveRecord._id ? "flex-1" : "w-full"}
            >
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Bulk Leave Reason Dialog (for College Admin — all columns & rows, column heading, or row heading click)
const BulkLeaveReasonDialog = ({ open, onOpenChange, mode, label, slots, apiKey, onSuccess, targetDateObj }) => {
  // mode: "all" (all columns and rows) | "period" (column) | "class" (row)
  // slots: array of { classId, classLabel, periodNumber, teacherId, teacherName, existingLeaveRecord }
  const [reason, setReason] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const downloadFilename = useMemo(() => {
    if (mode === "all") return "Bulk_Leave_Reason_All_Schedule.jpeg";
    if (mode === "period") return `Bulk_Leave_Reason_Period_${label}.jpeg`;
    return `Bulk_Leave_Reason_${String(label || "Class").replace(/\s+/g, "_")}.jpeg`;
  }, [mode, label]);

  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, downloadFilename);

  const { useAddItem, useDeleteItem } = useCrud("teachers-leave-record", apiKey);
  const addLeaveRecord = useAddItem();
  const deleteLeaveRecord = useDeleteItem();

  const eligibleSlots = useMemo(() => {
    return (slots || []).filter((s) => s.teacherId);
  }, [slots]);

  const existingRecordIds = useMemo(() => {
    return eligibleSlots
      .map((s) => s.existingLeaveRecord?._id)
      .filter(Boolean);
  }, [eligibleSlots]);

  useEffect(() => {
    if (open) {
      const firstReason = eligibleSlots.find((s) => s.existingLeaveRecord?.leaveReason)?.existingLeaveRecord?.leaveReason || "";
      setReason(firstReason);
      setError(false);
    }
  }, [open, eligibleSlots]);

  const title = useMemo(() => {
    if (mode === "all") return "Reason for All Columns & Rows";
    if (mode === "period") return `Reason for Period ${label}`;
    return `Reason for ${label}`;
  }, [mode, label]);

  const description = useMemo(() => {
    if (mode === "all") {
      return "This reason will be applied to all columns and rows that don't have attendance marked yet.";
    }
    if (mode === "period") {
      return `This reason will be applied to all classes in Period ${label} that don't have attendance marked yet.`;
    }
    return `This reason will be applied to all periods of ${label} that don't have attendance marked yet.`;
  }, [mode, label]);

  const submitButtonLabel = useMemo(() => {
    if (existingRecordIds.length > 0) return "Update All";
    if (mode === "all") return "Apply to All";
    if (mode === "period") return `Apply to Period ${label}`;
    return `Apply to ${label}`;
  }, [existingRecordIds.length, mode, label]);

  const handleSubmit = async () => {
    if (reason.trim() !== "" && reason.length > 20) {
      setError(true);
      toast.error("Leave reason should not exceed 20 characters.");
      return;
    }
    if (eligibleSlots.length === 0) {
      toast.info("No eligible slots found to update.");
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        eligibleSlots.map((slot) =>
          addLeaveRecord.mutateAsync({
            teacherId: slot.teacherId,
            classId: slot.classId,
            periodNumber: slot.periodNumber,
            date: targetDateObj ? targetDateObj.toISOString() : new Date().toISOString(),
            leaveReason: reason,
          })
        )
      );
      toast.success(`Leave reason saved for ${eligibleSlots.length} slot(s).`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error saving bulk leave reason:", err);
      toast.error(err.message || "Error saving leave reason");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (existingRecordIds.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        existingRecordIds.map((id) =>
          deleteLeaveRecord.mutateAsync({ data: { _id: id } })
        )
      );
      toast.success("Leave reason(s) cleared successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error clearing bulk leave reasons:", err);
      toast.error(err.message || "Error clearing leave reasons");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={popupRef}
        data-html2canvas-popup="true"
        className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0"
      >
        <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
          <button
            type="button"
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
            onClick={handleDownload}
            title="Download Image"
            data-html2canvas-ignore="true"
          >
            <FileText className="h-5 w-5 text-primary" />
          </button>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0">
              {title}
            </DialogTitle>
            <DialogDescription className="m-0 text-xs">
              {description}
            </DialogDescription>
          </div>
          <DialogClose
            className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            data-html2canvas-ignore="true"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>

        {eligibleSlots.length > 0 ? (
          <div className="p-5 space-y-4 bg-muted/5 flex-1 overflow-y-auto">
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
              <div className="relative">
                <Input
                  autoFocus
                  placeholder="Select or type a reason..."
                  value={reason}
                  onChange={(e) => {
                    if (e.target.value.length > 20) setError(true);
                    else setError(false);
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
                                setError(false);
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
              </div>
              {error && (
                <p className="text-destructive text-xs p-1 mt-1">
                  Leave reason should not exceed 20 characters.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {existingRecordIds.length > 0 && (
                <Button
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  disabled={deleteLeaveRecord.isPending || saving}
                  onClick={handleClear}
                >
                  Clear All
                </Button>
              )}
              <Button
                disabled={addLeaveRecord.isPending || saving || error}
                onClick={handleSubmit}
                className={existingRecordIds.length > 0 ? "flex-1" : "w-full"}
              >
                {saving ? "Saving..." : submitButtonLabel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-5 text-sm text-muted-foreground text-center py-8">
            No eligible slots found (attendance may already be marked).
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TimeTableComponent = ({

  apiKey,
  teacherId,
  hidePrintButton = false,
  periods = [],
  attendances = [],
  classes = [],
  teachersLeaveRecord = [],
  useShortName = false,
  hideEmptyClassRows = false,
  role,
  settings,
  date,
  leaveRecords = [],
}) => {
  const timeTableRef = useRef(null);
  
  const isCollegeAdmin = role === "College Admin" && !teacherId;
  const todayDateStr = useMemo(() => getISTDateString(date) || getISTDateString(), [date]);
  const targetDateObj = useMemo(() => {
    if (todayDateStr) {
      const [y, m, d] = todayDateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return getISTDate();
  }, [todayDateStr]);
  const currentDay = useMemo(() => daysOfWeek[targetDateObj.getDay()], [targetDateObj]);
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [currentDialogData, setCurrentDialogData] = useState({});
  const [currentAbsenteesList, setCurrentAbsenteesList] = useState([]);

  // Edit Leave Reason state (College Admin)
  const [editLeaveOpen, setEditLeaveOpen] = useState(false);
  const [editLeaveRecord, setEditLeaveRecord] = useState(null);

  // Bulk Leave Reason state (College Admin — all columns & rows, column/row heading click)
  const [bulkLeaveOpen, setBulkLeaveOpen] = useState(false);
  const [bulkLeaveMode, setBulkLeaveMode] = useState("period"); // "all" | "period" | "class"
  const [bulkLeaveLabel, setBulkLeaveLabel] = useState("");
  const [bulkLeaveSlots, setBulkLeaveSlots] = useState([]);

  const { useFetchItems: useFetchLeaveRecords } = useCrud("teachers-leave-record", apiKey);
  const liveLeaveQuery = useFetchLeaveRecords(
    0, 0,
    { date: todayDateStr },
    { staleTime: 0, refetchOnWindowFocus: true, enabled: isCollegeAdmin }
  );
  const liveLeaveRecords = useMemo(() => {
    if (isCollegeAdmin) {
      return liveLeaveQuery.data?.teachersLeaveRecord || teachersLeaveRecord;
    }
    return teachersLeaveRecord;
  }, [isCollegeAdmin, liveLeaveQuery.data, teachersLeaveRecord]);

  // Fast O(1) Map for teacher leave records on this day
  const leaveRecordsMap = useMemo(() => {
    const map = new Map();
    if (!liveLeaveRecords?.length) return map;
    for (const record of liveLeaveRecords) {
      const recordDateStr = getISTDateString(record.date);
      if (recordDateStr !== todayDateStr) continue;
      const tId = (record.teacherId?._id || record.teacherId)?.toString();
      const pNum = record.periodNumber;
      if (tId && pNum !== undefined) {
        map.set(`${tId}_${pNum}`, record);
      }
    }
    return map;
  }, [liveLeaveRecords, todayDateStr]);

  // Fast O(1) Map for attendance & absentees by day, period, class, and teacher
  const attendanceGridMap = useMemo(() => {
    const map = new Map();
    if (!attendances?.length) return map;
    for (const att of attendances) {
      const cId = (att.classId?._id || att.classId)?.toString();
      const pNum = att.periodNumber;
      const day = att.day;
      const subId = (att.subjectId?._id || att.subjectId)?.toString();
      const tId = (att.teacherId?._id || att.teacherId)?.toString();
      const abs = (att.attendanceData || []).filter((record) => record.present === false);

      const item = {
        isAttendanceMarked: true,
        absenteesList: abs,
        attendance: att,
      };

      if (day && pNum !== undefined) {
        // Specific key
        map.set(`${day}_${pNum}_${cId || ""}_${subId || ""}_${tId || ""}`, item);
        // Fallback key: day_period_class
        if (cId && !map.has(`${day}_${pNum}_${cId}`)) {
          map.set(`${day}_${pNum}_${cId}`, item);
        }
        // Fallback key: day_period_teacher (for teacher view)
        if (tId && !map.has(`${day}_${pNum}_t_${tId}`)) {
          map.set(`${day}_${pNum}_t_${tId}`, item);
        }
      }
    }
    return map;
  }, [attendances]);

  const { useFetchItems } = useCrud("timeTables", apiKey);
  const fetchTimeTableQuery = useFetchItems(0, 0, {
    day: teacherId ? null : currentDay,
    teacherId: teacherId ? teacherId : null,
  });

  const timeTable = useMemo(() => {
    return fetchTimeTableQuery.data?.timeTables || [];
  }, [fetchTimeTableQuery.data]);

  const router = useRouter();

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  const currentTodayIST = useMemo(() => getISTDateString(), []);
  const isPastDate = todayDateStr < currentTodayIST;
  const [snapshotData, setSnapshotData] = useState(null);

  useEffect(() => {
    if (!isPastDate) {
      setSnapshotData(null);
      return;
    }
    let isMounted = true;
    fetch(`/api/timetable-snapshot?date=${todayDateStr}&populate=true`)
      .then((r) => r.json())
      .then((res) => {
        if (isMounted) setSnapshotData(res?.snapshot || null);
      })
      .catch(() => {
        if (isMounted) setSnapshotData(null);
      });
    return () => {
      isMounted = false;
    };
  }, [isPastDate, todayDateStr]);

  const timeTableData = useMemo(() => {
    if (isPastDate && snapshotData && Array.isArray(snapshotData.slots) && snapshotData.slots.length > 0) {
      if (teacherId) {
        const slots = snapshotData.slots.filter(
          (s) => (s.teacherId?._id || s.teacherId)?.toString() === teacherId
        );
        return {
          timeSlots: slots.map((s) => ({
            ...s,
            classId: s.classId?._id || s.classId,
          })),
        };
      } else {
        return {
          timeSlots: snapshotData.slots.map((s) => ({
            ...s,
            classId: s.classId?._id || s.classId,
          })),
        };
      }
    }

    if (teacherId) {
      return timeTable.reduce(
        (acc, tt) => {
          const slots = (tt.timeSlots || []).filter((slot) => {
            const tid = (slot.teacherId?._id || slot.teacherId)?.toString();
            if (tid !== teacherId) return false;
            const validFromDS = slot.validFrom ? getISTDateString(slot.validFrom) : null;
            const validToDS = slot.validTo ? getISTDateString(slot.validTo) : null;
            const isStarted = !validFromDS || validFromDS <= todayDateStr;
            const isNotEnded = !validToDS || validToDS > todayDateStr;
            return isStarted && isNotEnded;
          });
          const classId = tt.classId;
          return {
            timeSlots: [
              ...(acc.timeSlots || []),
              ...slots.map((slot) => ({ ...slot, classId })),
            ],
          };
        },
        { timeSlots: [] }
      );
    } else {
      return timeTable.reduce(
        (acc, tt) => {
          const slots = (tt.timeSlots || []).filter((slot) => {
            if (slot.day !== currentDay) return false;
            const validFromDS = slot.validFrom ? getISTDateString(slot.validFrom) : null;
            const validToDS = slot.validTo ? getISTDateString(slot.validTo) : null;
            const isStarted = !validFromDS || validFromDS <= todayDateStr;
            const isNotEnded = !validToDS || validToDS > todayDateStr;
            return isStarted && isNotEnded;
          });
          const classId = tt.classId;
          return {
            timeSlots: [
              ...(acc.timeSlots || []),
              ...slots.map((slot) => ({ ...slot, classId })),
            ],
          };
        },
        { timeSlots: [] }
      );
    }
  }, [isPastDate, snapshotData, teacherId, timeTable, currentDay, todayDateStr]);

  const getCellData = useCallback(
    (periodNumber, day, classId = null) => {
      if (teacherId) {
        // For teacher view
        return timeTableData.timeSlots?.find(
          (slot) => slot.periodNumber === periodNumber && slot.day === day
        );
      } else {
        // For class view
        return timeTableData.timeSlots?.find(
          (slot) =>
            slot.periodNumber === periodNumber &&
            slot.day === day &&
            (classId ? (slot.classId?._id || slot.classId)?.toString() === classId?.toString() : true)
        );
      }
    },
    [timeTableData.timeSlots, teacherId, currentDay]
  );

  const getPeriodTime = useCallback(
    (periodNumber) => {
      const period = periods.find((p) => p.periodNumber === periodNumber);
      return period ? period.formattedTime : `Period ${periodNumber}`;
    },
    [periods]
  );

  const filteredClasses = useMemo(() => {
    // First apply section working-day filter
    const isSeniorOn = settings?.general?.seniorDaawa?.isWorkingDay !== false;
    const isJuniorOn = settings?.general?.juniorDaawa?.isWorkingDay !== false;

    const sectionFiltered = classes.filter((classItem) => {
      const section = classItem.section || "";
      if (section === "Senior Da-awa" && !isSeniorOn) return false;
      if (section === "Junior Da-awa" && !isJuniorOn) return false;
      return true;
    });

    if (!hideEmptyClassRows || teacherId) return sectionFiltered;

    return sectionFiltered.filter((classItem) => {
      return timeTableData.timeSlots?.some(
        (slot) =>
          (slot.classId?._id || slot.classId)?.toString() === classItem._id?.toString() &&
          (slot.subjectId || slot.teacherId)
      );
    });
  }, [classes, hideEmptyClassRows, teacherId, timeTableData.timeSlots, settings]);

  const showAbsenteesDialog = useCallback(
    (periodNumber, day, cellData, absenteesList) => {
      setCurrentDialogData({
        periodNumber,
        day,
        cellData,
      });
      setCurrentAbsenteesList(absenteesList);
      setAbsenteesDialogOpen(true);
    },
    []
  );

  const handleAllHeadingClick = isCollegeAdmin ? () => {
    // Collect all eligible slots across ALL classes and ALL periods
    const slots = [];
    filteredClasses.forEach((classItem) => {
      periods.forEach((period) => {
        const cellData = getCellData(period.periodNumber, currentDay, classItem._id);
        if (!cellData?.teacherId) return;
        const attended = attendances.some(
          (a) =>
            a.periodNumber === period.periodNumber &&
            a.day === currentDay &&
            (a.classId?._id || a.classId)?.toString() === classItem._id?.toString() &&
            (!cellData.subjectId || (a.subjectId?._id || a.subjectId) === (cellData.subjectId?._id || cellData.subjectId)) &&
            (!cellData.teacherId || (a.teacherId?._id || a.teacherId) === (cellData.teacherId?._id || cellData.teacherId))
        );
        if (attended) return;
        const existingLeaveRecord = liveLeaveRecords.find((record) => {
          const recordDate = new Date(record.date);
          const recordDay = recordDate.toLocaleDateString("en-US", { weekday: "long" });
          const recordDateStr = recordDate.toISOString().split("T")[0];
          return (
            record.periodNumber === period.periodNumber &&
            (record.teacherId?._id || record.teacherId) === (cellData?.teacherId?._id || cellData?.teacherId) &&
            recordDay === currentDay &&
            recordDateStr === todayDateStr
          );
        });
        slots.push({
          classId: classItem._id,
          classLabel: useShortName ? (classItem.shortname || classItem.name) : classItem.name,
          periodNumber: period.periodNumber,
          teacherId: cellData.teacherId?._id || cellData.teacherId,
          teacherName: cellData.teacherId?.name || "",
          existingLeaveRecord: existingLeaveRecord || null,
        });
      });
    });
    if (!slots.length) {
      toast.info("No eligible slots found or all attendance already marked.");
      return;
    }
    setBulkLeaveMode("all");
    setBulkLeaveLabel("All Columns & Rows");
    setBulkLeaveSlots(slots);
    setBulkLeaveOpen(true);
  } : undefined;

  const handlePrint = useReactToPrint({
    contentRef: timeTableRef,
    documentTitle: "Time Table",
  });

  return (
    <div>
      <div
        ref={timeTableRef}
        className="overflow-x-auto border border-collapse rounded-md  "
      >
        <PrintHeader
          apiKey={apiKey}
          title={teacherId ? "MY TIME TABLE" : "TIME TABLE"}
        />
        <TooltipProvider delayDuration={200}>
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead
                className={`border bg-accent sticky left-0 z-10 text-center align-middle${
                  isCollegeAdmin ? " cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors select-none" : ""
                }`}
                onClick={handleAllHeadingClick}
                title={isCollegeAdmin ? "Click to set leave reason for all columns and all rows" : undefined}
              >
                {isCollegeAdmin ? (
                  <div className="flex items-center justify-center gap-1.5 px-2 py-1">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">All</span>
                  </div>
                ) : null}
              </TableHead>
              {periods.map((period) => {
                // For College Admin: clicking the column heading opens bulk leave for that period
                const handleColumnHeadingClick = isCollegeAdmin ? () => {
                  // Collect all eligible slots for this period across all classes
                  const slots = filteredClasses.map(classItem => {
                    const cellData = getCellData(period.periodNumber, currentDay, classItem._id);
                    if (!cellData?.teacherId) return null;
                    const cId = classItem._id?.toString();
                    const subId = (cellData.subjectId?._id || cellData.subjectId)?.toString();
                    const tId = (cellData.teacherId?._id || cellData.teacherId)?.toString();
                    const attInfo = attendanceGridMap.get(`${currentDay}_${period.periodNumber}_${cId}_${subId || ""}_${tId || ""}`) ||
                                    attendanceGridMap.get(`${currentDay}_${period.periodNumber}_${cId}`);
                    if (attInfo) return null;
                    const existingLeaveRecord = tId ? leaveRecordsMap.get(`${tId}_${period.periodNumber}`) : null;
                    return {
                      classId: classItem._id,
                      classLabel: useShortName ? (classItem.shortname || classItem.name) : classItem.name,
                      periodNumber: period.periodNumber,
                      teacherId: cellData.teacherId?._id || cellData.teacherId,
                      teacherName: cellData.teacherId?.name || "",
                      existingLeaveRecord: existingLeaveRecord || null,
                    };
                  }).filter(Boolean);
                  if (!slots.length) {
                    toast.info(`No eligible slots found for Period ${period.periodNumber}.`);
                    return;
                  }
                  setBulkLeaveMode("period");
                  setBulkLeaveLabel(period.periodNumber);
                  setBulkLeaveSlots(slots);
                  setBulkLeaveOpen(true);
                } : undefined;

                return (
                  <TableHead
                    key={period?._id}
                    className={`text-center border-t font-bold whitespace-nowrap${isCollegeAdmin ? " cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors select-none" : ""}`}
                    onClick={handleColumnHeadingClick}
                    title={isCollegeAdmin ? `Click to set leave reason for all classes in Period ${period.periodNumber}` : undefined}
                  >
                    <div className="flex flex-col items-center text-xxs">
                      <span>{getPeriodTime(period.periodNumber)}</span>
                      <span className="text-xxs text-muted-foreground">
                        Period {period.periodNumber}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {teacherId
              ? DAYS.map((day) => (
                <TableRow key={day} className="hover:bg-accent/50">
                  <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                    <div className="flex text-xs items-center gap-2">
                      {day.slice(0, 3)}
                    </div>
                  </TableCell>
                  {periods.map((period) => {
                    const cellData = getCellData(period.periodNumber, day);
                    const subId = (cellData?.subjectId?._id || cellData?.subjectId)?.toString();
                    const tId = teacherId?.toString();

                    const attInfo = attendanceGridMap.get(`${day}_${period.periodNumber}_t_${tId}`) || null;
                    const isAttendanceMarked = !!attInfo;
                    const absenteesList = attInfo?.absenteesList || [];
                    const leaveRecord = tId ? leaveRecordsMap.get(`${tId}_${period.periodNumber}`) : null;

                    return (
                      <TableCell
                        onClick={() => {
                          if (isAttendanceMarked && cellData) {
                            showAbsenteesDialog(
                              period.periodNumber,
                              day,
                              cellData,
                              absenteesList
                            );
                          }
                        }}
                        key={period?._id}
                        className={`${(isAttendanceMarked && cellData)
                          ? "bg-green-300/50 print:bg-inherit"
                          : leaveRecord
                            ? "bg-red-100/50 print:bg-inherit"
                            : ""
                          } border text-center  cursor-pointer print:max-w-32`}
                      >
                        {cellData ? (
                          <div className="flex flex-col items-center justify-center">
                            <p className="font-medium text-xxs whitespace-nowrap print:whitespace-normal">
                              {cellData.subjectId?.name || (typeof cellData.subjectId === 'string' ? cellData.subjectId : "")}
                            </p>
                            <p className="text-xxs text-accent-foreground whitespace-nowrap print:whitespace-normal">
                              {useShortName 
                                 ? (cellData.classId?.shortname || cellData.classId?.name || (typeof cellData.classId === 'string' ? cellData.classId : "")) 
                                 : (cellData.classId?.name || (typeof cellData.classId === 'string' ? cellData.classId : ""))}
                            </p>

                            {/* Attendance badge */}
                            {isAttendanceMarked &&
                              absenteesList.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="mt-1 text-xxs no-print cursor-pointer hover:bg-destructive/10 hover:border-destructive transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showAbsenteesDialog(
                                          period.periodNumber,
                                          day,
                                          cellData,
                                          absenteesList
                                        );
                                      }}
                                    >
                                      <UserX className="h-3 w-3 mr-1" />
                                      {absenteesList.length}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View absent students</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            {leaveRecord && !isAttendanceMarked && (
                              <div className="flex items-center gap-1 text-xxs text-muted-foreground justify-center">
                                <AlertCircle className="text-red-500 h-3 w-3" />
                                <span>{leaveRecord.leaveReason}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold">-</span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
              : filteredClasses.map((classItem) => {
                // For College Admin: clicking the row heading opens bulk leave for that class
                const handleRowHeadingClick = isCollegeAdmin ? () => {
                  // Collect all eligible slots for this class across all periods
                  const slots = periods.map(period => {
                    const cellData = getCellData(period.periodNumber, currentDay, classItem._id);
                    if (!cellData?.teacherId) return null;
                    const cId = classItem._id?.toString();
                    const subId = (cellData.subjectId?._id || cellData.subjectId)?.toString();
                    const tId = (cellData.teacherId?._id || cellData.teacherId)?.toString();
                    const attInfo = attendanceGridMap.get(`${currentDay}_${period.periodNumber}_${cId}_${subId || ""}_${tId || ""}`) ||
                                    attendanceGridMap.get(`${currentDay}_${period.periodNumber}_${cId}`);
                    if (attInfo) return null;
                    const existingLeaveRecord = tId ? leaveRecordsMap.get(`${tId}_${period.periodNumber}`) : null;
                    return {
                      classId: classItem._id,
                      classLabel: useShortName ? (classItem.shortname || classItem.name) : classItem.name,
                      periodNumber: period.periodNumber,
                      teacherId: cellData.teacherId?._id || cellData.teacherId,
                      teacherName: cellData.teacherId?.name || "",
                      existingLeaveRecord: existingLeaveRecord || null,
                    };
                  }).filter(Boolean);
                  if (!slots.length) {
                    toast.info(`No eligible slots found for ${classItem.name}.`);
                    return;
                  }
                  setBulkLeaveMode("class");
                  setBulkLeaveLabel(useShortName ? (classItem.shortname || classItem.name) : classItem.name);
                  setBulkLeaveSlots(slots);
                  setBulkLeaveOpen(true);
                } : undefined;

                return (
                <TableRow key={classItem?._id} className="hover:bg-accent/50">
                  <TableCell
                    className={`border font-medium bg-accent sticky left-0 z-10 text-center align-middle${isCollegeAdmin ? " cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors select-none" : ""}`}
                    onClick={handleRowHeadingClick}
                    title={isCollegeAdmin ? `Click to set leave reason for all periods of ${classItem.name}` : undefined}
                  >
                    <div className="flex justify-center items-center font-bold text-xs whitespace-nowrap gap-2">
                      {useShortName ? (classItem.shortname || classItem.name) : classItem.name}
                    </div>
                  </TableCell>
                  {periods.map((period) => {
                    const cellData = getCellData(
                      period.periodNumber,
                      currentDay,
                      classItem?._id
                    );
                    const subId = (cellData?.subjectId?._id || cellData?.subjectId)?.toString();
                    const tId = (cellData?.teacherId?._id || cellData?.teacherId)?.toString();
                    const cId = classItem?._id?.toString();

                    const attInfo = attendanceGridMap.get(`${currentDay}_${period.periodNumber}_${cId}_${subId || ""}_${tId || ""}`) ||
                                    attendanceGridMap.get(`${currentDay}_${period.periodNumber}_${cId}`) ||
                                    null;

                    const isAttendanceMarked = !!attInfo;
                    const absenteesList = attInfo?.absenteesList || [];
                    const leaveRecord = tId ? leaveRecordsMap.get(`${tId}_${period.periodNumber}`) : null;
                    const canEditLeave = isCollegeAdmin && cellData && cellData.teacherId && !isAttendanceMarked;

                    return (
                      <TableCell
                        onClick={() => {
                          if (isAttendanceMarked && cellData) {
                            showAbsenteesDialog(
                              period.periodNumber,
                              currentDay,
                              cellData,
                              absenteesList
                            );
                          } else if (canEditLeave) {
                            if (leaveRecord) {
                              setEditLeaveRecord({
                                ...leaveRecord,
                                teacherName: cellData.teacherId?.name || "",
                                teacherId: leaveRecord.teacherId?._id || leaveRecord.teacherId,
                                classId: leaveRecord.classId?._id || leaveRecord.classId,
                              });
                            } else {
                              // New leave record — no _id yet
                              setEditLeaveRecord({
                                teacherName: cellData.teacherId?.name || "",
                                teacherId: cellData.teacherId?._id || cellData.teacherId,
                                classId: classItem?._id,
                                periodNumber: period.periodNumber,
                                date: todayDateStr,
                                leaveReason: "",
                              });
                            }
                            setEditLeaveOpen(true);
                          }
                        }}
                        key={period?._id}
                        className={`${(isAttendanceMarked && cellData)
                          ? "bg-green-300/50 print:bg-inherit"
                          : leaveRecord
                            ? "bg-red-100/50 print:bg-inherit"
                            : ""
                          } border text-center cursor-pointer print:max-w-32`}
                      >
                        {!!cellData ? (
                          <div className="flex flex-col items-center justify-center">
                             <p className="font-medium text-xxs whitespace-nowrap print:whitespace-normal">
                               {cellData.teacherId?.name || (typeof cellData.teacherId === 'string' ? cellData.teacherId : "")}
                             </p>
                             <p className="text-xxs text-accent-foreground whitespace-nowrap print:whitespace-normal">
                               {cellData.subjectId?.name || (typeof cellData.subjectId === 'string' ? cellData.subjectId : "")}
                             </p>

                            {/* Attendance badge */}
                            {isAttendanceMarked &&
                              absenteesList.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="mt-1 text-xxs no-print cursor-pointer hover:bg-destructive/10 hover:border-destructive transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showAbsenteesDialog(
                                          period.periodNumber,
                                          currentDay,
                                          cellData,
                                          absenteesList
                                        );
                                      }}
                                    >
                                      <UserX className="h-3 w-3 mr-1" />
                                      {absenteesList.length}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View absent students</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                            {leaveRecord && !isAttendanceMarked && (
                              <div className="flex items-center gap-1 text-xxs text-muted-foreground justify-center">
                                <AlertCircle className="text-red-500 h-3 w-3" />
                                <span>{leaveRecord.leaveReason}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold">-</span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                );
              })}
          </TableBody>
        </Table>
        </TooltipProvider>
      </div>

      {/* Absentees Dialog */}
      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        cellData={currentDialogData.cellData}
        day={currentDialogData.day}
        periodNumber={currentDialogData.periodNumber}
        absenteesList={currentAbsenteesList}
        useShortName={useShortName}
        apiKey={apiKey}
        date={targetDateObj}
        leaveRecords={leaveRecords}
      />

      {/* Edit Leave Reason Dialog (College Admin) */}
      <EditLeaveReasonDialog
        open={editLeaveOpen}
        onOpenChange={setEditLeaveOpen}
        leaveRecord={editLeaveRecord}
        apiKey={apiKey}
        onSuccess={() => {
          liveLeaveQuery.refetch();
          router.refresh();
        }}
      />

      {/* Bulk Leave Reason Dialog (College Admin — all columns & rows, column/row heading) */}
      <BulkLeaveReasonDialog
        open={bulkLeaveOpen}
        onOpenChange={setBulkLeaveOpen}
        mode={bulkLeaveMode}
        label={bulkLeaveLabel}
        slots={bulkLeaveSlots}
        apiKey={apiKey}
        onSuccess={() => {
          liveLeaveQuery.refetch();
          router.refresh();
        }}
        targetDateObj={targetDateObj}
      />

      {!hidePrintButton && (
        <div className="flex justify-end mt-4 no-print">
          <Button variant="default" onClick={handlePrint}>
            Print
          </Button>
        </div>
      )}
    </div>
  );
};

export default TimeTableComponent;
