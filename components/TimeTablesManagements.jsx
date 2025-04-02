"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit, Loader2, AlertCircle } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Hooks and Utils
import { DAYS } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import usePrint from "@/hooks/use-print";

// Component for rendering a single timetable cell
const TimetableSlot = ({
  periodNumber,
  day,
  cellData,
  category,
  selectedTeacher,
  onCellClick,
}) => {
  const hasData = cellData && (cellData.subjectId || cellData.teacherId);

  return (
    <TableCell
      className="border text-center cursor-pointer transition-colors hover:bg-accent/50 max-w-32"
      onClick={() => onCellClick(periodNumber, day)}
    >
      {hasData ? (
        <div className="flex flex-col items-center justify-center hover:bg-accent">
          <p className="font-medium text-xs">
            {cellData.subjectId?.name || ""}
          </p>
          <p className="text-xxs text-accent-foreground">
            {category === "class" ||
            (category === "teacher" && !selectedTeacher)
              ? cellData.teacherId?.name || ""
              : cellData.classId?.name || ""}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center p-2 hover:bg-accent">
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
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherScheduleConflicts, setTeacherScheduleConflicts] = useState([]);
  const [existingTimeSlotId, setExistingTimeSlotId] = useState(null);

  // References and hooks
  const router = useRouter();
  const timeTableRef = useRef();
  const { useFetchItems, useUpdateItem } = useCrud("timeTables", token);

  // Set up print functionality
  const handlePrint = usePrint({
    content: () => timeTableRef.current,
    documentTitle: `Time Table`,
  });

  // Queries for data fetching
  const fetchQuery = useMemo(() => {
    return {
      classId:
        category === "class" || (category === "teacher" && !selectedTeacher)
          ? selectedClass
          : undefined,
      teacherId:
        category === "teacher" && selectedTeacher ? selectedTeacher : undefined,
    };
  }, [category, selectedClass, selectedTeacher]);

  const fetchItemsQuery = useFetchItems(0, 0, fetchQuery);
  const allTimeTablesQuery = useFetchItems(0, 0, {});
  const updateItem = useUpdateItem();

  // Periodically refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  // Filter subjects based on selected class
  const filteredSubjects = useMemo(() => {
    const selectedClassData = classes.find((cls) => cls._id === selectedClass);
    return subjects.filter((subject) =>
      selectedClassData?.subjects?.includes(subject._id)
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
          if (existingSlotId && slot._id === existingSlotId) return;

          if (
            slot?.teacherId?._id === teacherId &&
            slot.periodNumber === periodNumber &&
            slot.day === day
          ) {
            // Get class name for better context
            const conflictClass = classes.find(
              (cls) => cls._id === timeTable.classId._id
            );

            conflicts.push({
              class: conflictClass?.name || "Unknown Class",
              subject: slot.subjectId.name,
              teacherName: slot.teacherId.name,
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

  // Process timetable data when query results change
  useEffect(() => {
    if (!fetchItemsQuery.data) return;

    const newData = fetchItemsQuery.data.timeTables || [];

    if (category === "teacher" && selectedTeacher) {
      // Aggregate all slots for this teacher across classes
      const teachersTimeSlots = newData.reduce(
        (acc, timeTable) => {
          const slots = timeTable.timeSlots.filter(
            (slot) => slot.teacherId._id === selectedTeacher
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

      setTimeTableData(teachersTimeSlots);
    } else {
      // For class view, just use the first timetable
      setTimeTableData(newData[0] || { timeSlots: [] });
    }
  }, [fetchItemsQuery.data, category, selectedTeacher]);

  // Check for conflicts when form values change
  useEffect(() => {
    if (selectedTeacher && selectedPeriod && selectedDay) {
      const conflicts = checkTeacherConflicts(
        selectedTeacher,
        parseInt(selectedPeriod),
        selectedDay,
        existingTimeSlotId
      );
      setTeacherScheduleConflicts(conflicts);
    } else {
      setTeacherScheduleConflicts([]);
    }
  }, [
    selectedTeacher,
    selectedPeriod,
    selectedDay,
    existingTimeSlotId,
    checkTeacherConflicts,
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
    const filledSlots = timeTableData.timeSlots.length;

    return {
      total: totalSlots,
      filled: filledSlots,
      percentage: Math.round((filledSlots / totalSlots) * 100),
    };
  }, [timeTableData.timeSlots, periods.length]);

  // Get cell data for specific period and day
  const getCellData = useCallback(
    (periodNumber, day) => {
      return timeTableData.timeSlots?.find(
        (slot) => slot.periodNumber === periodNumber && slot.day === day
      );
    },
    [timeTableData.timeSlots]
  );

  // Handle cell click to open edit dialog
  const handleCellClick = useCallback(
    (periodNumber, day) => {
      if (category !== "class") return;

      const existingData = getCellData(periodNumber, day);

      setSelectedPeriod(periodNumber.toString());
      setSelectedDay(day);
      setSelectedSubject(existingData?.subjectId?._id || "");
      setSelectedTeacher(existingData?.teacherId?._id || "");
      setExistingTimeSlotId(existingData?._id || null);
      setOpen(true);
    },
    [category, getCellData]
  );

  // Form submission handler
  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      setIsSubmitting(true);

      const payload = {
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
        payload.timeSlots._id = existingTimeSlotId;
      }

      // Add timetable _id if it exists
      if (timeTableData._id) {
        payload._id = timeTableData._id;
      }

      await updateItem.mutateAsync({
        data: payload,
      });

      setOpen(false);
      toast.success("Time table updated successfully!");

      // Refresh data
      fetchItemsQuery.refetch();
      allTimeTablesQuery.refetch();

      // Reset form
      setSelectedSubject("");
      setSelectedTeacher("");
      setExistingTimeSlotId(null);
    } catch (error) {
      console.error("Error updating time table:", error.message);
      toast.error(
        `Error updating time table: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Time Table</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {category === "teacher" && (
              <div className="w-full md:w-1/4">
                <Select
                  value={selectedTeacher}
                  onValueChange={setSelectedTeacher}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher._id} value={teacher._id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(category === "class" || !selectedTeacher) && (
              <div className="w-full md:w-1/4">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem._id} value={classItem._id}>
                          {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stats Badges */}
            {(selectedClass || selectedTeacher) && (
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className="text-xs md:text-sm py-2 px-3"
                >
                  Total Periods: {classStats.total}
                </Badge>
                <Badge
                  variant={
                    classStats.percentage === 100 ? "success" : "secondary"
                  }
                  className="text-xs md:text-sm py-2 px-3"
                >
                  {classStats.filled} Scheduled ({classStats.percentage}%)
                </Badge>
              </div>
            )}
          </div>

          {/* Timetable Display */}
          {fetchItemsQuery.isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedClass || selectedTeacher ? (
            <div
              ref={timeTableRef}
              className="overflow-x-auto border border-collapse rounded-md"
            >
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border font-bold bg-accent sticky left-0 z-10"></TableHead>
                    {periods.map((period) => (
                      <TableHead
                        key={period._id}
                        className="text-center font-bold whitespace-nowrap"
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
                  {DAYS.map((day) => (
                    <TableRow key={day} className="hover:bg-accent/50">
                      <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                        <div className="flex items-center gap-2">
                          {day.slice(0, 3)}
                        </div>
                      </TableCell>
                      {periods.map((period) => {
                        const cellData = getCellData(period.periodNumber, day);
                        return (
                          <TimetableSlot
                            key={`${day}-${period._id}`}
                            periodNumber={period.periodNumber}
                            day={day}
                            cellData={cellData}
                            category={category}
                            selectedTeacher={selectedTeacher}
                            onCellClick={handleCellClick}
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

          <div className="w-full flex justify-end my-2">
            <Button onClick={handlePrint}>Print</Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90%] sm:max-w-[80%] md:max-w-xl">
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
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>None</SelectItem>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
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
                    <SelectItem key={teacher._id} value={teacher._id}>
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
              onClick={handleSubmit}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTablesManagements;
