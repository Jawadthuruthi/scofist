"use client";
import { Button } from "@/components/ui/button";
import useCrud from "@/hooks/use-crud";
import { useReactToPrint } from "react-to-print";
import { DAYS } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader, UserX } from "lucide-react";
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
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import PrintHeader from "@/components/PrintHeader";

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const currentDay = daysOfWeek[new Date().getDay()];

// Absentees Dialog Component
const AbsenteesDialog = ({
  open,
  setOpen,
  cellData,
  day,
  periodNumber,
  absenteesList,
  useShortName = false,
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
            {useShortName ? (cellData?.classId?.shortname || cellData?.classId?.name || "") : (cellData?.classId?.name || "")}
            {cellData?.classId?.batchId?.name
              ? ` (${cellData.classId.batchId.name})`
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
            <p>Full attendance for this period</p>
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
}) => {
  const timeTableRef = useRef(null);
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [currentDialogData, setCurrentDialogData] = useState({});
  const [currentAbsenteesList, setCurrentAbsenteesList] = useState([]);

  const { useFetchItems } = useCrud("timeTables", apiKey);
  const fetchTimeTableQuery = useFetchItems(null, null, {
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
    )
    : timeTable.reduce(
      (acc, timeTable) => {
        // Only get slots for the current day
        const slots = timeTable.timeSlots.filter(
          (slot) => slot.day === currentDay
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
            (classId ? slot.classId?._id === classId : true)
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
    if (!hideEmptyClassRows || teacherId) return classes;

    return classes.filter((classItem) => {
      return timeTableData.timeSlots?.some(
        (slot) =>
          slot.classId?._id === classItem._id &&
          (slot.subjectId || slot.teacherId)
      );
    });
  }, [classes, hideEmptyClassRows, teacherId, timeTableData.timeSlots]);

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
              : filteredClasses.map((classItem) => (
                <TableRow key={classItem?._id} className="hover:bg-accent/50">
                  <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                    <div className="flex items-center text-xs whitespace-nowrap gap-2">
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
                        attendance.classId?._id === classItem?._id &&
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

                    const leaveRecord = teachersLeaveRecord.find((record) => {
                      const recordDate = new Date(record.date);
                      const recordDay = recordDate.toLocaleDateString(
                        "en-US",
                        { weekday: "long" }
                      );
                      const recordDateStr = recordDate.toISOString().split('T')[0];
                      const todayDateStr = new Date().toISOString().split('T')[0];
                      
                      return (
                        record.periodNumber === period.periodNumber &&
                        record.teacherId === cellData?.teacherId?._id &&
                        recordDay === currentDay &&
                        recordDateStr === todayDateStr
                      );
                    });

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
              ))}
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
