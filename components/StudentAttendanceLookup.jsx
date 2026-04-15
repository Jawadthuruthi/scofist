"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ScanBarcode, X, Loader2, ChevronDown, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function StudentAttendanceLookup({ students = [], setFilter, removeFilter, filterMonth, filterYear, tableData = [], apiKey, classes = [], toppersOnly, setToppersOnly }) {
    const [query, setQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [toppersOpen, setToppersOpen] = useState(false);
    const [toppersData, setToppersData] = useState([]);
    const [loadingToppers, setLoadingToppers] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Filter students based on query
    const filteredStudents = students.filter((s) => {
        const q = query.trim().toLowerCase();
        if (!q) return false;
        return (
            s.name?.toLowerCase().includes(q) ||
            String(s._id)?.toLowerCase().includes(q) ||
            s.studentSpecificField?.admissionNumber?.toLowerCase().includes(q)
        );
    }).slice(0, 50);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                !inputRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const fetchRecords = useCallback(async (studentId, m, y) => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/student-attendance-lookup?studentId=${studentId}&month=${m}&year=${y}`
            );
            const data = await res.json();
            setRecords(data.records || []);
        } catch {
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setQuery(student.name);
        setShowDropdown(false);
        setOpen(true);
        fetchRecords(student._id, month, year);
    };

    const handleMonthYearChange = (m, y) => {
        setMonth(m);
        setYear(y);
        if (selectedStudent) {
            fetchRecords(selectedStudent._id, m, y);
        }
    };

    const handleSearchSubmit = () => {
        const q = query.trim().toLowerCase();
        if (!q || filteredStudents.length === 0) return;

        // Try to find exact match first among the filtered results
        const exactMatch = filteredStudents.find(s =>
            String(s._id).toLowerCase() === q ||
            s.name?.toLowerCase() === q ||
            s.studentSpecificField?.admissionNumber?.toLowerCase() === q
        );

        if (!exactMatch && filteredStudents.length > 1) {
            toast.info(`Showing best match: ${filteredStudents[0].name}`);
        }

        handleSelectStudent(exactMatch || filteredStudents[0]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchSubmit();
        }
    };

    // Simulate scanner pulse animation
    const handleScanClick = () => {
        setScanning(true);
        setTimeout(() => setScanning(false), 1200);
        inputRef.current?.focus();
    };

    const presentCount = records.filter((r) => r.present).length;
    const absentCount = records.filter((r) => r.present === false).length;
    const totalCount = records.length;
    const attendancePercentage = totalCount > 0
        ? Math.round((presentCount / totalCount) * 100)
        : 0;

    const handleToppersToggle = () => {
        setToppersOpen(true);
        setLoadingToppers(true); // Start loading

        const classMap = {};

        if (tableData && tableData.length > 0) {
            tableData.forEach(student => {
                const records = student.attendanceRecords || [];

                // Group by class from the student object directly, or fallback to record
                const className = student.className || (records.length > 0 ? records[0].className : null);
                const classId = student.classId || (records.length > 0 ? records[0].classId : null);

                let percentage = 0;
                // If the percentage was already pre-calculated by the API or table
                if (student.percentage !== undefined && student.percentage !== null) {
                    percentage = Number(student.percentage);
                } else if (records.length > 0) {
                    const total = records.length;
                    const present = records.filter(r => r.present || r.status === "Present" || r.status === "present").length;
                    percentage = Math.round((present / total) * 100 * 10) / 10;
                } else {
                    return;
                }

                // Use classId as priority key if available, else className.
                const key = classId || className || "Unknown Class";

                if (!classMap[key] || classMap[key].percentage < percentage) {
                    classMap[key] = {
                        _id: student._id,
                        name: student.name,
                        percentage: percentage,
                        className: className || "Unknown Class",
                        classId: classId
                    };
                }
            });
        }

        let finalToppers = [];
        if (classes && classes.length > 0) {
            finalToppers = classes.map(cls => {
                const topperFound = Object.values(classMap).find(t =>
                    (t.classId && t.classId === cls.value) ||
                    (t.className && t.className === cls.label)
                );

                if (topperFound) {
                    return topperFound;
                }

                return {
                    _id: "-",
                    name: "-",
                    percentage: 0,
                    className: cls.label,
                    classId: cls.value
                };
            });
        } else {
            finalToppers = Object.values(classMap).sort((a, b) => a.className?.localeCompare(b.className));
        }

        setToppersData(finalToppers);
        setLoadingToppers(false); // End loading
    };

    return (
        <>
            <div className="flex items-center gap-2">
                {/* Scanner Search Bar */}
                <div className="relative flex items-center gap-2">
                    {/* Search Input */}
                    <div className="relative w-52 md:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            ref={inputRef}
                            placeholder="Search student..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            onKeyDown={handleKeyDown}
                            className="pl-8 pr-8 h-9 text-sm border-border bg-background"
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery("");
                                    setSelectedStudent(null);
                                }}
                                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Scanner / Search button */}
                    <Button
                        size="icon"
                        variant={query ? "default" : "outline"}
                        onClick={(e) => {
                            e.preventDefault();
                            if (query) {
                                handleSearchSubmit();
                            } else {
                                handleScanClick();
                            }
                        }}
                        className={!query ? "flex-shrink-0 bg-foreground text-background hover:bg-foreground/90 border-none" : "px-3 w-auto flex-shrink-0"}
                        type="button"
                    >
                        {query ? (
                            <Search className="h-4 w-4" />
                        ) : (
                            <ScanBarcode className={`h-4 w-4 ${scanning ? "animate-pulse" : ""}`} />
                        )}
                    </Button>

                    {/* Toppers Filter Toggle */}
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant={toppersOnly ? "default" : "outline"}
                            className={`h-9 w-9 border-border ${toppersOnly ? "bg-green-500 hover:bg-green-600 text-white border-none shadow-sm" : "bg-white text-amber-500 hover:bg-neutral-100"}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                // Determine current state from prop or window fallback
                                const currentToppersOnly = (typeof toppersOnly !== 'undefined' ? toppersOnly :
                                    (typeof window !== 'undefined' ? window.__TOPPERS_ONLY__ : false));

                                const nextValue = !currentToppersOnly;

                                if (typeof setToppersOnly === 'function') {
                                    setToppersOnly(nextValue);
                                } else if (typeof window !== 'undefined' && typeof window.__SET_TOPPERS__ === 'function') {
                                    window.__SET_TOPPERS__(nextValue);
                                }
                            }}
                            title={toppersOnly ? "Show All Students" : "Show Only Green Listed Students"}
                            type="button"
                        >
                            <Trophy className="h-4 w-4" />
                        </Button>

                    </div>

                    {/* Dropdown */}
                    {showDropdown && query.length > 0 && (
                        <div
                            ref={dropdownRef}
                            className="absolute top-full left-0 mt-1 z-50 w-full bg-background border border-border rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto"
                        >
                            {filteredStudents.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                    No students found
                                </div>
                            ) : (
                                <ul>
                                    {filteredStudents.map((s) => (
                                        <li key={s._id}>
                                            <button
                                                onMouseDown={() => handleSelectStudent(s)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                                                type="button"
                                            >
                                                <span className="w-6 h-6 flex-shrink-0 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                                    {s.name?.charAt(0)?.toUpperCase()}
                                                </span>
                                                <div className="overflow-hidden">
                                                    <p className="truncate font-medium text-xs">{s.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        ID: {s._id}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance History Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-background shrink-0">
                        <div className="flex justify-between items-start gap-4">
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <ScanBarcode className="h-4 w-4" />
                                Attendance History
                            </DialogTitle>

                            {/* Student Profile Info (Top Right) */}
                            {selectedStudent && (
                                <div className="flex items-center gap-3 text-right">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">
                                            {selectedStudent.name}
                                        </span>
                                        <div className="grid grid-cols-[max-content_8px_1fr] items-center text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                                            <span>ID</span>
                                            <span className="text-center">:</span>
                                            <span>{selectedStudent._id}</span>
                                        </div>
                                        {selectedStudent.className && (
                                            <div className="grid grid-cols-[38px_8px_1fr] items-center text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                <span>Class</span>
                                                <span className="text-center">:</span>
                                                <span>{selectedStudent.className}</span>
                                            </div>
                                        )}
                                    </div>
                                    <Avatar className="h-10 w-10 border border-border">
                                        <AvatarImage src={selectedStudent.profilePic?.url} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {selectedStudent.name?.charAt(0)?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                        </div>

                        {/* Month / Year selects inside dialog */}
                        <div className="flex items-center gap-2 mt-3">
                            {/* Year select */}
                            <div className="relative">
                                <select
                                    value={year}
                                    onChange={(e) =>
                                        handleMonthYearChange(month, parseInt(e.target.value))
                                    }
                                    className="h-8 appearance-none pl-3 pr-7 text-xs rounded-md border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {years.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-2 h-3 w-3 pointer-events-none text-muted-foreground" />
                            </div>

                            {/* Month select */}
                            <div className="relative">
                                <select
                                    value={month}
                                    onChange={(e) =>
                                        handleMonthYearChange(parseInt(e.target.value), year)
                                    }
                                    className="h-8 appearance-none pl-3 pr-7 text-xs rounded-md border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {months.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-2 h-3 w-3 pointer-events-none text-muted-foreground" />
                            </div>

                            {/* Summary badges */}
                            {!loading && records.length > 0 && (
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <span className="text-xs text-muted-foreground">
                                        {records.length} classes
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-xs px-2 py-0 border-border bg-background"
                                    >
                                        ✓ {presentCount}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="text-xs px-2 py-0 border-red-500/40 text-red-600 dark:text-red-400"
                                    >
                                        ✗ {absentCount}
                                    </Badge>
                                    <Badge
                                        variant={attendancePercentage >= 75 ? "default" : "destructive"}
                                        className="text-[10px] px-1.5 py-0 h-5"
                                    >
                                        {attendancePercentage}%
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                                <ScanBarcode className="h-8 w-8 opacity-30" />
                                <p className="text-sm">No attendance records found</p>
                                <p className="text-xs">
                                    {months.find((m) => m.value === month)?.label} {year}
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 z-10 bg-background border-b border-border">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">
                                            Date
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Subject
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Teacher
                                        </th>
                                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((rec, i) => {
                                        const isAbsent = rec.present === false;
                                        return (
                                            <tr
                                                key={i}
                                                className={`border-b border-border last:border-0 transition-colors ${isAbsent
                                                    ? "bg-red-50 dark:bg-red-950/40"
                                                    : "bg-background hover:bg-muted/40"
                                                    }`}
                                            >
                                                <td
                                                    className={`px-4 py-2.5 text-xs tabular-nums ${isAbsent
                                                        ? "text-red-700 dark:text-red-300"
                                                        : "text-muted-foreground"
                                                        }`}
                                                >
                                                    {formatDate(rec.date)}
                                                </td>
                                                <td
                                                    className={`px-4 py-2.5 text-sm font-medium ${isAbsent
                                                        ? "text-red-800 dark:text-red-200"
                                                        : "text-foreground"
                                                        }`}
                                                >
                                                    {rec.subjectName}
                                                    {rec.periodNumber && (
                                                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                                                            (P{rec.periodNumber})
                                                        </span>
                                                    )}
                                                </td>
                                                <td
                                                    className={`px-4 py-2.5 text-sm ${isAbsent
                                                        ? "text-red-700 dark:text-red-300"
                                                        : "text-muted-foreground"
                                                        }`}
                                                >
                                                    {rec.teacherName}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {isAbsent ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold">
                                                            ✗
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground text-xs font-bold">
                                                            ✓
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Toppers Dialog */}
            <Dialog open={toppersOpen} onOpenChange={setToppersOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-background shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Trophy className="h-4 w-4 text-green-500" />
                            Class Toppers
                            {filterMonth && filterYear && (
                                <span className="text-muted-foreground font-normal ml-2">
                                    ({new Date(filterYear, filterMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })})
                                </span>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
                        {loadingToppers ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : toppersData.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No toppers found for this period.
                            </div>
                        ) : (
                            <div className="border border-border rounded-md bg-background overflow-hidden relative overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Class</TableHead>
                                            <TableHead className="whitespace-nowrap">Student ID</TableHead>
                                            <TableHead className="whitespace-nowrap w-full">Name</TableHead>
                                            <TableHead className="text-right whitespace-nowrap">Attendance %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {toppersData.map((topper, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {(topper.className || topper.attendanceRecords?.[0]?.className || "Unknown Class").replace(/\s*\(.*?\)/g, '')}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">{topper._id}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">{topper.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${topper.percentage >= 75 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-primary/10 text-primary"
                                                        }`}>
                                                        {topper.percentage}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
