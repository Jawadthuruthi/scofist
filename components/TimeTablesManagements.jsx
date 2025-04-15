"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserX,
  Save,
} from "lucide-react";

// UI Components
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Hooks and Utils
import { DAYS } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import usePrint from "@/hooks/use-print";
import { Input } from "./ui/input";
import ConfirmationPopup from "./ConfirmationPopup";

// Absentees Dialog Component - Extracted to improve readability
const AbsenteesDialog = ({
  open,
  setOpen,
  cellData,
  day,
  periodNumber,
  absenteesList,
}) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {day} - Period {periodNumber} Absentees
          </DialogTitle>
          <DialogDescription>
            {cellData?.subjectId?.name
              ? `Subject: ${cellData.subjectId.name}`
              : ""}
            {cellData?.teacherId?.name
              ? ` • Teacher: ${cellData.teacherId.name}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {absenteesList.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              Absent Students ({absenteesList.length})
            </h4>
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absenteesList.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.studentId || "Unknown"}</TableCell>
                      <TableCell>{student.studentName || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-6">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
            <p>Full attendance for this period</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Component for rendering a single timetable cell
const TimetableSlot = ({
  periodNumber,
  day,
  cellData,
  category,
  selectedClass,
  onCellClick,
  isAttendanceMarked,
  absentees,
  showAbsenteesDialog,
  isPendingChange,
}) => {
  const hasData = cellData && (cellData.subjectId || cellData.teacherId);
  const absenteesList = useMemo(
    () => absentees?.flatMap((item) => item.absentees || []) || [],
    [absentees]
  );

  return (
    <TableCell
      className={`${
        isAttendanceMarked ? "bg-green-300/50 print:bg-inherit" : ""
      } ${
        isPendingChange ? "bg-blue-300/50 print:bg-inherit" : ""
      } border text-center cursor-pointer transition-colors max-w-32`}
      onClick={() => {
        onCellClick(periodNumber, day);
        if (isAttendanceMarked && category !== "class") {
          showAbsenteesDialog(periodNumber, day, cellData, absenteesList);
        }
      }}
    >
      {hasData ? (
        <div className="flex flex-col items-center justify-center">
          <p className="font-medium text-xs">
            {cellData.subjectId?.name || ""}
          </p>
          <p className="text-xxs text-accent-foreground">
            {category === "class" && selectedClass
              ? cellData.teacherId?.name || ""
              : cellData.classId?.name || ""}
          </p>
          {isAttendanceMarked && absenteesList.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="mt-1 text-xxs print:hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      showAbsenteesDialog(
                        periodNumber,
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
            </TooltipProvider>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center p-2 ">
          {category === "class" && (
            <Edit className="text-muted-foreground h-4 w-4 print:hidden" />
          )}
        </div>
      )}
    </TableCell>
  );
};

// Main TimeTablesManagement component
const TimeTablesManagements = ({
  periods = [],
  classes = [],
  teachers = [],
  subjects = [],
  token,
}) => {
  // State management
  const [category, setCategory] = useState("class");
  const [timeTableData, setTimeTableData] = useState({ timeSlots: [] });
  const [selectedClass, setSelectedClass] = useState(classes[0]?._id || "");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [date, setDate] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [currentAbsenteesList, setCurrentAbsenteesList] = useState([]);
  const [currentDialogData, setCurrentDialogData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherScheduleConflicts, setTeacherScheduleConflicts] = useState([]);
  const [existingTimeSlotId, setExistingTimeSlotId] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const day = useMemo(
    () =>
      date
        ? new Date(date).toLocaleDateString("en-US", { weekday: "long" })
        : "",
    [date]
  );

  // References and hooks
  const router = useRouter();
  const timeTableRef = useRef();
  const { useFetchItems, useUpdateItem, useDeleteItem } = useCrud(
    "timeTables",
    token
  );
  const { useFetchItems: useFetchAttendance } = useCrud("attendances", token);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();

  const fetchAttendanceQuery = useFetchAttendance(0, 0, {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    classId: category === "class" && selectedClass ? selectedClass : undefined,
    teacherId:
      category === "teacher" && selectedTeacher ? selectedTeacher : undefined,
    date: category === "date" && date ? date : undefined,
  });

  const attendanceData = fetchAttendanceQuery.data?.attendances || [];

  // Set up print functionality
  const handlePrint = usePrint({
    content: () => timeTableRef.current,
    documentTitle: `Time Table`,
  });

  // Queries for data fetching
  const fetchQuery = useMemo(() => {
    return {
      classId:
        category === "class" && selectedClass ? selectedClass : undefined,
      teacherId:
        category === "teacher" && selectedTeacher ? selectedTeacher : undefined,
      day: category === "date" && date ? day : undefined,
    };
  }, [category, selectedClass, selectedTeacher, date, day]);

  const fetchItemsQuery = useFetchItems(0, 0, fetchQuery);
  const allTimeTablesQuery = useFetchItems(0, 0, {});
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  // Handler for showing absentees dialog
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

  // Periodically refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  // Filter subjects based on selected class
  const filteredSubjects = useMemo(() => {
    const selectedClassData = classes.find((cls) => cls?._id === selectedClass);
    return subjects.filter((subject) =>
      selectedClassData?.subjectIds?.includes(subject?._id)
    );
  }, [classes, selectedClass, subjects]);

  // Check for teacher scheduling conflicts
  const checkTeacherConflicts = useCallback(
    (teacherId, periodNumber, day, existingSlotId = null) => {
      if (!allTimeTablesQuery.data?.timeTables || !teacherId) return [];

      const conflicts = [];

      allTimeTablesQuery.data.timeTables.forEach((timeTable) => {
        if (!timeTable.timeSlots) return;

        timeTable.timeSlots.forEach((slot) => {
          // Skip comparing with itself when editing
          if (existingSlotId && slot?._id === existingSlotId) return;

          if (
            slot?.teacherId?._id === teacherId &&
            slot.periodNumber === periodNumber &&
            slot.day === day
          ) {
            // Get class name for better context
            const conflictClass = classes.find(
              (cls) => cls?._id === timeTable.classId?._id
            );

            conflicts.push({
              class: conflictClass?.name || "Unknown Class",
              subject: slot.subjectId?.name,
              teacherName: slot.teacherId?.name,
              day: slot.day,
              period: slot.periodNumber,
            });
          }
        });
      });

      return conflicts;
    },
    [allTimeTablesQuery.data, classes]
  );

  const checkPendingConflicts = (
    teacherId,
    periodNumber,
    day,
    currentChangeId = null
  ) => {
    // Skip if no teacher selected
    if (!teacherId) return [];

    const conflicts = [];

    // Check against other pending changes
    pendingChanges.forEach((change) => {
      // Skip comparing with the current change when editing
      if (
        currentChangeId &&
        change.timeSlots.periodNumber === parseInt(periodNumber) &&
        change.timeSlots.day === day &&
        change.classId === selectedClass
      ) {
        return;
      }

      if (
        change.timeSlots.teacherId === teacherId &&
        change.timeSlots.periodNumber === parseInt(periodNumber) &&
        change.timeSlots.day === day
      ) {
        // Get class name for the conflict
        const conflictClass = classes.find(
          (cls) => cls?._id === change.classId
        );

        conflicts.push({
          class: conflictClass?.name || "Unknown Class",
          subject:
            subjects.find((s) => s._id === change.timeSlots.subjectId)?.name ||
            "Unknown Subject",
          teacherName:
            teachers.find((t) => t._id === teacherId)?.name ||
            "Unknown Teacher",
          day: day,
          period: periodNumber,
          isPending: true,
        });
      }
    });

    return conflicts;
  };

  // Process timetable data when query results change
  useEffect(() => {
    if (!fetchItemsQuery.data) return;

    const newData = fetchItemsQuery.data.timeTables || [];

    if (category === "teacher" && selectedTeacher) {
      // Aggregate all slots for this teacher across classes
      const timeSlotsByTeacher = newData.reduce(
        (acc, timeTable) => {
          const slots = timeTable.timeSlots.filter(
            (slot) => slot.teacherId?._id === selectedTeacher
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
      );

      setTimeTableData(timeSlotsByTeacher);
    } else if (category === "date" && date) {
      const timeSlotsByDate = newData.reduce(
        (acc, timeTable) => {
          const slots = timeTable.timeSlots.filter((slot) => slot.day === day);
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
      setTimeTableData(timeSlotsByDate || { timeSlots: [] });
    } else {
      // For class view, just use the first timetable
      setTimeTableData(newData[0] || { timeSlots: [] });
    }
  }, [fetchItemsQuery.data, category, selectedTeacher, day]);

  // Check for conflicts when form values change
  useEffect(() => {
    if (selectedTeacher && selectedPeriod && selectedDay) {
      // Get existing conflicts from database
      const existingConflicts = checkTeacherConflicts(
        selectedTeacher,
        parseInt(selectedPeriod),
        selectedDay,
        existingTimeSlotId
      );

      // Get conflicts from pending changes
      const pendingConflicts = checkPendingConflicts(
        selectedTeacher,
        selectedPeriod,
        selectedDay,
        existingTimeSlotId
          ? `${selectedDay}-${selectedPeriod}-${selectedClass}`
          : null
      );

      // Show all conflicts
      setTeacherScheduleConflicts([...existingConflicts, ...pendingConflicts]);
    } else {
      setTeacherScheduleConflicts([]);
    }
  }, [
    selectedTeacher,
    selectedPeriod,
    selectedDay,
    existingTimeSlotId,
    checkTeacherConflicts,
    pendingChanges, // Add this dependency
  ]);

  // Helper to format period time
  const getPeriodTime = useCallback(
    (periodNumber) => {
      const period = periods.find((p) => p.periodNumber === periodNumber);
      return period ? period.formattedTime : `Period ${periodNumber}`;
    },
    [periods]
  );

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (!timeTableData.timeSlots) return { total: 0, filled: 0, percentage: 0 };

    const totalSlots = periods.length * DAYS.length;
    const filledSlots = timeTableData?.timeSlots?.filter(
      (slot) => slot.teacherId !== null || slot.subjectId !== null
    ).length;

    return {
      total: totalSlots,
      filled: filledSlots,
      percentage: Math.round((filledSlots / totalSlots) * 100),
    };
  }, [timeTableData.timeSlots, periods.length]);

  // Get cell data for specific period and day
  const getCellData = useCallback(
    (periodNumber, day, classId) => {
      // First check pending changes for the specific class
      const targetClassId = classId || selectedClass;
      const pendingChange = pendingChanges.find(
        (change) =>
          change.timeSlots.periodNumber === periodNumber &&
          change.timeSlots.day === day &&
          change.classId === targetClassId // Only show pending changes for this class
      );

      if (pendingChange) {
        // Convert pending change to cell data format
        return {
          periodNumber,
          day,
          subjectId: {
            _id: pendingChange.timeSlots.subjectId,
            name:
              subjects.find((s) => s._id === pendingChange.timeSlots.subjectId)
                ?.name || "",
          },
          teacherId: {
            _id: pendingChange.timeSlots.teacherId,
            name:
              teachers.find((t) => t._id === pendingChange.timeSlots.teacherId)
                ?.name || "",
          },
          classId: {
            _id: pendingChange.classId,
            name:
              classes.find((c) => c._id === pendingChange.classId)?.name || "",
          },
          _isPending: true,
        };
      }

      // If no pending change, check existing data
      return timeTableData.timeSlots?.find(
        (slot) =>
          slot.periodNumber === periodNumber &&
          slot.day === day &&
          (!classId || slot.classId?._id === classId)
      );
    },
    [
      timeTableData.timeSlots,
      pendingChanges,
      subjects,
      teachers,
      classes,
      selectedClass,
    ]
  );

  // Check if a cell has pending changes
  const isPendingChange = useCallback(
    (periodNumber, day, classId) => {
      const targetClassId = classId || selectedClass;
      return pendingChanges.some(
        (change) =>
          change.timeSlots.periodNumber === periodNumber &&
          change.timeSlots.day === day &&
          change.classId === targetClassId
      );
    },
    [pendingChanges, selectedClass]
  );

  // Handle cell click to open edit dialog
  const handleCellClick = useCallback(
    (periodNumber, day) => {
      if (category !== "class" || !periodNumber || !day) return;

      const existingData = getCellData(periodNumber, day);

      setSelectedPeriod(periodNumber.toString());
      setSelectedDay(day);
      setSelectedSubject(existingData?.subjectId?._id || "");
      setSelectedTeacher(existingData?.teacherId?._id || "");
      setExistingTimeSlotId(existingData?._id || null);
      setEditDialogOpen(true);
    },
    [category, getCellData]
  );

  // Handle adding changes to pending queue
  const handleAddToPendingChanges = (e) => {
    e.preventDefault();

    if (selectedClass) {
      const existingConflicts = checkTeacherConflicts(
        selectedTeacher,
        parseInt(selectedPeriod),
        selectedDay,
        existingTimeSlotId
      );

      // Get conflicts from pending changes
      const pendingConflicts = checkPendingConflicts(
        selectedTeacher,
        selectedPeriod,
        selectedDay,
        existingTimeSlotId
          ? `${selectedDay}-${selectedPeriod}-${selectedClass}`
          : null
      );

      // Combine all conflicts
      const allConflicts = [...existingConflicts, ...pendingConflicts];

      // If conflicts exist, show error and don't proceed
      if (allConflicts.length > 0) {
        toast.error(
          "Teacher scheduling conflict detected. Cannot add to pending changes."
        );

        // Update conflict state to display in UI
        setTeacherScheduleConflicts(allConflicts);
        return;
      }
    }

    const newChange = {
      classId: selectedClass,
      timeSlots: {
        day: selectedDay,
        periodNumber: parseInt(selectedPeriod),
        subjectId: selectedSubject,
        teacherId: selectedTeacher,
      },
    };

    // If we're editing an existing slot, include its ID
    if (existingTimeSlotId) {
      newChange.timeSlots._id = existingTimeSlotId;
    }

    // Add timetable _id if it exists
    if (timeTableData?._id) {
      newChange._id = timeTableData?._id;
    }

    // Check if we're updating an existing pending change
    const existingIndex = pendingChanges.findIndex(
      (change) =>
        change.timeSlots.periodNumber === parseInt(selectedPeriod) &&
        change.timeSlots.day === selectedDay &&
        change.classId === selectedClass
    );

    if (existingIndex !== -1) {
      // Update existing pending change
      const updatedChanges = [...pendingChanges];
      updatedChanges[existingIndex] = newChange;
      setPendingChanges(updatedChanges);
    } else {
      // Add new pending change
      setPendingChanges([...pendingChanges, newChange]);
    }

    setHasPendingChanges(true);
    setEditDialogOpen(false);
    toast.success("Changes added to changes. Save all to apply changes.");

    // Reset form
    setSelectedSubject("");
    setSelectedTeacher("");
    setExistingTimeSlotId(null);
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    if (pendingChanges.length === 0) {
      toast.info("No changes to save");
      return;
    }
    try {
      e.preventDefault();
      setIsSubmitting(true);

      await updateItem.mutateAsync({
        data: pendingChanges,
      });

      setPendingChanges([]);
      setHasPendingChanges(false);
      setEditDialogOpen(false);
      toast.success("Time table updated successfully!");

      // Refresh data
      fetchItemsQuery.refetch();
      allTimeTablesQuery.refetch();
    } catch (error) {
      console.error("Error updating time table:", error.message);
      toast.error(
        `Error updating time table: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetTimetable = async () => {
    try {
      setIsSubmitting(true);

      // Create a reset request - this will clear all time slots for this class
      await deleteItem.mutateAsync([timeTableData?._id]);

      // Clear any pending changes for this class
      const remainingChanges = pendingChanges.filter(
        (change) => change.classId !== selectedClass
      );

      setPendingChanges(remainingChanges);
      if (remainingChanges.length === 0) {
        setHasPendingChanges(false);
      }

      toast.success("Time table reset successfully!");

      // Refresh data
      fetchItemsQuery.refetch();
      allTimeTablesQuery.refetch();
    } catch (error) {
      console.error("Error resetting time table:", error.message);
      toast.error(
        `Error resetting time table: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discard all pending changes
  const handleDiscardChanges = () => {
    setPendingChanges([]);
    setHasPendingChanges(false);
    toast.info("All pending changes discarded");
  };

  // Get current view title for display
  const getCurrentViewTitle = useMemo(() => {
    if (category === "class") {
      return classes.find((c) => c?._id === selectedClass)?.name || "Class";
    } else if (category === "teacher") {
      return (
        teachers.find((t) => t?._id === selectedTeacher)?.name || "Teacher"
      );
    } else {
      return date ? `Date: ${date}` : "";
    }
  }, [category, selectedClass, selectedTeacher, date, classes, teachers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="class">Manage Time Table</SelectItem>
                <SelectItem value="teacher">
                  View Time Table By Teacher
                </SelectItem>
                <SelectItem value="date">View Time Table By Date</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {category === "teacher" && (
          <div className="w-full md:w-1/4">
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher?._id} value={teacher?._id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        {category === "date" && (
          <div className="w-full md:w-1/4">
            <Input
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}

        {category === "class" && (
          <div className="w-full md:w-1/4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem?._id} value={classItem?._id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stats Badges */}
        {category === "class" && selectedClass && (
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-xs md:text-sm py-2 px-3">
              Total Periods: {classStats.total}
            </Badge>
            <Badge
              variant={classStats.percentage === 100 ? "success" : "secondary"}
              className="text-xs md:text-sm py-2 px-3"
            >
              {classStats.filled} Scheduled ({classStats.percentage}%)
            </Badge>
          </div>
        )}
      </div>
      {category === "class" && hasPendingChanges && (
        <div className="flex gap-2 mb-4">
          <div>
            <Button
              variant="default"
              className="flex items-center"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save All Changes ({pendingChanges.length})
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscardChanges}
              disabled={isSubmitting}
            >
              Discard Changes
            </Button>
          </div>
        </div>
      )}

      {/* Timetable Display */}
      {fetchItemsQuery.isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : selectedClass || selectedTeacher || date ? (
        <div
          ref={timeTableRef}
          className="overflow-x-auto border border-collapse rounded-md"
        >
          <div className="hidden w-full print:block">
            <h3 className="text-center text-lg font-semibold my-4">
              Time Table - {getCurrentViewTitle}
            </h3>
          </div>
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="border bg-accent sticky left-0 z-10"></TableHead>
                {periods.map((period) => (
                  <TableHead
                    key={period?._id}
                    className="text-center border-t font-bold whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center text-xxs">
                      <span>{getPeriodTime(period.periodNumber)}</span>
                      <span className="text-xxs text-muted-foreground">
                        Period {period.periodNumber}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {category !== "date"
                ? DAYS.map((day) => (
                    <TableRow key={day} className="hover:bg-accent/50">
                      <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                        <div className="flex items-center gap-2">
                          {day.slice(0, 3)}
                        </div>
                      </TableCell>
                      {periods.map((period) => {
                        const cellData = getCellData(period.periodNumber, day);
                        const markedAttendance = attendanceData.filter(
                          (attendance) =>
                            attendance.periodNumber === period.periodNumber &&
                            attendance.day === day
                        );
                        const absentees = markedAttendance?.map(
                          (attendance) => ({
                            absentees: attendance?.attendanceData?.filter(
                              (record) => record.present === false
                            ),
                          })
                        );
                        const isPending = isPendingChange(
                          period.periodNumber,
                          day
                        );

                        return (
                          <TimetableSlot
                            key={`${day}-${period.periodNumber}`}
                            periodNumber={period.periodNumber}
                            day={day}
                            cellData={cellData}
                            category={category}
                            selectedClass={selectedClass}
                            onCellClick={handleCellClick}
                            isAttendanceMarked={markedAttendance?.length > 0}
                            absentees={absentees}
                            showAbsenteesDialog={showAbsenteesDialog}
                            isPendingChange={isPending}
                          />
                        );
                      })}
                    </TableRow>
                  ))
                : classes.map((classItem) => (
                    <TableRow
                      key={classItem?._id}
                      className="hover:bg-accent/50"
                    >
                      <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                        <div className="flex items-center whitespace-nowrap gap-2">
                          {classItem.name}
                        </div>
                      </TableCell>
                      {periods.map((period) => {
                        const cellData = getCellData(
                          period.periodNumber,
                          day,
                          classItem?._id
                        );
                        const markedAttendance = attendanceData.filter(
                          (attendance) =>
                            attendance.periodNumber === period.periodNumber &&
                            attendance.day === day &&
                            attendance.classId?._id === classItem?._id
                        );
                        const absentees = markedAttendance.map(
                          (attendance) => ({
                            absentees: attendance?.attendanceData?.filter(
                              (record) => record.present === false
                            ),
                          })
                        );
                        const isPending = isPendingChange(
                          period.periodNumber,
                          day,
                          classItem?._id
                        );

                        return (
                          <TimetableSlot
                            key={`${classItem?._id}-${period.periodNumber}`}
                            periodNumber={period.periodNumber}
                            day={day}
                            cellData={cellData}
                            category={category}
                            selectedClass={selectedClass}
                            onCellClick={handleCellClick}
                            isAttendanceMarked={markedAttendance?.length > 0}
                            absentees={absentees}
                            showAbsenteesDialog={showAbsenteesDialog}
                            isPendingChange={isPending}
                          />
                        );
                      })}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center p-8 border rounded-md">
          Please select a class or teacher to view the timetable
        </div>
      )}

      <div className="w-full flex justify-end gap-2 my-4">
        {category === "class" && selectedClass && (
          <ConfirmationPopup
            onClick={handleResetTimetable}
            action="reset"
            loading={isSubmitting}
            title={"Reset Time Table"}
            icon="Reset"
          />
        )}
        <Button onClick={handlePrint}>Print</Button>
      </div>

      {/* Absentees Dialog - Now centralized */}
      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        cellData={currentDialogData.cellData}
        day={currentDialogData.day}
        periodNumber={currentDialogData.periodNumber}
        absenteesList={currentAbsenteesList}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center text-center gap-2">
              <div>
                {existingTimeSlotId ? "Edit" : "Add"} Time Table Entry
                {selectedPeriod && selectedDay && (
                  <p className="text-sm">
                    {selectedDay} - Period {selectedPeriod} (
                    {getPeriodTime(parseInt(selectedPeriod))})
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <DialogDescription className="grid md:grid-cols-2 gap-4 text-foreground pt-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Subject" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectGroup>
                  <SelectItem value={null}>None</SelectItem>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject?._id} value={subject?._id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>None</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher?._id} value={teacher?._id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </DialogDescription>

          {teacherScheduleConflicts.length > 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Teacher scheduling conflicts:</p>
                {teacherScheduleConflicts.map((conflict, idx) => (
                  <p key={idx} className="text-sm mt-1">
                    {conflict.teacherName} is already teaching{" "}
                    {conflict.subject} for {conflict.class} on {conflict.day}{" "}
                    during period {conflict.period}
                  </p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              onClick={handleAddToPendingChanges}
              type="submit"
              disabled={isSubmitting || teacherScheduleConflicts.length > 0}
            >
              Add to Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTablesManagements;
