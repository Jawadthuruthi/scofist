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

  // Destructure for convenience
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
      staleTime: 1000 * 60 * 60, // Classes don't change frequently
      enabled: !!classId,
    }
  );

  const periodQuery = useFetchPeriod(
    null,
    null,
    { periodNumber },
    {
      staleTime: 1000 * 60 * 60, // Periods are static
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
      staleTime: 1000 * 60 * 10, // Students in a class don't change frequently
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
      staleTime: 1000 * 30, // Attendance might change frequently
      enabled: !!classId && !!subjectId && !!periodNumber,
    }
  );

  // Fetch leave records for current date
  const leaveRecordsQuery = useFetchLeaveRecords(
    null,
    null,
    {
      classId,
      date: attendanceDate,
    },
    {
      staleTime: 1000 * 60 * 5, // Leave records change moderately
      enabled: !!classId,
    }
  );

  // Fetch absentee data with more targeted query
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
      staleTime: 1000 * 60 * 5, // Historical data changes less frequently
      enabled: !!classId && !!batchId && !!subjectId && !!teacherId,
    }
  );

  // API mutations
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();

  // Memoize class subject name for better performance
  const subjectName = useMemo(() => {
    return classDetails?.subjects?.find((subject) => subject._id === subjectId)
      ?.name;
  }, [classDetails, subjectId]);

  // Process leave records and determine student status
  useEffect(() => {
    if (leaveRecordsQuery.data?.leaveRecords?.length > 0) {
      const leaveStatus = {};
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      leaveRecordsQuery.data.leaveRecords.forEach((record) => {
        const leaveDate = new Date(record.dateOfLeave);
        const arrivalDate = new Date(record.dateOfArrival);
        leaveDate.setHours(0, 0, 0, 0);
        arrivalDate.setHours(0, 0, 0, 0);

        // Check if student is currently on leave
        if (currentDate >= leaveDate && currentDate <= arrivalDate) {
          // Check if student has arrived back
          const hasArrived =
            record.arrivedDate && new Date(record.arrivedDate) <= currentDate;

          leaveStatus[record.studentId] = {
            isOnLeave: true,
            hasArrived: hasArrived,
            leaveReason: record.leaveReason,
            expectedArrival: record.dateOfArrival,
            actualArrival: record.arrivedDate,
          };
        }
      });

      setStudentLeaveStatus(leaveStatus);
    }
  }, [leaveRecordsQuery.data]);

  // Process class and period data - once on initial load
  useEffect(() => {
    if (classQuery.data?.classes?.[0]) {
      setClassDetails(classQuery.data.classes[0]);
    }

    if (periodQuery.data?.periods?.[0]) {
      setPeriodDetails(periodQuery.data.periods[0]);
    }
  }, [classQuery.data, periodQuery.data]);

  // Process student data with optimized update
  useEffect(() => {
    if (studentsQuery.data?.users?.length > 0) {
      const studentsList = studentsQuery.data.users;
      setStudents(studentsList);

      // Initialize attendance map efficiently
      const initialAttendance = {};
      studentsList.forEach((student) => {
        const leaveInfo = studentLeaveStatus[student._id];
        // If student is on leave and hasn't arrived, mark as absent
        if (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived) {
          initialAttendance[student._id] = false;
        } else {
          initialAttendance[student._id] = true; // Default to present
        }
      });

      // Only set attendance if we don't have existing attendance data
      if (Object.keys(attendance).length === 0) {
        setAttendance(initialAttendance);
      }
    }
  }, [studentsQuery.data, studentLeaveStatus, attendance]);

  // Process attendance data with optimized update
  useEffect(() => {
    if (attendanceQuery.data?.attendances?.length > 0) {
      const attendanceRecord = attendanceQuery.data.attendances[0];
      setAttendanceExists(true);
      setExistingAttendanceId(attendanceRecord._id);

      // Only update attendance if we have attendance data
      if (attendanceRecord.attendanceData?.length > 0) {
        const existingAttendance = {};

        // Build attendance map more efficiently
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

  // Set loading state based on all query states
  useEffect(() => {
    if (
      classQuery.isLoading ||
      periodQuery.isLoading ||
      studentsQuery.isLoading ||
      attendanceQuery.isLoading ||
      leaveRecordsQuery.isLoading
    ) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [
    classQuery.isLoading,
    periodQuery.isLoading,
    studentsQuery.isLoading,
    attendanceQuery.isLoading,
    leaveRecordsQuery.isLoading,
  ]);

  // Memoize absentee data processing for better performance
  const absenteeData = useMemo(() => {
    if (
      !historicalAttendanceQuery.data?.attendances?.absenteeTracking ||
      !students.length
    ) {
      return [];
    }

    const rawAbsenteeData =
      historicalAttendanceQuery.data.attendances.absenteeTracking;

    // Calculate yesterday's date
    const yesterday = new Date(attendanceDate);
    yesterday.setDate(yesterday.getDate() - 1);

    // Filter for yesterday's absences
    return rawAbsenteeData;
  }, [historicalAttendanceQuery.data, students, attendanceDate]);

  // Memoize attendance toggle handler
  const toggleAttendance = useCallback((studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }, []);

  // Memoize stats calculation for better performance
  const stats = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendance).filter((status) => status).length;
    const absent = total - present;
    const presentPercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPercentage = total > 0 ? Math.round((absent / total) * 100) : 0;

    return { total, present, absent, presentPercentage, absentPercentage };
  }, [students.length, attendance]);

  // Memoize absentee info lookup function
  const getStudentAbsenteeInfo = useCallback(
    (studentId) => {
      return absenteeData.find((student) => student.studentId === studentId);
    },
    [absenteeData]
  );

  // Function to determine row styling based on student status
  const getRowStyling = useCallback(
    (studentId, isPresent) => {
      const leaveInfo = studentLeaveStatus[studentId];

      if (isPresent) {
        return {
          className: "hover:bg-muted/50",
          textColor: "",
        };
      }

      // Student is absent
      if (leaveInfo?.isOnLeave) {
        if (!leaveInfo.hasArrived) {
          // Student on leave and hasn't arrived back yet
          return {
            className:
              "bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800",
            textColor: "text-red-900 dark:text-red-100",
          };
        } else {
          // Student on leave but has arrived back
          return {
            className:
              "bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900",
            textColor: "text-orange-900 dark:text-orange-100",
          };
        }
      } else {
        // Regular absent student
        return {
          className:
            "bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900",
          textColor: "text-rose-900 dark:text-rose-100",
        };
      }
    },
    [studentLeaveStatus]
  );

  // Optimize save attendance function
  const handleSaveAttendance = useCallback(async () => {
    if (saving) return;

    try {
      setSaving(true);

      // Format attendance data more efficiently
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
          data: {
            _id: existingAttendanceId,
            ...payload,
          },
        });
        toast.success("Attendance updated successfully!");
      } else {
        await createAttendance.mutateAsync(payload);
        toast.success("Attendance recorded successfully!");
        setAttendanceExists(true);
      }

      // Use a single function to handle redirect
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

  // Optimize delete attendance function
  const handleDeleteAttendance = useCallback(async () => {
    if (saving || !attendanceExists || !existingAttendanceId) return;

    try {
      setSaving(true);
      await deleteAttendance.mutateAsync([existingAttendanceId]);
      toast.success("Attendance reset successfully!");
      setAttendanceExists(false);
      setExistingAttendanceId(null);

      // Reset attendance based on leave status
      const resetAttendance = {};
      students.forEach((student) => {
        const leaveInfo = studentLeaveStatus[student._id];
        if (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived) {
          resetAttendance[student._id] = false;
        } else {
          resetAttendance[student._id] = true;
        }
      });
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Header
          title="ATTENDANCE MANAGEMENT"
          subTitle={`Mark Attendance For ${classDetails?.name} - 
                ${subjectName}`}
        />
      </div>
      <div className="p-4 border border-border space-y-4 rounded-md">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Info Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
                      stats.presentPercentage > 80 ? "success" : "destructive"
                    }
                  >
                    {stats.present}/{stats.total} Present (
                    {stats.presentPercentage}%)
                  </Badge>
                  <Badge
                    variant={
                      stats.absentPercentage < 20 ? "success" : "destructive"
                    }
                  >
                    {stats.absent}/{stats.total} Absent (
                    {stats.absentPercentage}%)
                  </Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Students Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-415px)] md:max-h-[calc(100vh-339px)] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">R.no</TableHead>
              <TableHead>Students</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student, index) => {
                const absenteeInfo = getStudentAbsenteeInfo(student._id);
                const hasAbsenceHistory =
                  absenteeInfo && absenteeInfo.continuousAbsences > 0;
                const isPresent = attendance[student._id];
                const rowStyling = getRowStyling(student._id, isPresent);
                const leaveInfo = studentLeaveStatus[student._id];

                return (
                  <TableRow
                    key={student._id}
                    className={rowStyling.className}
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
                            className={`font-medium text-xs whitespace-nowrap ${rowStyling.textColor}`}
                          >
                            {student.name}
                          </p>
                          <p
                            className={`text-xs ${
                              rowStyling.textColor
                                ? `${rowStyling.textColor.includes("dark:") ? rowStyling.textColor.replace("dark:text-red-100", "dark:text-red-200").replace("dark:text-rose-100", "dark:text-rose-200").replace("dark:text-orange-100", "dark:text-orange-200") : rowStyling.textColor.replace("text-red-900", "text-red-700").replace("text-rose-900", "text-rose-700").replace("text-orange-900", "text-orange-700")}`
                                : "text-muted-foreground"
                            }`}
                          >
                            {student._id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {leaveInfo?.isOnLeave ? (
                        <div className="space-y-1">
                          <Badge
                            variant={
                              leaveInfo.hasArrived ? "secondary" : "destructive"
                            }
                            className="text-xs"
                          >
                            {leaveInfo.hasArrived ? "Arrived" : "Leave"}
                          </Badge>
                          <div
                            className={`text-xs ${
                              rowStyling.textColor
                                ? `${rowStyling.textColor.includes("dark:") ? rowStyling.textColor.replace("dark:text-red-100", "dark:text-red-200").replace("dark:text-rose-100", "dark:text-rose-200").replace("dark:text-orange-100", "dark:text-orange-200") : rowStyling.textColor.replace("text-red-900", "text-red-700").replace("text-rose-900", "text-rose-700").replace("text-orange-900", "text-orange-700")}`
                                : "text-muted-foreground"
                            }`}
                          >
                            {leaveInfo.leaveReason}
                          </div>
                        </div>
                      ) : (
                        <Badge
                          variant={isPresent ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {isPresent ? "Present" : "Absent"}
                        </Badge>
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
      <div className="flex justify-between">
        <Button
          onClick={handleDeleteAttendance}
          disabled={!attendanceExists || saving || loading}
        >
          {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Reset
        </Button>
        <Button
          onClick={handleSaveAttendance}
          disabled={saving || loading || !students.length}
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
