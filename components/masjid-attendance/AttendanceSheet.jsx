"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader, Save, ArrowLeft } from "lucide-react";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const AttendanceSheet = ({
    classId,
    className,
    batchId,
    prayer,
    date,
    apiKey,
    user,
}) => {
    const router = useRouter();
    const [attendance, setAttendance] = useState({});
    const [saving, setSaving] = useState(false);
    const [existingRecordId, setExistingRecordId] = useState(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Fetch students
    const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
    const studentsQuery = useFetchStudents(
        0,
        0,
        {
            classId,
            roles: "Student",
            status: "Active",
        },
        {
            staleTime: 1000 * 60 * 10,
        }
    );

    const students = useMemo(
        () => studentsQuery.data?.users || [],
        [studentsQuery.data]
    );

    // Fetch existing attendance
    const {
        useFetchItems: useFetchAttendance,
        useAddItem: useSaveAttendance,
        useUpdateItem: useUpdateAttendance,
        useDeleteItem: useDeleteAttendance,
    } = useCrud("masjid/attendance", apiKey);

    const attendanceQuery = useFetchAttendance(
        0,
        0,
        {
            date,
            prayer,
            classId,
        },
        {
            refetchOnMount: true,
        }
    );

    useEffect(() => {
        if (attendanceQuery.data?.attendances?.length > 0) {
            const record = attendanceQuery.data.attendances[0];
            setExistingRecordId(record._id);

            const initialAttendance = {};
            record.attendanceData.forEach((item) => {
                initialAttendance[item.studentId._id || item.studentId] =
                    item.status === "PRESENT";
            });
            setAttendance(initialAttendance);
        } else if (students.length > 0 && Object.keys(attendance).length === 0) {
            // Initialize with all present if no record exists
            const initialAttendance = {};
            students.forEach((student) => {
                initialAttendance[student._id] = true;
            });
            setAttendance(initialAttendance);
        }
    }, [attendanceQuery.data, students]);

    const toggleAttendance = (studentId) => {
        setAttendance((prev) => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    };

    const saveAttendance = useSaveAttendance();
    const updateAttendance = useUpdateAttendance();
    const deleteAttendance = useDeleteAttendance();

    const handleSave = async () => {
        setSaving(true);
        try {
            const attendanceData = Object.entries(attendance).map(
                ([studentId, isPresent]) => ({
                    studentId,
                    status: isPresent ? "PRESENT" : "ABSENT",
                })
            );

            const payload = {
                date,
                day: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
                prayer,
                classId,
                batchId,
                markedBy: user._id,
                attendanceData,
            };

            await saveAttendance.mutateAsync(payload);
            toast.success("Attendance saved successfully");
            router.back();
        } catch (error) {
            console.error("Error saving attendance:", error);
            toast.error("Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!existingRecordId) return;

        setSaving(true);
        try {
            await deleteAttendance.mutateAsync({ data: { ids: [existingRecordId] } });
            toast.success("Attendance reset successfully");
            setResetDialogOpen(false);
            router.back();
        } catch (error) {
            console.error("Error resetting attendance:", error);
            toast.error("Failed to reset attendance");
        } finally {
            setSaving(false);
        }
    };

    const stats = useMemo(() => {
        const total = students.length;
        const present = Object.values(attendance).filter(Boolean).length;
        const absent = total - present;
        return { total, present, absent };
    }, [students, attendance]);

    if (studentsQuery.isLoading || attendanceQuery.isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                            Mark Attendance
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {prayer} - {className}
                        </p>
                    </div>
                </div>
                <div className="hidden md:block ml-auto text-sm text-muted-foreground border px-3 py-1 rounded-md">
                    {date}
                </div>
            </div>

            {/* Stats Card - Sticky on Mobile */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:static md:bg-transparent md:p-0 md:mx-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-card p-4 rounded-lg border shadow-sm gap-4">
                    <div className="flex w-full md:w-auto justify-between md:justify-start gap-2 md:gap-4">
                        <div className="flex flex-col items-center md:flex-row md:gap-2">
                            <span className="text-xs text-muted-foreground uppercase font-bold md:hidden">
                                Total
                            </span>
                            <Badge variant="outline" className="text-sm md:text-base py-1 px-3">
                                <span className="hidden md:inline mr-1">Total:</span>
                                {stats.total}
                            </Badge>
                        </div>
                        <div className="flex flex-col items-center md:flex-row md:gap-2">
                            <span className="text-xs text-muted-foreground uppercase font-bold md:hidden">
                                Present
                            </span>
                            <Badge variant="success" className="text-sm md:text-base py-1 px-3">
                                <span className="hidden md:inline mr-1">Present:</span>
                                {stats.present}
                            </Badge>
                        </div>
                        <div className="flex flex-col items-center md:flex-row md:gap-2">
                            <span className="text-xs text-muted-foreground uppercase font-bold md:hidden">
                                Absent
                            </span>
                            <Badge
                                variant="destructive"
                                className="text-sm md:text-base py-1 px-3"
                            >
                                <span className="hidden md:inline mr-1">Absent:</span>
                                {stats.absent}
                            </Badge>
                        </div>
                    </div>

                    <div className="hidden md:flex gap-2">
                        {existingRecordId && (
                            <Button
                                variant="destructive"
                                onClick={() => setResetDialogOpen(true)}
                                disabled={saving}
                            >
                                Reset
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            {existingRecordId ? "Update" : "Save"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="w-[100px] text-right md:text-left">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student, index) => {
                            const isPresent = attendance[student._id];
                            return (
                                <TableRow
                                    key={student._id}
                                    className={`cursor-pointer ${!isPresent
                                        ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        : "hover:bg-transparent"
                                        }`}
                                    onClick={() => toggleAttendance(student._id)}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 hidden sm:block">
                                                <AvatarImage src={student.profilePic?.url} />
                                                <AvatarFallback>
                                                    {student.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm md:text-base">
                                                    {student.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {student.admissionNumber}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right md:text-left">
                                        <Badge
                                            variant={isPresent ? "success" : "destructive"}
                                            className="whitespace-nowrap"
                                        >
                                            {isPresent ? "Present" : "Absent"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {students.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    No students found in this class.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Floating Action Bar for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:hidden flex gap-2 z-20">
                {existingRecordId && (
                    <Button
                        variant="outline"
                        className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setResetDialogOpen(true)}
                        disabled={saving}
                    >
                        Reset
                    </Button>
                )}
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    {existingRecordId ? "Update Attendance" : "Save Attendance"}
                </Button>
            </div>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Attendance?</DialogTitle>
                        <DialogDescription>
                            This will remove the attendance record for this class. All students
                            will be marked as pending. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setResetDialogOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                            disabled={saving}
                        >
                            {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Reset Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AttendanceSheet;
