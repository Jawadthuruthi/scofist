"use client";

import { formatDateForDisplay } from "@/lib/utils";
import Header from "@/components/Header";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
import { Calendar, Clock, Loader, User, UserCheck, CheckCircle2, X, Check, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import AbsenteeStatus from "@/components/AbsenteeStatus";

const LiteraryAttendance = () => {
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
      day: searchParams.get("day"),
      category: searchParams.get("category"),
      apiKey: searchParams.get("apiKey"),
      sessionLabel: searchParams.get("sessionLabel"),
    }),
    [searchParams]
  );

  const successPopupRef = useRef(null);
  const { handleDownload: handleSuccessDownload } = useDownloadPopup(
    successPopupRef,
    `Literary_Attendance_${(queryParams.className || queryParams.groupName || "Attendance").replace(/\s+/g, '_')}_${(queryParams.date || "").replace(/\s+/g, '_')}.jpeg`
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

  const { useFetchItems: useFetchAllGroups } = useCrud(
    "literary/groups",
    queryParams.apiKey
  );

  const { useFetchItems: useFetchLeaveRecords } = useCrud(
    "leave-records",
    queryParams.apiKey
  );

  const saveAttendance = useSaveAttendance();
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();

  const leaveRecordsQuery = useFetchLeaveRecords(
    0,
    0,
    {
      classId: queryParams.classId ? queryParams.classId : undefined,
      projection: "studentId,dateOfLeave,arrivedDate",
    },
    {
      refetchOnWindowFocus: true,
    }
  );

  const attendanceQuery = useFetchAttendance(0, 0, {
    date: queryParams.date,
    classId: queryParams.classId ? queryParams.classId : undefined,
    groupId: queryParams.groupId ? queryParams.groupId : undefined,
    category: queryParams.category,
    day: queryParams.day,
  });
  const absenteesQuery = useFetchAbsentees(0, 0, {
    classId: queryParams.classId ? queryParams.classId : undefined,
    groupId: queryParams.groupId ? queryParams.groupId : undefined,
    category: queryParams.category,
    trackAbsentees: true,
  });

  const attendanceData = useMemo(() => {
    return attendanceQuery.data?.attendances || [];
  }, [attendanceQuery.data]);

  const previousAbsentees = useMemo(() => {
    return absenteesQuery.data?.absentees || [];
  }, [absenteesQuery.data]);

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
      enabled: !!queryParams.classId,
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

  const allGroupsQuery = useFetchAllGroups(
    0,
    0,
    {},
    {
      enabled: !!queryParams.classId,
      refetchOnWindowFocus: true,
    }
  );

  const studentToGroupMap = useMemo(() => {
    if (!allGroupsQuery.data?.groups) return {};
    const map = {};
    allGroupsQuery.data.groups.forEach((group) => {
      group.studentsId.forEach((studentId) => {
        map[studentId] = {
          groupName: group.name,
          leaderName: group.leaderName.split(" (")[0],
          isLeader: false,
          isAssistantLeader: false,
        };
      });
      if (group.leaderId) {
        map[group.leaderId] = {
          ...map[group.leaderId],
          groupName: group.name,
          isLeader: true,
        };
      }
      if (group.assistantLeaderId) {
        map[group.assistantLeaderId] = {
          ...map[group.assistantLeaderId],
          groupName: group.name,
          isAssistantLeader: true,
        };
      }
    });
    return map;
  }, [allGroupsQuery.data]);

  const groupLeaderId = useMemo(() => {
    return participantsQuery.data?.groups[0]?.leaderId;
  }, [participantsQuery.data]);

  const groupAssistantLeaderId = useMemo(() => {
    return participantsQuery.data?.groups[0]?.assistantLeaderId;
  }, [participantsQuery.data]);

  const groupLeaderName = useMemo(() => {
    return participantsQuery.data?.groups[0]?.leaderName;
  }, [participantsQuery.data]);

  const groupAssistantLeaderName = useMemo(() => {
    return participantsQuery.data?.groups[0]?.assistantLeaderName;
  }, [participantsQuery.data]);

  const studentsOnLeave = useMemo(() => {
    if (!leaveRecordsQuery.data?.["leave-records"]) return {};

    const onLeaveMap = {};
    if (!queryParams.date) return onLeaveMap;

    const attendanceDate = new Date(queryParams.date);
    attendanceDate.setHours(0, 0, 0, 0);

    leaveRecordsQuery.data["leave-records"].forEach((record) => {
      if (!record.studentId) return;

      const studentId = record.studentId._id || record.studentId;
      const leaveDate = new Date(record.dateOfLeave);
      leaveDate.setHours(0, 0, 0, 0);

      if (leaveDate <= attendanceDate) {
        if (!record.arrivedDate) {
          onLeaveMap[studentId] = true;
        } else {
          const arrivedDate = new Date(record.arrivedDate);
          arrivedDate.setHours(0, 0, 0, 0);
          if (arrivedDate > attendanceDate) {
            onLeaveMap[studentId] = true;
          }
        }
      }
    });

    return onLeaveMap;
  }, [leaveRecordsQuery.data, queryParams.date]);

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
  }, [studentsQuery.data, participantsQuery.data, groupLeaderId, groupAssistantLeaderId]);

  useEffect(() => {
    if (studentsQuery.isLoading || attendanceQuery.isLoading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [studentsQuery.isLoading, attendanceQuery.isLoading]);

  useEffect(() => {
    if (leaveRecordsQuery.isLoading || studentsQuery.isLoading) return;

    if (students?.length > 0) {
      if (Object.keys(attendance).length === 0) {
        const initialAttendance = {};
        students.forEach((student) => {
          const isOnLeave = studentsOnLeave[student._id];
          initialAttendance[student._id] = !isOnLeave;
        });
        setAttendance(initialAttendance);
      }
    }
  }, [students, attendance, studentsOnLeave, leaveRecordsQuery.isLoading, studentsQuery.isLoading]);

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
    return { total, present, absent };
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
        setSuccessMessage("Attendance updated successfully.");
        setShowSuccessDialog(true);
        setTimeout(
          () => (window.location.href = "/dashboard/literary-attendance"),
          2000
        );
      } else {
        await saveAttendance.mutateAsync(attendancePayload);
        setSuccessMessage("Attendance marked successfully.");
        setShowSuccessDialog(true);
        setTimeout(
          () => (window.location.href = "/dashboard/literary-attendance"),
          2000
        );
      }
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
      const idsToDelete = attendanceData?.map((a) => a._id) || [
        existingAttendance?._id,
      ];
      await deleteAttendance.mutateAsync({
        data: { ids: idsToDelete },
      });
      setAttendance({});
      setSuccessMessage("Attendance record reset successfully.");
      setShowSuccessDialog(true);
      setTimeout(
        () => (window.location.href = "/dashboard/literary-attendance"),
        2000
      );
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
                  {queryParams.category === "ALL" || queryParams.category === "GROUP"
                    ? queryParams.category === "ALL"
                      ? `Class: ${queryParams.className}`
                      : `Group: ${queryParams.groupName}`
                    : `${queryParams.sessionLabel || queryParams.category} – ${queryParams.className || queryParams.groupName}`}
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
          <div className="overflow-x-auto max-h-[calc(100vh-385px)] md:max-h-[calc(100vh-333px)] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Sl.no</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student, index) => {
                    const absenteeInfo = getStudentAbsenteeInfo(student._id);
                    const hasAbsenceHistory = absenteeInfo && absenteeInfo.continuousAbsences > 0;
                    const isOnLeave = studentsOnLeave[student._id];
                    const isPresent = attendance[student._id];

                    let rowClass = "hover:bg-transparent";
                    if (isPresent) {
                      rowClass = "cursor-pointer";
                    } else {
                      // Unified color for Absent and On Leave students
                      rowClass = "bg-rose-300 dark:bg-rose-700 hover:bg-rose-300 dark:hover:bg-rose-700 cursor-pointer text-foreground";
                    }

                    return (
                      <TableRow
                        key={student._id}
                        className={rowClass}
                        onClick={() => toggleAttendance(student._id)}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col justify-center">
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
                                  {queryParams.category === "ALL" &&
                                    studentToGroupMap[student._id] &&
                                    ` | ${studentToGroupMap[student._id].groupName}`}
                                </p>
                              </div>
                              {isOnLeave && (
                                <div className="mt-1">
                                  <Badge variant="outline" className="h-4 text-[10px] px-1 bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500 dark:border-yellow-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    On Leave
                                  </Badge>
                                </div>
                              )}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent
          ref={successPopupRef}
          data-html2canvas-popup="true"
          className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md [&>button.absolute]:hidden flex flex-col p-0 gap-0"
        >
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <button 
              type="button"
              className={`p-2 rounded-lg transition-colors focus:outline-none cursor-pointer ${
                successMessage?.toLowerCase().includes("reset")
                  ? "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                  : "bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
              }`}
              onClick={handleSuccessDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <CheckCircle2 className={`h-5 w-5 ${
                successMessage?.toLowerCase().includes("reset")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`} />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className={`text-xl font-bold m-0 ${
                successMessage?.toLowerCase().includes("reset")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {successMessage?.toLowerCase().includes("reset")
                  ? "Attendance Reset"
                  : successMessage?.toLowerCase().includes("updat")
                  ? "Attendance Updated"
                  : "Attendance Saved"}
              </DialogTitle>
              <DialogDescription className="m-0 text-xs text-muted-foreground">
                {successMessage || (successMessage?.toLowerCase().includes("reset") ? "Attendance records have been reset." : "Attendance marked and saved successfully.")}
              </DialogDescription>
            </div>
            <DialogClose 
              className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" 
              data-html2canvas-ignore="true"
              onClick={() => {
                setShowSuccessDialog(false);
                window.location.href = "/dashboard/literary-attendance";
              }}
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="p-5 space-y-4 bg-muted/5 flex-1">
            {/* Overview Card */}
            <div className="bg-card border rounded-xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base text-foreground">
                  {queryParams.className || queryParams.groupName || "Literary Attendance"}
                </span>
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20 font-medium">
                  {queryParams.sessionLabel || queryParams.category || "Literary"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-muted-foreground">
                <span>{queryParams.date ? formatDateForDisplay(new Date(queryParams.date)) : formatDateForDisplay(new Date())}</span>
              </div>
            </div>

            {/* Metrics Summary Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-card shadow-sm">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xl font-bold text-foreground mt-0.5">
                  {stats.total}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Present
                </span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {stats.present}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 shadow-sm">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Absent
                </span>
                <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {stats.absent}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiteraryAttendance;
