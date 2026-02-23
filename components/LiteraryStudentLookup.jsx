"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, CalendarX2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import useCrud from "@/hooks/use-crud";
import { formatDateForDisplay } from "@/lib/utils";
import { toast } from "sonner";

export default function LiteraryStudentLookup({ apiKey }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [student, setStudent] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
    const { useFetchItems: useFetchAttendance } = useCrud(
        "literary/attendance-records",
        apiKey
    );

    const [isSearching, setIsSearching] = useState(false);
    const [currentStudentId, setCurrentStudentId] = useState(null);

    // Use the hook for fetching students
    const usersQuery = useFetchUsers(
        0,
        50, // Increase limit to find exact matches
        {
            global: searchTerm,
            roles: ["Student"], // "Student" to get students only
        },
        {
            enabled: false, // We'll trigger this manually via refetch
        }
    );

    // Use the hook for fetching attendance
    const attendanceQuery = useFetchAttendance(
        0,
        100,
        { studentId: currentStudentId },
        {
            enabled: !!currentStudentId,
        }
    );

    // Automatically map attendance query data when it changes
    useEffect(() => {
        if (attendanceQuery.isSuccess && attendanceQuery.data) {
            const data = attendanceQuery.data;
            if (data?.attendanceRecords?.length > 0 && data.attendanceRecords[0].attendanceRecords) {
                // Sort records by date descending
                const sortedRecords = [...data.attendanceRecords[0].attendanceRecords].sort(
                    (a, b) => new Date(b.date) - new Date(a.date)
                );
                setAttendanceRecords(sortedRecords);
            } else {
                setAttendanceRecords([]);
            }
        }
    }, [attendanceQuery.isSuccess, attendanceQuery.data]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            toast.error("Please enter a student ID or Name to search.");
            return;
        }
        setHasSearched(true);
        setIsSearching(true);
        setAttendanceRecords([]);
        setStudent(null);
        setCurrentStudentId(null);

        try {
            const result = await usersQuery.refetch();
            if (result.isSuccess && result.data?.users?.length > 0) {
                // Prioritize exact match for ID or Name to prevent incorrect selection
                const searchLower = searchTerm.toLowerCase();
                const exactMatch = result.data.users.find(
                    (u) =>
                        String(u._id).toLowerCase() === searchLower ||
                        String(u.name).toLowerCase() === searchLower
                );

                const foundStudent = exactMatch || result.data.users[0];

                setStudent(foundStudent);
                setCurrentStudentId(foundStudent._id);
            } else {
                toast.error("No student found with that ID or Name.");
            }
        } catch (error) {
            toast.error("Failed to search student.");
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const isLoading = usersQuery.isFetching || attendanceQuery.isFetching;

    // Render status badge
    const renderStatus = (record) => {
        const isPresent = record.present;

        if (isPresent) {
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5">
                <CalendarX2 className="w-3.5 h-3.5" /> Absent
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            <Card className="w-full">
                <CardHeader className="bg-muted/30 pb-4 pt-2 border-b">
                    <CardTitle className="text-lg">Student Literary Lookup</CardTitle>
                    <CardDescription>
                        Search for  students literary attendance history
                    </CardDescription>
                    <div className="flex gap-2 mt-4 max-w-md">
                        <Input
                            placeholder="Search by Student ID or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1"
                        />
                        <Button onClick={handleSearch} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                            ) : (
                                <Search className="h-4 w-4 sm:mr-2" />
                            )}
                            <span className="hidden sm:inline">Search</span>
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {!hasSearched ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Enter a student ID or name above to start searching</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4" />
                            <p>Gathering student records...</p>
                        </div>
                    ) : student ? (
                        <div className="space-y-6">
                            {/* Profile Section */}
                            <div className="flex flex-col">
                                <h3 className="text-xl font-bold tracking-tight text-center sm:text-left mb-2 sm:mb-0 sm:hidden">{student.name}</h3>
                                <div className="flex flex-row items-center sm:items-start gap-4">
                                    <Avatar className="h-24 w-24 sm:h-20 sm:w-20 border shadow-sm flex-shrink-0">
                                        <AvatarImage src={student.profilePic?.url} />
                                        <AvatarFallback className="text-lg font-medium text-primary bg-primary/10">
                                            {student.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <h3 className="text-xl font-bold tracking-tight hidden sm:block">{student.name}</h3>
                                        <div className="text-sm text-muted-foreground flex flex-col sm:grid sm:grid-cols-2 gap-x-4 gap-y-1.5 items-start sm:items-center">
                                            <div><span className="font-medium mr-1">ID:</span> {student._id}</div>
                                            {student.className && <div><span className="font-medium mr-1">Class:</span> {student.className}</div>}
                                            {student.batchName && <div><span className="font-medium mr-1">Batch:</span> {student.batchName}</div>}
                                            <div className="mt-1 sm:mt-0 sm:col-span-2">
                                                <Badge variant={student.status === "Active" ? "outline" : "secondary"} className={student.status === "Active" ? "bg-green-50 text-green-700" : ""}>
                                                    {student.status || "Unknown"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No student selected.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attendance History separate card */}
            {hasSearched && !isLoading && student && (
                <Card className="w-full">
                    <CardHeader className="bg-muted/30 pb-2 pt-4 sm:pb-4 sm:pt-6 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            Literary Attendance History
                            <Badge variant="secondary" className="font-normal text-xs">{attendanceRecords.length} Records</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 p-0 sm:p-6">
                        <div className="overflow-hidden">
                            <div className="h-[300px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[60px]">Sl No</TableHead>
                                            <TableHead className="w-[150px]">Date</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendanceRecords.length > 0 ? (
                                            attendanceRecords.map((record, index) => (
                                                <TableRow key={record._id}>
                                                    <TableCell className="text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {formatDateForDisplay(record.date)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-normal">
                                                            {record.category === "ALL" ? "General" : "Group"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {renderStatus(record)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    No literary attendance records found for this student.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
