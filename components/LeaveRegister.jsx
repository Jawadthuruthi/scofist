"use client";

import useCrud from "@/hooks/use-crud";
import Header from "./Header";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Clock, User, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import Link from "next/link";

const LeaveRegister = ({ apiKey, role, teacherId }) => {
  const [selectedClass, setSelectedClass] = useState("");

  const router = useRouter();

  const { useFetchItems } = useCrud("classes", apiKey);
  const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
  const { useFetchItems: useFetchLeaveRecords } = useCrud(
    "leave-records",
    apiKey
  );

  const fetchClassQuery = useFetchItems(
    0,
    0,
    {
      teacherId: role === "Teacher" ? teacherId : null,
      projection: "_id,name",
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const fetchStudentsQuery = useFetchStudents(
    0,
    0,
    {
      classId: selectedClass,
      projection: "_id,name,email",
      roles: "Student",
      status: "Active",
    },
    {
      enabled: !!selectedClass,
      refetchOnWindowFocus: false,
    }
  );

  const fetchLeaveRecordsQuery = useFetchLeaveRecords(
    0,
    0,
    {
      classId: selectedClass,
      projection:
        "_id,studentId,dateOfLeave,leaveReason,dateOfArrival,arrivedDate,lateReason,remark,createdAt",
    },
    {
      enabled: !!selectedClass,
      refetchOnWindowFocus: false,
    }
  );

  const classes = useMemo(() => {
    return (
      fetchClassQuery.data?.classes?.filter((cls) => {
        if (role === "Teacher") {
          return cls.teacherId === teacherId;
        }
        return true;
      }) || []
    );
  }, [fetchClassQuery.data]);

  const students = useMemo(() => {
    return fetchStudentsQuery.data?.users || [];
  }, [fetchStudentsQuery.data]);

  const leaveRecords = useMemo(() => {
    return fetchLeaveRecordsQuery.data?.leaveRecords || [];
  }, [fetchLeaveRecordsQuery.data]);

  const studentLeaveStats = useMemo(() => {
    const stats = {};
    students.forEach((student) => {
      const studentLeaves = leaveRecords.filter(
        (record) => record.studentId === student._id
      );

      const latestRecord = studentLeaves.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      // Calculate status based on arrival information
      const recordsWithStatus = studentLeaves.map((record) => {
        let status = "pending";
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const arrivalDate = new Date(record.dateOfArrival);
        arrivalDate.setHours(0, 0, 0, 0);
        const arrivedDate = record.arrivedDate
          ? new Date(record.arrivedDate)
          : null;

        if (arrivedDate) {
          status = "completed";
        } else if (currentDate > arrivalDate) {
          status = "overdue";
        }

        return { ...record, status };
      });

      const pendingRecords = recordsWithStatus.filter(
        (r) => r.status === "pending"
      );
      const overdueRecords = recordsWithStatus.filter(
        (r) => r.status === "overdue"
      );

      stats[student._id] = {
        totalLeaves: studentLeaves.length,
        latestRecord: latestRecord
          ? {
            ...latestRecord,
            status:
              recordsWithStatus.find((r) => r._id === latestRecord._id)
                ?.status || "pending",
          }
          : null,
        pendingLeaves: pendingRecords.length,
        overdueLeaves: overdueRecords.length,
      };
    });
    return stats;
  }, [students, leaveRecords]);

  useEffect(() => {
    if (role === "Teacher" && classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]._id);
    }
  }, [classes, role, selectedClass]);

  const getStatusBadge = (status) => {
    const variants = {
      "Very Good": "default",
      Good: "default",
      Acceptable: "secondary",
      Bad: "destructive",
      "Very Bad": "destructive",
    };

    const labels = {
      "Very Good": "Very Good",
      Good: "Good",
      Acceptable: "Acceptable",
      Bad: "Bad",
      "Very Bad": "Very Bad",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {labels[status] || status || "No Remark"}
      </Badge>
    );
  };

  const calculateDaysOnLeave = (dateOfLeave, arrivedDate, dateOfArrival) => {
    const leaveDate = new Date(dateOfLeave);
    const endDate = arrivedDate
      ? new Date(arrivedDate)
      : new Date(dateOfArrival);
    const diffTime = Math.abs(endDate - leaveDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      <Header
        title="LEAVE REGISTER"
        subTitle="Manage Leave Records Of Students"
      />

      <div className="flex flex-col space-y-4">
        <div className="w-full max-w-sm">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map((cls) => (
                <SelectItem key={cls._id} value={cls._id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClass && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="text-xl font-bold">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="text-xl font-bold">
                {Object.values(studentLeaveStats).reduce(
                  (total, stats) =>
                    total + stats.pendingLeaves + stats.overdueLeaves,
                  0
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-full overflow-auto border border-border rounded-md whitespace-nowrap ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students?.length > 0 ? (
              students
                .sort((a, b) => {
                  if (
                    studentLeaveStats[a._id]?.pendingLeaves > 0 ||
                    studentLeaveStats[a._id]?.overdueLeaves > 0
                  ) {
                    return -1;
                  }
                })
                .map((student, index) => {
                  const stats = studentLeaveStats[student._id] || {};
                  const latestRecord = stats.latestRecord;

                  return (
                    <TableRow
                      key={student._id}
                      className={
                        stats.pendingLeaves > 0 || stats.overdueLeaves > 0
                          ? "bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 border-l-4 border-red-500"
                          : "hover:bg-muted/50"
                      }
                      onClick={() => {
                        router.push(`/dashboard/leave-register/${student._id}`);
                      }}
                    >
                      <TableCell
                        className={`text-center font-medium text-sm ${stats.pendingLeaves > 0 || stats.overdueLeaves > 0
                          ? "text-red-900 dark:text-red-100"
                          : ""
                          }`}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div
                            className={`font-medium text-xs ${stats.pendingLeaves > 0 || stats.overdueLeaves > 0
                              ? "text-red-900 dark:text-red-100"
                              : ""
                              }`}
                          >
                            {student.name}
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`${stats.pendingLeaves > 0 ||
                                stats.overdueLeaves > 0
                                ? "text-red-700 dark:text-red-300"
                                : "text-muted-foreground"
                                }`}
                            >
                              {stats.totalLeaves || 0}{" "}
                              {stats.totalLeaves <= 1 ? "leave" : "leaves"}
                            </span>
                            {stats.pendingLeaves > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-xs px-1 py-0 bg-red-600 text-white dark:bg-red-400 dark:text-red-950"
                              >
                                pending
                              </Badge>
                            )}
                            {stats.overdueLeaves > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-xs px-1 py-0 bg-red-800 text-white dark:bg-red-600 dark:text-white"
                              >
                                {stats.overdueLeaves} overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-0 py-2">
                        {latestRecord ? (
                          <div className="space-y-1">
                            {getStatusBadge(latestRecord.remark)}
                            <div
                              className={`text-xs px-2 ${stats.pendingLeaves > 0
                                ? "text-red-700 dark:text-red-300"
                                : "text-muted-foreground"
                                }`}
                            >
                              Days:{" "}
                              {calculateDaysOnLeave(
                                latestRecord.dateOfLeave,
                                latestRecord.arrivedDate,
                                latestRecord.dateOfArrival
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`text-sm ${stats.pendingLeaves > 0
                              ? "text-red-700 dark:text-red-300"
                              : "text-muted-foreground"
                              }`}
                          >
                            -
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="space-y-2">
                    <div className="text-muted-foreground">
                      {!!selectedClass
                        ? "No students found for this class."
                        : "Please select a class to view students."}
                    </div>
                    {!!selectedClass && fetchStudentsQuery.isLoading && (
                      <Loader className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end space-x-2 pb-4">
        <Link href="/dashboard/leave-history">
          <Button>
            <Clock className="mr-2 h-4 w-4" />
            Leave Records
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default LeaveRegister;
