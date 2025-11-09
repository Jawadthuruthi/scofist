"use client";

import { formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "./Header";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import useCrud from "@/hooks/use-crud";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const prayers = ["ZUHR", "ASAR", "MAGRIB", "ISHA", "SUBH"];

const AbsenteesDialog = ({ open, setOpen, date, absentees }) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Masjid Absentees</DialogTitle>
          <DialogDescription>
            The following students were absent on {date}.
          </DialogDescription>
        </DialogHeader>
        {absentees.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              Absent Students ({absentees.length})
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
                  {absentees.map((student) => (
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

const MasjidAttendance = ({
  students = [],
  classes = [],
  apiKey,
}) => {
  const [attendance, setAttendance] = useState({});
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedPrayer, setSelectedPrayer] = useState("");

  const router = useRouter();

  const today = useMemo(() => days[new Date().getDay()], []);
  const date = useMemo(() => formatDateForDisplay(new Date()), []);
  const formattedDate = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    router.refresh();
  }, []);

  const { useFetchItems: useFetch } = useCrud("masjid/attendances", apiKey);

  const attendanceQuery = useFetch(
    0,
    0,
    {
      date: formattedDate,
      trackAbsentees: true,
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  const attendanceData = useMemo(() => {
    return attendanceQuery.data?.attendances || [];
  }, [attendanceQuery.data]);

  const absentees = useMemo(() => {
    return attendanceQuery.data?.absentees || [];
  }, [attendanceQuery.data]);

  const classBasedAbsentees = useMemo(() => {
    return absentees
      .reduce((acc, student) => {
        if (!acc[student.classId]) {
          acc[student.classId] = [];
        }
        acc[student.classId].push(student);
        return acc;
      }, {});
  }, [absentees]);

  useEffect(() => {
    if (students?.length > 0) {
      // Initialize attendance map efficiently
      const initialAttendance = {};
      students.forEach((student) => {
        initialAttendance[student._id] = true; // Default to present
      });

      // Only set attendance if we don't have existing attendance data
      if (Object.keys(attendance).length === 0) {
        setAttendance(initialAttendance);
      }
    }
  }, [students, attendance]);

  const isAttendanceMarked = useCallback(
    (id) => {
      return attendanceData.some(
        (att) =>
          att.classId === id &&
          att.date === formattedDate
      );
    },
    [attendanceData, formattedDate]
  );

  return (
    <div className="space-y-6">
      <Header
        title="MASJID ATTENDANCE"
        subTitle="Manage Masjid Attendance"
      />
      <div className="mb-6 py-1 px-8 border border-border rounded-lg max-w-fit text-sm">
        {date}
      </div>
      {selectedPrayer ? (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{selectedPrayer}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPrayer("")}
            >
              Back
            </Button>
          </div>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Absentees</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls._id} className="hover:bg-accent/50">
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs md:text-base">{cls?.name}</div>
                      {isAttendanceMarked(cls._id) && (
                        <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                          <CheckCircle2 className="text-green-500 h-3 w-3" />
                          <span>Attendance Marked</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {classBasedAbsentees[cls._id] &&
                      classBasedAbsentees[cls._id].length > 0 ? (
                        <div
                          className={`flex items-center ml-auto max-w-fit gap-2 rounded-full px-2 py-1 border cursor-pointer`}
                          onClick={() => {
                            setAbsenteesDialogOpen(true);
                            setSelectedClassId(cls._id);
                          }}
                        >
                          <AlertTriangle className="text-red-500 h-4 w-4" />
                          <Badge
                            variant="destructive"
                            className="text-xs whitespace-nowrap"
                          >
                            {classBasedAbsentees[cls._id].length}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {isAttendanceMarked(cls._id) ? "No Absentees" : ""}
                        </span>
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <Link
                        href={`/dashboard/masjid-attendance/mark-attendance?classId=${cls?._id}&className=${cls?.name}&apiKey=${apiKey}&date=${formattedDate}&day=${today}&batchId=${cls.batchId}&prayer=${selectedPrayer}`}
                        prefetch={false}
                      >
                        <ExternalLink className="text-muted-foreground h-5 w-5 md:hidden" />
                        <Button size="sm" className="hidden md:inline-flex">
                          {isAttendanceMarked(cls._id)
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
        </>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prayer</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prayers.map((prayer) => (
                <TableRow
                  key={prayer}
                  className="hover:bg-accent/50 cursor-pointer"
                  onClick={() => setSelectedPrayer(prayer)}
                >
                  <TableCell className="whitespace-nowrap">{prayer}</TableCell>
                  <TableCell align="right">
                    <Button size="sm">Select</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        date={date}
        absentees={
          classBasedAbsentees[selectedClassId] || []
        }
      />
    </div>
  );
};

export default MasjidAttendance;