"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Calendar, Clock } from "lucide-react";

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

  const today = useMemo(() => formatDateForDisplay(new Date()), []);

  // CRUD hooks with optimized options
  const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
  const { useFetchItems: useFetchClass } = useCrud("classes", apiKey);
  const { useFetchItems: useFetchPeriod } = useCrud("periods", apiKey);
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
        initialAttendance[student._id] = true; // Default to present
      });

      // Only set attendance if we don't have existing attendance data
      if (Object.keys(attendance).length === 0) {
        setAttendance(initialAttendance);
      }
    }
  }, [studentsQuery.data, attendance]);

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
      attendanceQuery.isLoading
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

      // Reset attendance to all present
      const resetAttendance = {};
      students.forEach((student) => {
        resetAttendance[student._id] = true;
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
            <Loader2 className="h-8 w-8 animate-spin" />
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
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student, index) => {
                const absenteeInfo = getStudentAbsenteeInfo(student._id);
                const hasAbsenceHistory =
                  absenteeInfo && absenteeInfo.continuousAbsences > 0;

                return (
                  <TableRow
                    key={student._id}
                    className={
                      attendance[student._id]
                        ? ""
                        : "bg-rose-300 dark:bg-rose-700 hover:bg-rose-300 dark:hover:bg-rose-700"
                    }
                    onClick={() => toggleAttendance(student._id)}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.profilePic?.url} />
                          <AvatarFallback>
                            {student.name.substring(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-xs whitespace-nowrap">
                            {student.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student._id}
                          </p>
                        </div>
                      </div>
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
                <TableCell colSpan={3} className="text-center py-8">
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
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reset
        </Button>
        <Button
          onClick={handleSaveAttendance}
          disabled={saving || loading || !students.length}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {attendanceExists ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default Attendance;
