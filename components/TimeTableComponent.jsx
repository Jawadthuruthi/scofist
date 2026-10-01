"use client";
import { Button } from "@/components/ui/button";
import useCrud from "@/hooks/use-crud";
import { useReactToPrint } from "react-to-print";
import { DAYS, formatDateForDisplay } from "@/lib/utils";
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
  absenteesList,
  useShortName = false,
  apiKey,
  date,
}) => {
  const { useFetchItems: useFetchLeaveRecords } = useCrud("leave-records", apiKey);
  const classId = cellData?.classId?._id || cellData?.classId;
  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `Absentees_${day}_Period_${periodNumber}.jpeg`);
  
  const studentIds = useMemo(() => {
    return absenteesList
      .map((s) => s.studentId?._id || s.studentId)
      .filter(Boolean)
      .join(",");
  }, [absenteesList]);

  const leaveRecordsQuery = useFetchLeaveRecords(
    0,
    0,
    { studentIds },
    { enabled: !!studentIds && open, refetchOnWindowFocus: false }
  );

  const leaveRecords = leaveRecordsQuery.data?.["leave-records"] || [];

  const getLeaveReason = (studentObj) => {
    // 1. Check if the reason is saved directly on the attendance record
    if (studentObj.leaveReason) return studentObj.leaveReason;

    // 2. Fallback to leave-records
    if (!leaveRecords.length) return null;
    
    // studentId might be a populated object or a string
    const sId = studentObj.studentId?._id || studentObj.studentId;
    
    const studentLeaves = leaveRecords.filter(
      (record) => String(record.studentId?._id || record.studentId) === String(sId)
    );
    
    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);
    
    for (const record of studentLeaves) {
       if (!record.dateOfLeave) continue;
       const leaveDate = new Date(record.dateOfLeave);
       leaveDate.setHours(0, 0, 0, 0);
       
       // If student has arrived back, use arrivedDate as end; otherwise use dateOfArrival if present
       const hasArrived = !!record.arrivedDate;
       let endDate = hasArrived ? new Date(record.arrivedDate) : (record.dateOfArrival ? new Date(record.dateOfArrival) : null);
       if (endDate) {
           endDate.setHours(23, 59, 59, 999);
       } else {
           endDate = new Date(leaveDate);
           endDate.setHours(23, 59, 59, 999);
       }
       
       if (targetDate >= leaveDate && targetDate <= endDate) {
          return record.leaveReason;
       }
       // Overdue: leave started on or before targetDate, student hasn't arrived back yet
       if (!hasArrived && targetDate > endDate && targetDate >= leaveDate) {
          return record.leaveReason;
       }
    }
    return null;
  };

  const d = new Date(date || new Date());
  const formattedDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}, ${day}`;

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

// Edit Leave Reason Dialog (for College Admin)
const EditLeaveReasonDialog = ({ open, onOpenChange, leaveRecord, apiKey, onSuccess }) => {
  const [reason, setReason] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [error, setError] = useState(false);

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
      <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>{leaveRecord._id ? "Edit Leave Reason" : "Add Leave Reason"}</DialogTitle>
          <DialogDescription>
            {leaveRecord._id ? "Edit" : "Add"} the leave reason for <span className="font-semibold">{leaveRecord.teacherName || "this teacher"}</span> — Period {leaveRecord.periodNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
          <div className="relative">
            <Input
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
            <p className="text-destructive text-xs p-1">
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
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Bulk Leave Reason Dialog (for College Admin — column heading or row heading click)
const BulkLeaveReasonDialog = ({ open, onOpenChange, mode, label, slots, apiKey, onSuccess, targetDateObj }) => {
  // mode: "period" (column) or "class" (row)
  // slots: array of { classId, classLabel, periodNumber, teacherId, teacherName, existingLeaveRecord }
  const [reason, setReason] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const { useAddItem } = useCrud("teachers-leave-record", apiKey);
  const addLeaveRecord = useAddItem();

  useEffect(() => {
    if (open) {
      setReason("");
      setError(false);
    }
  }, [open]);

  const eligibleSlots = useMemo(() => {
    return (slots || []).filter(s => s.teacherId);
  }, [slots]);

  const handleSubmit = async () => {
    if (reason.trim() !== "" && reason.length > 20) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        eligibleSlots.map(slot =>
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>{eligibleSlots.some(s => s.existingLeaveRecord) ? "Edit Leave Reason" : "Add Leave Reason"}</DialogTitle>
          <DialogDescription>
            {eligibleSlots.some(s => s.existingLeaveRecord) ? "Edit" : "Add"} the leave reason for {mode === "period" ? `all classes in Period ${label}` : `all periods of ${label}`}
          </DialogDescription>
        </DialogHeader>

        {eligibleSlots.length > 0 ? (
          <>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
              <div className="relative">
                <Input
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
                <p className="text-destructive text-xs p-1">
                  Leave reason should not exceed 20 characters.
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                disabled={saving || error}
                onClick={handleSubmit}
                className="w-full"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
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
}) => {
  const timeTableRef = useRef(null);
  
  const targetDateObj = useMemo(() => date ? new Date(date) : new Date(), [date]);
  const currentDay = useMemo(() => daysOfWeek[targetDateObj.getDay()], [targetDateObj]);
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [currentDialogData, setCurrentDialogData] = useState({});
  const [currentAbsenteesList, setCurrentAbsenteesList] = useState([]);

  // Edit Leave Reason state (College Admin)
  const [editLeaveOpen, setEditLeaveOpen] = useState(false);
  const [editLeaveRecord, setEditLeaveRecord] = useState(null);

  // Bulk Leave Reason state (College Admin — column/row heading click)
  const [bulkLeaveOpen, setBulkLeaveOpen] = useState(false);
  const [bulkLeaveMode, setBulkLeaveMode] = useState("period"); // "period" | "class"
  const [bulkLeaveLabel, setBulkLeaveLabel] = useState("");
  const [bulkLeaveSlots, setBulkLeaveSlots] = useState([]);


  const { useFetchItems: useFetchLeaveRecords } = useCrud("teachers-leave-record", apiKey);
  const todayDateStr = useMemo(() => (date ? new Date(date) : new Date()).toISOString().split("T")[0], [date]);
  const liveLeaveQuery = useFetchLeaveRecords(
    0, 0,
    { date: todayDateStr },
    { staleTime: 0, refetchOnWindowFocus: true, enabled: role === "College Admin" }
  );
  const liveLeaveRecords = useMemo(() => {
    if (role === "College Admin") {
      return liveLeaveQuery.data?.teachersLeaveRecord || teachersLeaveRecord;
    }
    return teachersLeaveRecord;
  }, [role, liveLeaveQuery.data, teachersLeaveRecord]);

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

  const timeTableData = teacherId
    ? timeTable.reduce(
      (acc, timeTable) => {
        const slots = timeTable.timeSlots.filter(
          (slot) => slot.teacherId?._id === teacherId && !slot.validTo
        );
        const classId = timeTable.classId;
        return {
          timeSlots: [
            ...(acc.timeSlots || []),
            ...slots.map((slot) => ({ ...slot, classId })),
          ],
        };
      },
      { timeSlots: [] }
    )
    : timeTable.reduce(
      (acc, timeTable) => {
        // Only get slots for the current day
        const slots = timeTable.timeSlots.filter(
          (slot) => slot.day === currentDay && !slot.validTo
        );

        // Make sure we're associating the correct classId with each slot
        const classId = timeTable.classId;
        return {
          timeSlots: [
            ...(acc.timeSlots || []),
            ...slots.map((slot) => ({ ...slot, classId })),
          ],
        };
      },
      { timeSlots: [] }
    );

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
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="border bg-accent sticky left-0 rig z-10"></TableHead>
              {periods.map((period) => {
                // For College Admin: clicking the column heading opens bulk leave for that period
                const isColAdmin = role === "College Admin" && !teacherId;
                const handleColumnHeadingClick = isColAdmin ? () => {
                  // Collect all eligible slots for this period across all classes
                  const slots = filteredClasses.map(classItem => {
                    const cellData = getCellData(period.periodNumber, currentDay, classItem._id);
                    if (!cellData?.teacherId) return null;
                    // Check if attendance is already marked — skip those
                    const attended = attendances.some(
                      a =>
                        a.periodNumber === period.periodNumber &&
                        a.day === currentDay &&
                        (a.classId?._id || a.classId)?.toString() === classItem._id?.toString() &&
                        (!cellData.subjectId || (a.subjectId?._id || a.subjectId) === (cellData.subjectId?._id || cellData.subjectId)) &&
                        (!cellData.teacherId || (a.teacherId?._id || a.teacherId) === (cellData.teacherId?._id || cellData.teacherId))
                    );
                    if (attended) return null;
                    const existingLeaveRecord = liveLeaveRecords.find(record => {
                      const recordDate = new Date(record.date);
                      const recordDay = recordDate.toLocaleDateString("en-US", { weekday: "long" });
                      const recordDateStr = recordDate.toISOString().split('T')[0];
                      const todayStr = new Date().toISOString().split('T')[0];
                      return (
                        record.periodNumber === period.periodNumber &&
                        (record.teacherId?._id || record.teacherId) === (cellData?.teacherId?._id || cellData?.teacherId) &&
                        recordDay === currentDay &&
                        recordDateStr === todayStr
                      );
                    });
                    return {
                      classId: classItem._id,
                      classLabel: useShortName ? (classItem.shortname || classItem.name) : classItem.name,
                      periodNumber: period.periodNumber,
                      teacherId: cellData.teacherId?._id || cellData.teacherId,
                      teacherName: cellData.teacherId?.name || "",
                      existingLeaveRecord: existingLeaveRecord || null,
                    };
                  }).filter(Boolean);
                  if (!slots.length) return;
                  setBulkLeaveMode("period");
                  setBulkLeaveLabel(period.periodNumber);
                  setBulkLeaveSlots(slots);
                  setBulkLeaveOpen(true);
                } : undefined;

                return (
                  <TableHead
                    key={period?._id}
                    className={`text-center border-t font-bold whitespace-nowrap${isColAdmin ? " cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors select-none" : ""}`}
                    onClick={handleColumnHeadingClick}
                    title={isColAdmin ? `Click to set leave reason for all classes in Period ${period.periodNumber}` : undefined}
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

                    // Check for marked attendance
                    const markedAttendance = attendances.filter(
                      (attendance) =>
                        attendance.periodNumber === period.periodNumber &&
                        attendance.day === day &&
                        attendance.teacherId?._id === teacherId &&
                        (!cellData?.subjectId || (attendance.subjectId?._id || attendance.subjectId) === (cellData.subjectId?._id || cellData.subjectId))
                    );

                    // Prepare absentees list
                    const absentees = markedAttendance?.map((attendance) => ({
                      absentees: attendance?.attendanceData?.filter(
                        (record) => record.present === false
                      ),
                    }));

                    const absenteesList =
                      absentees?.flatMap((item) => item.absentees || []) ||
                      [];
                    const isAttendanceMarked = false;
                    const leaveRecord = null;

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
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="mt-1 text-xxs no-print"
                                      >
                                        <UserX className="h-3 w-3 mr-1" />
                                        {absenteesList.length}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View absent students</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                const isRowAdmin = role === "College Admin" && !teacherId;
                const handleRowHeadingClick = isRowAdmin ? () => {
                  // Collect all eligible slots for this class across all periods
                  const slots = periods.map(period => {
                    const cellData = getCellData(period.periodNumber, currentDay, classItem._id);
                    if (!cellData?.teacherId) return null;
                    // Check if attendance is already marked
                    const attended = attendances.some(
                      a =>
                        a.periodNumber === period.periodNumber &&
                        a.day === currentDay &&
                        (a.classId?._id || a.classId)?.toString() === classItem._id?.toString() &&
                        (!cellData.subjectId || (a.subjectId?._id || a.subjectId) === (cellData.subjectId?._id || cellData.subjectId)) &&
                        (!cellData.teacherId || (a.teacherId?._id || a.teacherId) === (cellData.teacherId?._id || cellData.teacherId))
                    );
                    if (attended) return null; // already marked — skip
                    const existingLeaveRecord = liveLeaveRecords.find(record => {
                      const recordDate = new Date(record.date);
                      const recordDay = recordDate.toLocaleDateString("en-US", { weekday: "long" });
                      const recordDateStr = recordDate.toISOString().split('T')[0];
                      const todayStr = new Date().toISOString().split('T')[0];
                      return (
                        record.periodNumber === period.periodNumber &&
                        (record.teacherId?._id || record.teacherId) === (cellData?.teacherId?._id || cellData?.teacherId) &&
                        recordDay === currentDay &&
                        recordDateStr === todayStr
                      );
                    });
                    return {
                      classId: classItem._id,
                      classLabel: useShortName ? (classItem.shortname || classItem.name) : classItem.name,
                      periodNumber: period.periodNumber,
                      teacherId: cellData.teacherId?._id || cellData.teacherId,
                      teacherName: cellData.teacherId?.name || "",
                      existingLeaveRecord: existingLeaveRecord || null,
                    };
                  }).filter(Boolean);
                  if (!slots.length) return;
                  setBulkLeaveMode("class");
                  setBulkLeaveLabel(useShortName ? (classItem.shortname || classItem.name) : classItem.name);
                  setBulkLeaveSlots(slots);
                  setBulkLeaveOpen(true);
                } : undefined;

                return (
                <TableRow key={classItem?._id} className="hover:bg-accent/50">
                  <TableCell
                    className={`border font-medium bg-accent sticky left-0 z-10 text-center align-middle${isRowAdmin ? " cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors select-none" : ""}`}
                    onClick={handleRowHeadingClick}
                    title={isRowAdmin ? `Click to set leave reason for all periods of ${classItem.name}` : undefined}
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
                    const markedAttendance = attendances.filter(
                      (attendance) =>
                        attendance.periodNumber === period.periodNumber &&
                        attendance.day === currentDay &&
                        (attendance.classId?._id || attendance.classId)?.toString() === classItem?._id?.toString() &&
                        (!cellData?.subjectId || (attendance.subjectId?._id || attendance.subjectId) === (cellData.subjectId?._id || cellData.subjectId)) &&
                        (!cellData?.teacherId || (attendance.teacherId?._id || attendance.teacherId) === (cellData.teacherId?._id || cellData.teacherId))
                    );
                    const absentees = markedAttendance.map((attendance) => ({
                      absentees: attendance?.attendanceData?.filter(
                        (record) => record.present === false
                      ),
                    }));
                    const absenteesList =
                      absentees?.flatMap((item) => item.absentees || []) ||
                      [];
                    const isAttendanceMarked = markedAttendance?.length > 0;

                    const leaveRecord = liveLeaveRecords.find((record) => {
                      const recordDate = new Date(record.date);
                      const recordDay = recordDate.toLocaleDateString(
                        "en-US",
                        { weekday: "long" }
                      );
                      const recordDateStr = recordDate.toISOString().split('T')[0];
                      const todayStr = new Date().toISOString().split('T')[0];
                      
                      return (
                        record.periodNumber === period.periodNumber &&
                        (record.teacherId?._id || record.teacherId) === (cellData?.teacherId?._id || cellData?.teacherId) &&
                        recordDay === currentDay &&
                        recordDateStr === todayStr
                      );
                    });

                    const canEditLeave = role === "College Admin" && cellData && cellData.teacherId && !isAttendanceMarked;

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
                                date: new Date().toISOString(),
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
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="mt-1 text-xxs no-print"
                                      >
                                        <UserX className="h-3 w-3 mr-1" />
                                        {absenteesList.length}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View absent students</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
      />

      {/* Edit Leave Reason Dialog (College Admin) */}
      <EditLeaveReasonDialog
        open={editLeaveOpen}
        onOpenChange={setEditLeaveOpen}
        leaveRecord={editLeaveRecord}
        apiKey={apiKey}
        onSuccess={() => liveLeaveQuery.refetch()}
      />

      {/* Bulk Leave Reason Dialog (College Admin — column/row heading) */}
      <BulkLeaveReasonDialog
        open={bulkLeaveOpen}
        onOpenChange={setBulkLeaveOpen}
        mode={bulkLeaveMode}
        label={bulkLeaveLabel}
        slots={bulkLeaveSlots}
        apiKey={apiKey}
        onSuccess={() => liveLeaveQuery.refetch()}
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
