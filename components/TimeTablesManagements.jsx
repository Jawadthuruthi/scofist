"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { DAYS } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Edit, Loader2, Calendar, Clock, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useRouter } from "next/navigation";

const TimeTablesManagements = ({
  periods = [],
  classes = [],
  teachers = [],
  subjects = [],
  token,
}) => {
  // State management
  const [timeTableData, setTimeTableData] = useState({ timeSlots: [] });
  const [selectedClass, setSelectedClass] = useState(classes[0]?._id || "");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherScheduleConflicts, setTeacherScheduleConflicts] = useState([]);

  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  // Custom hooks
  const { useFetchItems, useUpdateItem } = useCrud("timeTables", token);
  const fetchItemsQuery = useFetchItems(0, 0, { classId: selectedClass });
  const updateItem = useUpdateItem();

  // Get all timetables to check for teacher conflicts
  const allTimeTablesQuery = useFetchItems(0, 0, {});

  // Filtered subjects based on selected class
  const filteredSubjects = useMemo(() => {
    const selectedClassData = classes.find((cls) => cls._id === selectedClass);
    return subjects.filter((subject) =>
      selectedClassData?.subjects?.includes(subject._id)
    );
  }, [classes, selectedClass, subjects]);

  // Check for schedule conflicts
  const checkTeacherConflicts = useCallback(
    (teacherId, periodNumber, day) => {
      if (!allTimeTablesQuery.data?.timeTables) return [];

      const conflicts = [];

      allTimeTablesQuery.data.timeTables.forEach((timeTable) => {
        if (!timeTable.timeSlots) return;

        timeTable.timeSlots.forEach((slot) => {
          if (
            slot.teacherId._id === teacherId &&
            slot.periodNumber === periodNumber &&
            slot.day === day &&
            timeTable.classId !== selectedClass
          ) {
            // Get class name for better context
            const conflictClass = classes.find(
              (cls) => cls._id === timeTable.classId
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
    [allTimeTablesQuery.data, classes, selectedClass]
  );

  // Fetch time table data when class changes
  useEffect(() => {
    if (fetchItemsQuery.data) {
      const newData = fetchItemsQuery.data["timeTables"] || [];
      setTimeTableData(newData[0] || { timeSlots: [] });
    }
  }, [fetchItemsQuery.data, selectedClass]);

  // Handle teacher selection and check for conflicts
  useEffect(() => {
    if (selectedTeacher && selectedPeriod && selectedDay) {
      const conflicts = checkTeacherConflicts(
        selectedTeacher,
        parseInt(selectedPeriod),
        selectedDay
      );
      setTeacherScheduleConflicts(conflicts);
    } else {
      setTeacherScheduleConflicts([]);
    }
  }, [selectedTeacher, selectedPeriod, selectedDay, checkTeacherConflicts]);

  // Handle form submission
  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      setIsSubmitting(true);

      // Validate form inputs
      if (!selectedSubject || !selectedTeacher) {
        toast.error("Please select both subject and teacher");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        classId: selectedClass,
        timeSlots: {
          day: selectedDay,
          periodNumber: parseInt(selectedPeriod),
          subjectId: selectedSubject,
          teacherId: selectedTeacher,
        },
      };

      // Add _id if it exists
      if (timeTableData._id) {
        payload._id = timeTableData._id;
      }

      await updateItem.mutateAsync({
        data: payload,
      });

      setOpen(false);
      toast.success("Time table updated successfully");

      // Refresh data
      fetchItemsQuery.refetch();
      allTimeTablesQuery.refetch();

      // Reset form
      setSelectedSubject("");
      setSelectedTeacher("");
    } catch (error) {
      console.error("Error updating time table:", error.message);
      toast.error(
        `Error updating time table: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get formatted period time
  const getPeriodTime = (periodNumber) => {
    const period = periods.find((p) => p.periodNumber === periodNumber);
    return period ? period.formattedTime : `Period ${periodNumber}`;
  };

  // Cell renderer component with memo for performance
  const CellData = useMemo(() => {
    return function CellDataComponent({ period, day }) {
      const cellData = timeTableData.timeSlots?.find(
        (slot) => slot.periodNumber === period && slot.day === day
      );

      return cellData ? (
        <div className="flex flex-col items-center justify-center p-2 hover:bg-accent">
          <p className="font-medium text-sm">{cellData.subjectId.name}</p>
          <p className="text-xs  text-accent-foreground">
            {cellData.teacherId.name}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center p-2 hover:bg-accent">
          <Edit className="text-muted-foreground h-4 w-4" />
        </div>
      );
    };
  }, [timeTableData.timeSlots]);

  // Open dialog with pre-filled values
  const handleCellClick = (period, day) => {
    const existingData = timeTableData.timeSlots?.find(
      (slot) => slot.periodNumber === period.periodNumber && slot.day === day
    );

    setSelectedPeriod(period.periodNumber.toString());
    setSelectedDay(day);
    setSelectedSubject(existingData?.subjectId?._id || "");
    setSelectedTeacher(existingData?.teacherId?._id || "");
    setOpen(true);
  };

  // Get class statistics
  const classStats = useMemo(() => {
    if (!timeTableData.timeSlots) return { total: 0, filled: 0 };

    const totalSlots = periods.length * DAYS.length;
    const filledSlots = timeTableData.timeSlots.length;

    return {
      total: totalSlots,
      filled: filledSlots,
      percentage: Math.round((filledSlots / totalSlots) * 100),
    };
  }, [timeTableData.timeSlots, periods.length]);

  // Parse days for better display
  const parseDay = (day) => {
    return day.substring(0, 3);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>TimeTable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/3">
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

            {selectedClass && (
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

          {fetchItemsQuery.isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedClass ? (
            <div className="overflow-x-auto border rounded-md">
              <Table className="border-collapse w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border font-bold bg-accent sticky left-0 z-10">
                      Day/Period
                    </TableHead>
                    {periods.map((period) => (
                      <TableHead
                        key={period._id}
                        className="border text-center font-bold whitespace-nowrap"
                      >
                        <div className="flex flex-col items-center">
                          <span>{getPeriodTime(period.periodNumber)}</span>
                          <span className="text-xs text-muted-foreground">
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
                          <Calendar className="h-4 w-4" />
                          {day}
                        </div>
                      </TableCell>
                      {periods.map((period) => (
                        <TableCell
                          key={`${day}-${period._id}`}
                          className="border text-center cursor-pointer min-w-[120px] transition-colors hover:bg-gray-100"
                          onClick={() => handleCellClick(period, day)}
                        >
                          <CellData period={period.periodNumber} day={day} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 border rounded-md">
              Please select a class to view the timetable
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90%] sm:max-w-[80%] md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center text-center gap-2">
              <div>
                Edit Time Table
                <p className=" text-sm">
                  {selectedDay} - Period {selectedPeriod} (
                  {getPeriodTime(parseInt(selectedPeriod))})
                </p>
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTablesManagements;
