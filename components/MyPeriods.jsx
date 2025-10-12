"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader, CheckCircle2, FileText, AlertCircle } from "lucide-react";

// UI Components
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
import { formatDate, formatDateForDisplay } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import Header from "./Header";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { toast } from "sonner";

const MyPeriods = ({ apiKey, teacherId }) => {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [classId, setClassId] = useState("");
  const [periodNumber, setPeriodNumber] = useState("");

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
  const { useFetchItems: useFetchSettings } = useCrud("settings", apiKey);
  const {
    useFetchItems: useFetchTeachersLeaveRecord,
    useAddItem,
    useUpdateItem,
  } = useCrud("teachers-leave-record", apiKey);

  const addLeaveRecord = useAddItem();
  const updateLeaveRecord = useUpdateItem();

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
    0,
    { teacherId },
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

  const dateISO = useMemo(() => new Date().toISOString(), []);

  const leaveRecordQuery = useFetchTeachersLeaveRecord(
    0,
    0,
    {
      teacherId,
      date: dateISO,
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

    // Process all timeTables in one pass
    const teachersSlots = timeTablesQuery.data.timeTables.flatMap(
      (timeTable) => {
        return timeTable.timeSlots
          .filter(
            (slot) => slot.teacherId?._id === teacherId && slot.day === today
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
  }, [timeTablesQuery.data?.timeTables, periods, teacherId, today]);

  // Precompute attendance status once
  const attendanceStatus = useMemo(() => {
    if (!attendanceQuery.data?.attendances) return {};

    const statusMap = {};
    attendanceQuery.data.attendances.forEach((attendance) => {
      const key = `${attendance.classId?._id}:${attendance.subjectId?._id}:${attendance.periodNumber}`;
      statusMap[key] = true;
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

  const handleLeave = async () => {
    if (!reason.trim()) {
      toast.error("Please enter a reason for leave.");
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
      await leaveRecordQuery.refetch();
    } catch (error) {
      console.error("Error submitting leave reason:", error);
      toast.error(error.message || "Error submitting leave reason");
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
        <div>
          {/* Day selector */}
          <div className="mb-6 py-1 px-8 border border-border rounded-lg max-w-fit text-sm">
            {date}
          </div>

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
                    <TableHead>Time</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Subject
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlots.map((slot) => {
                    const leaveRecord = leaveRecords.find(
                      (record) =>
                        record.classId === slot.classId?._id &&
                        record.periodNumber === slot.periodNumber
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
                        <TableCell className="whitespace-nowrap">
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
                          {leaveRecord && !isAttendanceMarked(slot) && (
                            <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                              <AlertCircle className="text-red-500 h-3 w-3" />
                              <span>{leaveRecord.leaveReason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-xs md:text-base">
                            {slot.classId?.name}
                          </div>
                          <div className="text-xs md:hidden mt-1">
                            {slot.subjectId?.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {slot.subjectId?.name}
                        </TableCell>

                        <TableCell align="right">
                          <div
                            className="z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(true);
                              setClassId(slot.classId._id);
                              setPeriodNumber(slot.periodNumber);
                              setReason(leaveRecord?.leaveReason || "");
                            }}
                          >
                            <FileText className="text-muted-foreground h-5 w-5 md:hidden" />
                            <Button size="sm" className="hidden md:inline-flex">
                              Reason
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 border rounded-md font-bold text-muted-foreground text-lg">
              {!settings?.general?.isWorkingDay
                ? settings?.general?.occasion || "Today is a non-working day."
                : "No periods scheduled for " + today + "."}
            </div>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Leave Reason</DialogTitle>
            <DialogDescription>Provide a leave reason.</DialogDescription>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="write your leave reason here"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button disabled={addLeaveRecord.isPending} onClick={handleLeave}>
              Submit
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyPeriods;
