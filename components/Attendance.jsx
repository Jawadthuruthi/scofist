"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader, Save, Calendar, Clock } from "lucide-react";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Hooks and Utils
import useCrud from "@/hooks/use-crud";
import { formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "./Header";
import AbsenteeStatus from "./AbsenteeStatus";

const Attendance = ({ apiKey, teacherId }) => {
  const searchParams = useSearchParams();

  // Extract and memoize query parameters
  const queryParams = useMemo(
    () => ({
      classId: searchParams.get("classId"),
      batchId: searchParams.get("batchId"),
      subjectId: searchParams.get("subjectId"),
      periodNumber: searchParams.get("periodNumber"),
      day: searchParams.get("day"),
    }),
    [searchParams]
  );

  const { classId, batchId, subjectId, periodNumber, day } = queryParams;

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classDetails, setClassDetails] = useState(null);
  const [periodDetails, setPeriodDetails] = useState(null);
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [attendanceDate] = useState(formatDate(new Date()));
  const [existingAttendanceId, setExistingAttendanceId] = useState(null);
  const [studentLeaveStatus, setStudentLeaveStatus] = useState({});

  const today = useMemo(() => formatDateForDisplay(new Date()), []);

  // CRUD hooks with optimized options
  const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
  const { useFetchItems: useFetchClass } = useCrud("classes", apiKey);
  const { useFetchItems: useFetchPeriod } = useCrud("periods", apiKey);
  const { useFetchItems: useFetchLeaveRecords } = useCrud(
    "leave-records",
    apiKey
  );
  const {
    useFetchItems: useFetchAttendance,
    useAddItem: useCreateAttendance,
    useUpdateItem: useUpdateAttendance,
    useDeleteItem: useDeleteAttendance,
  } = useCrud("attendances", apiKey);

  // Fetch data with appropriate stale times
  const classQuery = useFetchClass(
    null,
    null,
    { _id: classId },
    {
      staleTime: 1000 * 60 * 60, // 1 hour - classes don't change frequently
      enabled: !!classId,
    }
  );

  const periodQuery = useFetchPeriod(
    null,
    null,
    { periodNumber },
    {
      staleTime: 1000 * 60 * 60, // 1 hour - periods are static
      enabled: !!periodNumber,
    }
  );

  const studentsQuery = useFetchUsers(
    null,
    null,
    {
      roles: ["Student"],
      classId,
      status: "Active",
    },
    {
      staleTime: 1000 * 60 * 10, // 10 minutes - students don't change frequently
      enabled: !!classId,
    }
  );

  const attendanceQuery = useFetchAttendance(
    null,
    null,
    {
      classId,
      subjectId,
      periodNumber: parseInt(periodNumber),
      date: attendanceDate,
    },
    {
      staleTime: 1000 * 30, // 30 seconds - attendance changes frequently
      enabled: !!classId && !!subjectId && !!periodNumber,
    }
  );

  // Fetch leave records for students who haven't arrived yet
  const leaveRecordsQuery = useFetchLeaveRecords(
    null,
    null,
    {
      classId,
      isArrived: "false", // Only fetch students who haven't arrived yet
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes - leave status changes moderately
      enabled: !!classId,
    }
  );

  // Fetch historical attendance for absentee tracking
  const historicalAttendanceQuery = useFetchAttendance(
    0,
    10,
    {
      classId,
      batchId,
      subjectId,
      teacherId,
      trackAbsentees: true,
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes - historical data is relatively stable
      enabled: !!classId && !!batchId && !!subjectId && !!teacherId,
    }
  );

  // API mutations
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();

  // Memoize subject name for performance
  const subjectName = useMemo(() => {
    return classDetails?.subjects?.find((subject) => subject._id === subjectId)
      ?.name;
  }, [classDetails, subjectId]);

  // Process leave records to determine student status
  const processLeaveStatus = useCallback((leaveRecords, studentList) => {
    const leaveStatusMap = {};

    // Initialize all students as present/arrived
    studentList.forEach((student) => {
      leaveStatusMap[student._id] = {
        isOnLeave: false,
        hasArrived: true,
        leaveReason: null,
        expectedArrival: null,
        actualArrival: null,
      };
    });

    // Update status for students who are on leave and haven't arrived
    leaveRecords.forEach((record) => {
      if (
        record.studentId &&
        (!record.arrivedDate || record.arrivedDate === "")
      ) {
        leaveStatusMap[record.studentId] = {
          isOnLeave: true,
          hasArrived: false,
          leaveReason: record.leaveReason,
          expectedArrival: record.dateOfArrival,
          actualArrival: record.arrivedDate,
        };
      }
    });

    return leaveStatusMap;
  }, []);

  // Process leave records effect
  useEffect(() => {
    if (leaveRecordsQuery.data?.leaveRecords && students.length > 0) {
      const leaveStatus = processLeaveStatus(
        leaveRecordsQuery.data.leaveRecords,
        students
      );
      setStudentLeaveStatus(leaveStatus);
    }
  }, [leaveRecordsQuery.data, students, processLeaveStatus]);

  // Process class and period data
  useEffect(() => {
    if (classQuery.data?.classes?.[0]) {
      setClassDetails(classQuery.data.classes[0]);
    }
    if (periodQuery.data?.periods?.[0]) {
      setPeriodDetails(periodQuery.data.periods[0]);
    }
  }, [classQuery.data, periodQuery.data]);

  // Initialize attendance based on student list and leave status
  const initializeAttendance = useCallback((studentList, leaveStatusMap) => {
    const initialAttendance = {};

    studentList.forEach((student) => {
      const leaveInfo = leaveStatusMap[student._id];
      // Mark as absent if student is on leave and hasn't arrived
      initialAttendance[student._id] = !(
        leaveInfo?.isOnLeave && !leaveInfo?.hasArrived
      );
    });

    return initialAttendance;
  }, []);

  // Process student data and initialize attendance
  useEffect(() => {
    if (studentsQuery.data?.users?.length > 0) {
      const studentsList = studentsQuery.data.users;
      setStudents(studentsList);

      // Only initialize attendance if it's empty and we have leave status
      if (
        Object.keys(attendance).length === 0 &&
        Object.keys(studentLeaveStatus).length > 0
      ) {
        const initialAttendance = initializeAttendance(
          studentsList,
          studentLeaveStatus
        );
        setAttendance(initialAttendance);
      }
    }
  }, [
    studentsQuery.data,
    studentLeaveStatus,
    attendance,
    initializeAttendance,
  ]);

  // Process existing attendance data
  useEffect(() => {
    if (attendanceQuery.data?.attendances?.length > 0) {
      const attendanceRecord = attendanceQuery.data.attendances[0];
      setAttendanceExists(true);
      setExistingAttendanceId(attendanceRecord._id);

      // Update attendance state with existing data
      if (attendanceRecord.attendanceData?.length > 0) {
        const existingAttendance = {};
        attendanceRecord.attendanceData.forEach((item) => {
          existingAttendance[item.studentId] = item.present;
        });
        setAttendance(existingAttendance);
      }
    } else {
      setAttendanceExists(false);
      setExistingAttendanceId(null);
    }
  }, [attendanceQuery.data]);

  // Manage loading state
  useEffect(() => {
    const isLoading =
      classQuery.isLoading ||
      periodQuery.isLoading ||
      studentsQuery.isLoading ||
      attendanceQuery.isLoading ||
      leaveRecordsQuery.isLoading;

    setLoading(isLoading);
  }, [
    classQuery.isLoading,
    periodQuery.isLoading,
    studentsQuery.isLoading,
    attendanceQuery.isLoading,
    leaveRecordsQuery.isLoading,
  ]);

  // Memoize absentee data processing
  const absenteeData = useMemo(() => {
    if (
      !historicalAttendanceQuery.data?.attendances?.absenteeTracking ||
      !students.length
    ) {
      return [];
    }
    return historicalAttendanceQuery.data.attendances.absenteeTracking;
  }, [historicalAttendanceQuery.data, students]);

  // Memoize attendance toggle handler
  const toggleAttendance = useCallback((studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }, []);

  // Memoize attendance statistics
  const attendanceStats = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendance).filter(Boolean).length;
    const absent = total - present;
    const presentPercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPercentage = total > 0 ? Math.round((absent / total) * 100) : 0;

    return { total, present, absent, presentPercentage, absentPercentage };
  }, [students.length, attendance]);

  // Memoize absentee info lookup
  const getStudentAbsenteeInfo = useCallback(
    (studentId) =>
      absenteeData.find((student) => student.studentId === studentId),
    [absenteeData]
  );

  // Determine row styling based on student status
  const getRowStyling = useCallback(
    (studentId, isPresent) => {
      const leaveInfo = studentLeaveStatus[studentId];

      if (isPresent) {
        return { className: "hover:bg-muted/50", textColor: "" };
      }

      // Student is absent - check leave status
      if (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived) {
        return {
          className:
            "bg-red-100 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-950",
          textColor: "text-red-900 dark:text-red-100",
        };
      }

      // Regular absent student
      return {
        className:
          "bg-rose-50 dark:bg-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950",
        textColor: "text-rose-900 dark:text-rose-100",
      };
    },
    [studentLeaveStatus]
  );

  // Handle save attendance
  const handleSaveAttendance = useCallback(async () => {
    if (saving) return;

    try {
      setSaving(true);

      const attendanceData = students.map((student) => ({
        studentId: student._id,
        present: attendance[student._id] ?? false,
      }));

      const payload = {
        classId,
        batchId,
        subjectId,
        teacherId,
        periodNumber: parseInt(periodNumber),
        day,
        date: attendanceDate,
        attendanceData,
      };

      if (attendanceExists && existingAttendanceId) {
        await updateAttendance.mutateAsync({
          data: { _id: existingAttendanceId, ...payload },
        });
        toast.success("Attendance updated successfully!");
      } else {
        await createAttendance.mutateAsync(payload);
        toast.success("Attendance recorded successfully!");
        setAttendanceExists(true);
      }

      window.location.href = "/dashboard/my-periods";
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(`Failed to save attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    students,
    attendance,
    classId,
    batchId,
    subjectId,
    teacherId,
    periodNumber,
    day,
    attendanceDate,
    attendanceExists,
    existingAttendanceId,
    updateAttendance,
    createAttendance,
  ]);

  // Handle delete attendance
  const handleDeleteAttendance = useCallback(async () => {
    if (saving || !attendanceExists || !existingAttendanceId) return;

    try {
      setSaving(true);
      await deleteAttendance.mutateAsync({
        data: { ids: [existingAttendanceId] },
      });
      toast.success("Attendance reset successfully!");

      setAttendanceExists(false);
      setExistingAttendanceId(null);

      // Reset attendance based on leave status
      const resetAttendance = initializeAttendance(
        students,
        studentLeaveStatus
      );
      setAttendance(resetAttendance);
    } catch (error) {
      console.error("Error resetting attendance:", error);
      toast.error(`Failed to reset attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    attendanceExists,
    existingAttendanceId,
    deleteAttendance,
    students,
    studentLeaveStatus,
    initializeAttendance,
  ]);

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          title="ATTENDANCE MANAGEMENT"
          subTitle="Loading attendance data..."
        />
        <div className="flex justify-center items-center h-40">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="ATTENDANCE MANAGEMENT"
        subTitle={`Mark Attendance For ${classDetails?.name} - ${subjectName}`}
      />

      {/* Info Panel */}
      <div className="p-4 border border-border space-y-4 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{today}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Period {periodNumber}: {periodDetails?.formattedTime}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={
                attendanceStats.presentPercentage > 80
                  ? "success"
                  : "destructive"
              }
            >
              {attendanceStats.present}/{attendanceStats.total} Present (
              {attendanceStats.presentPercentage}%)
            </Badge>
            <Badge
              variant={
                attendanceStats.absentPercentage < 20
                  ? "success"
                  : "destructive"
              }
            >
              {attendanceStats.absent}/{attendanceStats.total} Absent (
              {attendanceStats.absentPercentage}%)
            </Badge>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-415px)] md:max-h-[calc(100vh-339px)] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">R.no</TableHead>
              <TableHead>Students</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[70px]">History</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student, index) => {
                const absenteeInfo = getStudentAbsenteeInfo(student._id);
                const hasAbsenceHistory = absenteeInfo?.continuousAbsences > 0;
                const isPresent = attendance[student._id];
                const rowStyling = getRowStyling(student._id, isPresent);
                const leaveInfo = studentLeaveStatus[student._id];

                return (
                  <TableRow
                    key={student._id}
                    className={`cursor-pointer ${rowStyling.className}`}
                    onClick={() => toggleAttendance(student._id)}
                  >
                    <TableCell className={rowStyling.textColor}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.profilePic?.url} />
                          <AvatarFallback>
                            {student.name.substring(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p
                            className={`font-medium text-xs ${rowStyling.textColor}`}
                          >
                            {student.name}
                          </p>
                          <p
                            className={`text-xs ${rowStyling.textColor || "text-muted-foreground"}`}
                          >
                            {student._id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {leaveInfo?.isOnLeave && !leaveInfo?.hasArrived && (
                          <Badge variant="destructive" className="text-xs">
                            Leave
                          </Badge>
                        )}
                      </div>
                      {leaveInfo?.isOnLeave && !leaveInfo?.hasArrived && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {leaveInfo.leaveReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasAbsenceHistory && (
                        <AbsenteeStatus absenteeInfo={absenteeInfo} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  No students found in this class
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleDeleteAttendance}
          disabled={!attendanceExists || saving}
        >
          {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Reset
        </Button>
        <Button
          onClick={handleSaveAttendance}
          disabled={saving || !students.length}
        >
          {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {attendanceExists ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default Attendance;
