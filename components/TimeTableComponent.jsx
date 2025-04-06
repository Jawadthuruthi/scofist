"use client";
import { Button } from "@/components/ui/button";
import useCrud from "@/hooks/use-crud";
import usePrint from "@/hooks/use-print";
import { DAYS } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, UserX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Absentees Dialog Component
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
            {" • Class: "}
            {cellData?.classId?.name || ""}
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
            <p>Full attendance for this period</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TimeTableComponent = ({ token, teacherId }) => {
  const timeTableRef = useRef(null);
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [currentDialogData, setCurrentDialogData] = useState({});
  const [currentAbsenteesList, setCurrentAbsenteesList] = useState([]);

  const { useFetchItems } = useCrud("timeTables", token);
  const { useFetchItems: useFetchPeriods } = useCrud("periods", token);
  const { useFetchItems: useFetchAttendance } = useCrud("attendances", token);

  // Set date range for attendance data (last 7 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();

  const fetchItemsQuery = useFetchItems(0, 0, { teacherId });
  const fetchPeriodsQuery = useFetchPeriods(0, 0, {});
  const fetchAttendanceQuery = useFetchAttendance(0, 0, {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    teacherId: teacherId,
  });

  const timeTables = fetchItemsQuery.data?.timeTables || [];
  const periods = fetchPeriodsQuery.data?.periods || [];
  const attendanceData = fetchAttendanceQuery.data?.attendances || [];

  const timeTableData = timeTables.reduce(
    (acc, timeTable) => {
      const slots = timeTable.timeSlots.filter(
        (slot) => slot.teacherId?._id === teacherId
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

  const getCellData = useCallback(
    (periodNumber, day) => {
      return timeTableData.timeSlots?.find(
        (slot) => slot.periodNumber === periodNumber && slot.day === day
      );
    },
    [timeTableData.timeSlots]
  );

  const getPeriodTime = useCallback(
    (periodNumber) => {
      const period = periods.find((p) => p.periodNumber === periodNumber);
      return period ? period.formattedTime : `Period ${periodNumber}`;
    },
    [periods]
  );

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

  const handlePrint = usePrint({
    content: () => timeTableRef.current,
    documentTitle: `Time Table`,
  });

  return (
    <div>
      {fetchItemsQuery.isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div
          ref={timeTableRef}
          className="overflow-x-auto border border-collapse rounded-md"
        >
          <div className="hidden w-full print:block">
            <h3 className="text-center text-lg font-semibold my-4">
              Time Table
            </h3>
          </div>
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="border bg-accent sticky left-0 rig z-10"></TableHead>
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
              {DAYS.map((day) => (
                <TableRow key={day} className="hover:bg-accent/50">
                  <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                    <div className="flex items-center gap-2">
                      {day.slice(0, 3)}
                    </div>
                  </TableCell>
                  {periods.map((period) => {
                    const cellData = getCellData(period.periodNumber, day);

                    // Check for marked attendance
                    const markedAttendance = attendanceData.filter(
                      (attendance) =>
                        attendance.periodNumber === period.periodNumber &&
                        attendance.day === day &&
                        attendance.teacherId?._id === teacherId
                    );

                    // Prepare absentees list
                    const absentees = markedAttendance?.map((attendance) => ({
                      absentees: attendance?.attendanceData?.filter(
                        (record) => record.present === false
                      ),
                    }));

                    const absenteesList =
                      absentees?.flatMap((item) => item.absentees || []) || [];
                    const isAttendanceMarked = markedAttendance?.length > 0;

                    return (
                      <TableCell
                        onClick={() => {
                          if (isAttendanceMarked) {
                            showAbsenteesDialog(
                              period.periodNumber,
                              day,
                              cellData,
                              absenteesList
                            );
                          }
                        }}
                        key={period?._id}
                        className={`${
                          isAttendanceMarked
                            ? "bg-green-300/50 print:bg-inherit"
                            : ""
                        } border text-center  cursor-pointer`}
                      >
                        {cellData ? (
                          <div className="flex flex-col items-center justify-center">
                            <p className="font-medium text-xs">
                              {cellData.subjectId?.name || ""}
                            </p>
                            <p className="text-xxs text-accent-foreground">
                              {cellData.classId?.name || ""}
                            </p>

                            {/* Attendance badge */}
                            {isAttendanceMarked && absenteesList.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="mt-1 text-xxs print:hidden"
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
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold">-</span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Absentees Dialog */}
      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        cellData={currentDialogData.cellData}
        day={currentDialogData.day}
        periodNumber={currentDialogData.periodNumber}
        absenteesList={currentAbsenteesList}
      />

      <div className="flex justify-end mt-4">
        <Button variant="default" onClick={handlePrint}>
          Print
        </Button>
      </div>
    </div>
  );
};

export default TimeTableComponent;
