"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

const MyPeriods = ({ token, teacherId }) => {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [timeTableData, setTimeTableData] = useState([]);

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const today = days[new Date().getDay()];
  const date = formatDateForDisplay(new Date());

  const router = useRouter();
  const { useFetchItems } = useCrud("timeTables", token);
  const { useFetchItems: useFetchPeriods } = useCrud("periods", token);
  const { useFetchItems: useFetchAttendance } = useCrud("attendances", token);

  // Fetch all periods
  const periodsQuery = useFetchPeriods();

  // Fetch timetables for current teacher
  const timeTablesQuery = useFetchItems(0, 0, { teacherId });

  const attendanceQuery = useFetchAttendance(null, null, {
    date: formatDate(new Date()),
  });

  useEffect(() => {
    if (periodsQuery.data?.periods) {
      setPeriods(
        periodsQuery.data.periods.sort(
          (a, b) => a.periodNumber - b.periodNumber
        )
      );
    }
  }, [periodsQuery.data]);

  // Process timetable data when query results change
  useEffect(() => {
    if (!timeTablesQuery.data) return;

    // Aggregate all slots for this teacher across classes
    const teachersTimeSlots = timeTablesQuery.data.timeTables.reduce(
      (acc, timeTable) => {
        const slots = timeTable.timeSlots.filter(
          (slot) => slot.teacherId?._id === teacherId
        );
        const classId = timeTable.classId;
        return [
          ...acc,
          ...slots.map((slot) => ({
            ...slot,
            classId,
            periodDetails: periods.find(
              (p) => p.periodNumber === slot.periodNumber
            ),
          })),
        ];
      },
      []
    );

    setTimeTableData(teachersTimeSlots);
    setLoading(false);
  }, [timeTablesQuery.data, teacherId, periods]);

  // Filter slots for selected day
  const filteredSlots = useMemo(() => {
    return timeTableData
      .filter((slot) => slot.day === today)
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }, [timeTableData]);

  return (
    <div className="space-y-6">
      <div className="w-full">
        <div>
          <Header
            title="MY PERIODS"
            subTitle="View schedule & take attendance"
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
                    <TableHead className="w-32">Time</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Subject
                    </TableHead>
                    <TableHead className="max-w-5 w-5 md:max-w-fit md:w-fit"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlots.map((slot) => {
                    const attendanceMarked =
                      attendanceQuery.data?.attendances.find(
                        (attendance) =>
                          attendance.classId._id === slot.classId._id &&
                          attendance.subjectId._id === slot.subjectId._id &&
                          attendance.periodNumber === slot.periodNumber
                      );
                    return (
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
                          {attendanceMarked && (
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
                          <div className="text-xxs md:hidden">
                            {slot.subjectId?.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {slot.subjectId.name}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/attendances?classId=${slot.classId._id}&subjectId=${slot.subjectId._id}&periodNumber=${slot.periodNumber}&day=${slot.day}`}
                          >
                            <ExternalLink className="text-muted-foreground h-5 w-5 md:hidden" />
                            <Button size="sm" className="hidden md:inline-flex">
                              {attendanceMarked
                                ? "Update Attendance"
                                : "Take Attendance"}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
