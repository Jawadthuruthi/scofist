"use client";

import { formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "./Header";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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

const AbsenteesDialog = ({ open, setOpen, date, absentees }) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Literary Absentees</DialogTitle>
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

const LiteraryAttendance = ({
  students = [],
  classes = [],
  apiKey,
  groups = [],
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [attendance, setAttendance] = useState({});
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);

  const router = useRouter();

  const today = useMemo(() => days[new Date().getDay()], [days]);
  const date = useMemo(() => formatDateForDisplay(new Date()), []);
  const formattedDate = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    router.refresh();
  }, []);

  const { useFetchItems: useFetch } = useCrud("literary/attendances", apiKey);

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
      .filter((student) => student.category === "ALL")
      .reduce((acc, student) => {
        if (!acc[student.classId]) {
          acc[student.classId] = [];
        }
        acc[student.classId].push(student);
        return acc;
      }, {});
  }, [absentees]);

  const groupBasedAbsentees = useMemo(() => {
    return absentees
      .filter((student) => student.category === "GROUP")
      .reduce((acc, student) => {
        if (!acc[student.groupId]) {
          acc[student.groupId] = [];
        }
        acc[student.groupId].push(student);
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
      if (activeTab === "group") {
        return attendanceData.some(
          (att) =>
            att.groupId === id &&
            att.date === formattedDate &&
            att.category === "GROUP"
        );
      }
      return attendanceData.some(
        (att) =>
          att.classId === id &&
          att.date === formattedDate &&
          att.category === "ALL"
      );
    },
    [attendanceData, activeTab, formattedDate]
  );

  return (
    <div className="space-y-6">
      <Header
        title="LITERARY ATTENDANCE"
        subTitle="Manage Literary Attendance"
      />
      <div className="mb-6 py-1 px-8 border border-border rounded-lg max-w-fit text-sm">
        {date}, {today}
      </div>
      <Tabs value={activeTab} defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="group">Group</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
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
                        href={`/dashboard/literary-attendance/mark-attendance?classId=${cls?._id}&category=ALL&apiKey=${apiKey}&date=${formattedDate}&day=${today}&batchId=${cls.batchId}`}
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
        </TabsContent>
        <TabsContent value="group">
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Absentees</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group._id} className="hover:bg-accent/50">
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs md:text-base">{group?.name}</div>
                      {isAttendanceMarked(group._id) && (
                        <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                          <CheckCircle2 className="text-green-500 h-3 w-3" />
                          <span>Attendance Marked</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {groupBasedAbsentees[group._id] &&
                      groupBasedAbsentees[group._id].length > 0 ? (
                        <div
                          className={`flex items-center ml-auto max-w-fit gap-2 rounded-full px-2 py-1 border cursor-pointer`}
                          onClick={() => {
                            setAbsenteesDialogOpen(true);
                          }}
                        >
                          <AlertTriangle className="text-red-500 h-4 w-4" />
                          <Badge
                            variant="destructive"
                            className="text-xs whitespace-nowrap"
                          >
                            {groupBasedAbsentees[group._id].length}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {isAttendanceMarked(group._id) ? "No Absentees" : ""}
                        </span>
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <Link
                        href={`/dashboard/literary-attendance/mark-attendance?groupId=${group?._id}&category=GROUP&apiKey=${apiKey}&date=${formattedDate}&day=${today}`}
                        prefetch={false}
                      >
                        <ExternalLink className="text-muted-foreground h-5 w-5 md:hidden" />
                        <Button size="sm" className="hidden md:inline-flex">
                          {isAttendanceMarked(group._id)
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
        </TabsContent>
      </Tabs>
      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        date={date}
        absentees={
          activeTab === "all"
            ? classBasedAbsentees[classes[0]?._id] || []
            : groupBasedAbsentees[groups[0]?._id] || []
        }
      />
    </div>
  );
};

export default LiteraryAttendance;
