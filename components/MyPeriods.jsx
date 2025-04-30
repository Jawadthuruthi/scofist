"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";

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
import Link from "next/link";

const MyPeriods = ({ apiKey, teacherId }) => {
  const [loading, setLoading] = useState(true);

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

  // Reduce network requests by passing proper options
  const periodsQuery = useFetchPeriods(
    0,
    0,
    {},
    {
      staleTime: 1000 * 60 * 60, // Periods rarely change - cache for an hour
    }
  );

  const timeTablesQuery = useFetchItems(
    0,
    0,
    { teacherId },
    {
      staleTime: 1000 * 60 * 60, // Timetables rarely change during the day
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
      staleTime: 1000 * 60 * 2, // Refresh every 2 minutes
    }
  );

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
      attendanceQuery.isLoading
    ) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [
    periodsQuery.isLoading,
    timeTablesQuery.isLoading,
    attendanceQuery.isLoading,
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
            {date}, {today}
          </div>

          {/* Periods Table */}
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredSlots.length > 0 ? (
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
                  {filteredSlots.map((slot) => (
                    <TableRow key={slot._id} className="hover:bg-accent/50">
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
                        <Link
                          href={`/dashboard/attendances?classId=${slot.classId?._id}&batchId=${slot.classId.batchId}&subjectId=${slot.subjectId?._id}&periodNumber=${slot.periodNumber}&day=${slot.day}`}
                          prefetch={false}
                        >
                          <ExternalLink className="text-muted-foreground h-5 w-5 md:hidden" />
                          <Button size="sm" className="hidden md:inline-flex">
                            {isAttendanceMarked(slot)
                              ? "Update Attendance"
                              : "Take Attendance"}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 border rounded-md">
              No teaching periods scheduled for {today}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPeriods;
