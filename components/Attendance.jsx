"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatDate } from "@/lib/utils";
import Header from "./Header";

const AttendancePage = ({ token, teacherId }) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get query parameters
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");
  const periodNumber = searchParams.get("periodNumber");
  const day = searchParams.get("day");

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classDetails, setClassDetails] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [periodDetails, setPeriodDetails] = useState(null);
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(formatDate(new Date()));

  // CRUD hooks
  const { useFetchItems: useFetchUsers } = useCrud("users", token);
  const { useFetchItems: useFetchClass } = useCrud("classes", token);
  const { useFetchItems: useFetchSubject } = useCrud("subjects", token);
  const { useFetchItems: useFetchPeriod } = useCrud("periods", token);
  const {
    useFetchItems: useFetchAttendance,
    useAddItem: useCreateAttendance,
    useUpdateItem: useUpdateAttendance,
  } = useCrud("attendances", token);

  // Fetch data queries
  const classQuery = useFetchClass(null, null, { _id: classId });
  const subjectQuery = useFetchSubject(null, null, { _id: subjectId });
  const periodQuery = useFetchPeriod(null, null, { periodNumber });
  const studentsQuery = useFetchUsers(null, null, {
    role: "Student",
    classId: classId,
  });
  const attendanceQuery = useFetchAttendance(null, null, {
    classId,
    subjectId,
    periodNumber: parseInt(periodNumber),
    date: attendanceDate,
  });

  // Create/Update mutations
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();

  // Process fetched data
  useEffect(() => {
    if (classQuery.data?.classes[0]) {
      setClassDetails(classQuery.data.classes[0]);
    }

    if (subjectQuery.data?.subjects[0]) {
      setSubjectDetails(subjectQuery.data.subjects[0]);
    }

    if (periodQuery.data?.periods[0]) {
      setPeriodDetails(periodQuery.data.periods[0]);
    }

    if (studentsQuery.data?.users) {
      setStudents(studentsQuery.data.users);
    }

    // Set up initial attendance state when students are loaded
    if (studentsQuery.data?.users && studentsQuery.data.users.length > 0) {
      const initialAttendance = {};
      studentsQuery.data.users.forEach((student) => {
        initialAttendance[student._id] = true; // Default to present
      });
      setAttendance(initialAttendance);
    }

    if (
      attendanceQuery.data?.attendances &&
      attendanceQuery.data.attendances.length > 0
    ) {
      setAttendanceExists(true);
      const existingAttendance = {};

      // Get the first attendance record
      const attendanceRecord = attendanceQuery.data.attendances[0];

      // Set up attendance state based on existing data
      if (
        attendanceRecord.attendanceData &&
        attendanceRecord.attendanceData.length > 0
      ) {
        attendanceRecord.attendanceData.forEach((item) => {
          existingAttendance[item.studentId._id] = item.present;
        });
        setAttendance(existingAttendance);
      }
    }

    // Check if all data is loaded
    if (
      classQuery.data &&
      subjectQuery.data &&
      periodQuery.data &&
      studentsQuery.data &&
      attendanceQuery.data
    ) {
      setLoading(false);
    }
  }, [
    classQuery.data,
    subjectQuery.data,
    periodQuery.data,
    studentsQuery.data,
    attendanceQuery.data,
  ]);

  // Handle attendance change
  const toggleAttendance = (studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendance).filter((status) => status).length;
    const absent = total - present;
    const presentPercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, presentPercentage };
  }, [students, attendance]);

  // Save attendance
  const handleSaveAttendance = async () => {
    try {
      setSaving(true);

      // Format attendance data
      const attendanceData = students.map((student) => ({
        studentId: student._id,
        present: attendance[student._id] || false,
      }));

      const payload = {
        classId,
        subjectId,
        teacherId,
        periodNumber: parseInt(periodNumber),
        day,
        date: attendanceDate,
        attendanceData,
      };

      if (attendanceExists) {
        // Get the ID of the existing attendance record
        const existingAttendanceId = attendanceQuery.data.attendances[0]._id;
        await updateAttendance.mutateAsync({
          data: {
            _id: existingAttendanceId,
            ...payload,
          },
        });
        toast.success("Attendance updated successfully");
      } else {
        await createAttendance.mutateAsync({
          ...payload,
        });
        toast.success("Attendance recorded successfully");
        setAttendanceExists(true);
      }

      // Refresh attendance data
      attendanceQuery.refetch();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(`Failed to save attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Set all present
  const setAllPresent = () => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student._id] = true;
    });
    setAttendance(newAttendance);
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <Header
              title="Attendance Management"
              subTitle={`Mark attendance for ${classDetails?.name} - 
                ${subjectDetails?.name}`}
            />
          </div>
        </div>
        <div className="p-4 border border-border space-y-4 rounded-md">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Info Bar */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {day}, {attendanceDate}
                    </span>
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
                    <Button variant="outline" size="sm" onClick={setAllPresent}>
                      Mark All Present
                    </Button>
                  </div>
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Roll No.</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length > 0 ? (
                      students.map((student, index) => (
                        <TableRow
                          key={student._id}
                          className="hover:bg-accent/50"
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
                                <p className="font-medium text-sm">
                                  {student.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {student._id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-4">
                              <div className="flex items-center gap-2">
                                {attendance[student._id] ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                                <span className="text-sm font-medium">
                                  {attendance[student._id]
                                    ? "Present"
                                    : "Absent"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
            </>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAttendance}
              disabled={saving || loading || !students.length}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {attendanceExists ? "Update Attendance" : "Save Attendance"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
