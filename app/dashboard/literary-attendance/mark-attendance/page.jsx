"use client";

import { formatDateForDisplay } from "@/lib/utils";
import Header from "@/components/Header";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useCrud from "@/hooks/use-crud";
import { useSearchParams } from "next/navigation";
import { Calendar, Clock, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import AbsenteeStatus from "@/components/AbsenteeStatus";

const LiteraryAttendance = () => {
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const searchParams = useSearchParams();

  const queryParams = useMemo(
    () => ({
      classId: searchParams.get("classId"),
      className: searchParams.get("className"),
      groupName: searchParams.get("groupName"),
      batchId: searchParams.get("batchId"),
      groupId: searchParams.get("groupId"),
      date: searchParams.get("date"),
      apiKey: searchParams.get("apiKey"),
      category: searchParams.get("category"),
      day: searchParams.get("day"),
    }),
    [searchParams]
  );

  const {
    useFetchItems: useFetchAttendance,
    useAddItem: useSaveAttendance,
    useUpdateItem: useUpdateAttendance,
    useDeleteItem: useDeleteAttendance,
  } = useCrud("literary/attendances", queryParams.apiKey);

  const { useFetchItems: useFetchStudents } = useCrud(
    "users",
    queryParams.apiKey
  );
  const { useFetchItems: useFetchAbsentees } = useCrud(
    "literary/attendances",
    queryParams.apiKey
  );

  const { useFetchItems: useFetchParticipants } = useCrud(
    "literary/groups",
    queryParams.apiKey
  );

  const saveAttendance = useSaveAttendance();
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();

  const attendanceQuery = useFetchAttendance(0, 0, {
    date: queryParams.date,
    classId: queryParams.classId ? queryParams.classId : undefined,
    batchId: queryParams.batchId ? queryParams.batchId : undefined,
    groupId: queryParams.groupId ? queryParams.groupId : undefined,
    category: queryParams.category,
    day: queryParams.day,
  });
  const absenteesQuery = useFetchAbsentees(0, 0, {
    classId: queryParams.classId ? queryParams.classId : undefined,
    batchId: queryParams.batchId ? queryParams.batchId : undefined,
    groupId: queryParams.groupId ? queryParams.groupId : undefined,
    category: queryParams.category,
    trackAbsentees: true,
  });

  const attendanceData = useMemo(() => {
    return attendanceQuery.data?.attendances || [];
  }, [attendanceQuery.data]);

  const previousAbsentees = useMemo(() => {
    return absenteesQuery.data?.absentees || [];
  });

  const getStudentAbsenteeInfo = useCallback(
    (studentId) => {
      return previousAbsentees.find(
        (student) => student.studentId === studentId
      );
    },
    [previousAbsentees]
  );

  const studentsQuery = useFetchStudents(
    0,
    0,
    {
      classId: queryParams.classId,
      roles: "Student",
      status: "Active",
    },
    {
      enabled: queryParams.category === "ALL",
      refetchOnWindowFocus: true,
    }
  );

  const participantsQuery = useFetchParticipants(
    0,
    0,
    {
      _id: queryParams.groupId,
    },
    {
      enabled: !!queryParams.groupId,
      refetchOnWindowFocus: true,
    }
  );

  const groupLeaderId = useMemo(() => {
    return participantsQuery.data?.groups[0]?.leaderId;
  }, [participantsQuery.data]);

  const groupAssistantLeaderId = useMemo(() => {
    return participantsQuery.data?.groups[0]?.assistantLeaderId;
  }, [participantsQuery.data]);

  const students = useMemo(() => {
    if (queryParams.groupId) {
      return (
        participantsQuery.data?.groups[0]?.studentsDetails?.sort((a, b) => {
          if (groupLeaderId === a._id) {
            return -1;
          }
          if (groupLeaderId === b._id) {
            return 1;
          }
          if (groupAssistantLeaderId === a._id) {
            return -1;
          }
          if (groupAssistantLeaderId === b._id) {
            return 1;
          }
          return b.classId.localeCompare(a.classId);
        }) || []
      );
    }
    return studentsQuery.data?.users || [];
  }, [studentsQuery.data, participantsQuery.data]);

  useEffect(() => {
    if (studentsQuery.isLoading || attendanceQuery.isLoading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [studentsQuery.isLoading, attendanceQuery.isLoading]);

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

  const toggleAttendance = useCallback((studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }, []);

  const formattedDate = useMemo(() => {
    return formatDateForDisplay(queryParams.date);
  }, [queryParams.date]);

  const stats = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendance).filter((status) => status).length;
    const absent = total - present;
    const presentPercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPercentage = total > 0 ? Math.round((absent / total) * 100) : 0;

    return { total, present, absent, presentPercentage, absentPercentage };
  }, [students.length, attendance]);

  const attendanceExists = useMemo(() => {
    if (!!queryParams.groupId) {
      return attendanceData.some(
        (att) =>
          att.groupId === queryParams.groupId &&
          att.date === queryParams.date &&
          att.category === queryParams.category &&
          att.day === queryParams.day
      );
    }
    return attendanceData.some(
      (att) =>
        att.classId === queryParams.classId &&
        att.date === queryParams.date &&
        att.category === queryParams.category &&
        att.day === queryParams.day
    );
  }, [attendanceData]);

  const existingAttendance = useMemo(() => {
    if (!!queryParams.groupId) {
      return attendanceData.find(
        (att) =>
          att.groupId === queryParams.groupId &&
          att.date === queryParams.date &&
          att.category === queryParams.category &&
          att.day === queryParams.day
      );
    }

    return attendanceData.find(
      (att) =>
        att.classId === queryParams.classId &&
        att.date === queryParams.date &&
        att.category === queryParams.category &&
        att.day === queryParams.day
    );
  }, [
    attendanceData,
    queryParams.classId,
    queryParams.date,
    queryParams.category,
    queryParams.day,
  ]);

  useEffect(() => {
    if (existingAttendance) {
      const initialAttendance = {};
      existingAttendance.attendanceData.forEach((data) => {
        initialAttendance[data.studentId] = data.present;
      });
      setAttendance(initialAttendance);
    }
  }, [attendanceData, queryParams]);

  const handleSaveAttendance = useCallback(async () => {
    setSaving(true);
    try {
      const attendancePayload = {
        date: queryParams.date,
        classId: queryParams.classId ? queryParams.classId : undefined,
        batchId: queryParams.batchId ? queryParams.batchId : undefined,
        groupId: queryParams.groupId ? queryParams.groupId : undefined,
        category: queryParams.category,
        day: queryParams.day,
        attendanceData: Object.entries(attendance).map(
          ([studentId, present]) => ({
            studentId,
            present,
          })
        ),
      };

      if (attendanceExists) {
        await updateAttendance.mutateAsync({
          data: {
            _id: existingAttendance._id,
            attendanceData: attendancePayload.attendanceData,
          },
        });
      } else {
        await saveAttendance.mutateAsync(attendancePayload);
      }
      router.back();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(
        `Error ${attendanceExists ? "updating" : "saving"} attendance.`
      );
    } finally {
      setSaving(false);
    }
  }, [attendance, attendanceExists]);
  const handleDeleteAttendance = useCallback(async () => {
    setSaving(true);
    try {
      if (!attendanceExists) {
        toast.error("No attendance record to delete.");
        return;
      }
      await deleteAttendance.mutateAsync({
        data: { ids: [existingAttendance?._id] },
      });
      setAttendance({});
      toast.success("Attendance record deleted successfully.");
      router.refresh();
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast.error("Error deleting attendance record.");
    } finally {
      setSaving(false);
    }
  }, [attendanceData]);

  return (
    <div className="space-y-3">
      <Header title="ATTENDANCE" subTitle="Mark Literary Attendance" />
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <>
          {/* Header & Metadata */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
            <div className="flex items-center gap-4 text-muted-foreground px-3 md:px-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{formattedDate}</span>
              </div>
              <div className="h-4 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {queryParams.category === "ALL"
                    ? `Class: ${queryParams.className}`
                    : `Group: ${queryParams.groupName}`}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="border border-border rounded-lg p-2 md:p-4 bg-card/30 mb-4">
            <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
                  Total
                </span>
                <div className="w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center">
                  {stats.total}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 md:gap-2">
                <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
                  Present
                </span>
                <div className="w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center text-green-600 dark:text-green-400">
                  {stats.present}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 md:gap-2">
                <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
                  Absent
                </span>
                <div className="w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg bg-red-500 text-white text-base md:text-xl font-bold shadow-sm flex items-center justify-center">
                  {stats.absent}
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[calc(100vh-445px)] md:max-h-[calc(100vh-393px)] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sl.no</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead></TableHead>
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
                                {student.name.substring(0, 1)} { }
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-xs">
                                {student.name}{" "}
                                {(!!queryParams.groupId &&
                                  groupLeaderId === student._id &&
                                  "(Leader)") ||
                                  (!!queryParams.groupId &&
                                    groupAssistantLeaderId === student._id &&
                                    "(Assistant Leader)") ||
                                  ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {student._id} {student?.className}
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
        </>
      )}
    </div>
  );
};

export default LiteraryAttendance;
