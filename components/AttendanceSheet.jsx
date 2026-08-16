"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Loader, Check, X, Filter, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const AttendanceSheet = ({ apiKey, userId, userRole }) => {
    const [batches, setBatches] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);

    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        batchId: "",
        classId: "",
        subjectId: "",
    });

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ students: [], attendanceMap: {}, leavesMap: {}, nonWorkingDaysMap: {}, teacherLeavesMap: {}, subjectDays: [], subjectTeacherName: "" });
    const [daysInMonth, setDaysInMonth] = useState([]);

    const filteredClasses = classes;

    const handleBatchChange = (batchId) => {
        const targetBatchId = batchId === "none" ? "" : batchId;
        setFilters(prev => ({
            ...prev,
            batchId: targetBatchId,
            classId: "",
            subjectId: ""
        }));
    };

    const handleClassChange = (classId) => {
        const targetClassId = classId === "none" ? "" : classId;
        setFilters(prev => ({
            ...prev,
            classId: targetClassId,
            subjectId: ""
        }));
    };

    // helper for headers
    const getHeaders = () => ({
        "api-key": apiKey,
        "x-user-id": userId
    });

    // 1. Fetch Metadata (Batches, Classes & Subjects)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [classesRes, subjectsRes, batchesRes] = await Promise.all([
                    axios.get("/api/classes", { headers: getHeaders() }),
                    axios.get("/api/subjects", { 
                        headers: getHeaders(),
                        params: { projection: "_id,name" }
                    }),
                    axios.get("/api/batches", { headers: getHeaders() })
                ]);
                setClasses(classesRes.data.classes || []);
                setAllSubjects(subjectsRes.data.subjects || []);
                const fetchedBatches = batchesRes.data.batches || [];
                setBatches(fetchedBatches.sort((a, b) => {
                    const yearA = parseInt(a.academicYear) || 0;
                    const yearB = parseInt(b.academicYear) || 0;
                    return yearB - yearA;
                }));
            } catch (error) {
                console.error("Metadata fetch error:", error);
                toast.error("Failed to fetch initial data");
            }
        };
        if (apiKey) fetchMetadata();
    }, [apiKey]);

    // 2. Fetch Subjects when Class or Batch changes
    useEffect(() => {
        const fetchSubjects = async () => {
            if (filters.classId) {
                const cls = classes.find(c => c._id === filters.classId);
                
                // Collect current subjects from class data
                const currentSubjects = [
                    ...(cls?.coreSubjects || []), 
                    ...(cls?.majorSubjects || [])
                ].map(s => {
                    if (typeof s === 'string') {
                        const found = allSubjects.find(sub => sub._id === s);
                        return found || { _id: s, name: s };
                    }
                    return s;
                });

                try {
                    // Fetch historical subjects from attendance records
                    const histRes = await axios.get(`/api/classes/historical-subjects?classId=${filters.classId}`, {
                        headers: getHeaders()
                    });
                    const historicalSubjects = histRes.data.subjects || [];

                    // Combine current and historical subjects
                    const combined = [...currentSubjects, ...historicalSubjects];

                    // Remove duplicates based on _id
                    const uniqueSubjects = combined.filter((s, index, self) => 
                        s && s._id && index === self.findIndex((t) => t._id === s._id)
                    );
                    
                    setSubjects(uniqueSubjects);
                } catch (error) {
                    console.error("Error fetching historical subjects:", error);
                    // Fallback to current subjects only if API fails
                    setSubjects(currentSubjects);
                }
                
                setFilters(prev => ({ ...prev, subjectId: "" })); // Reset subject
            } else if (filters.batchId) {
                // Collect subjects from all classes in the batch
                const batchClasses = classes.filter(c => {
                    const bId = c.batchId && typeof c.batchId === 'object' ? c.batchId._id : c.batchId;
                    return bId === filters.batchId;
                });
                
                const collectedSubjects = [];
                batchClasses.forEach(cls => {
                    [...(cls.coreSubjects || []), ...(cls.majorSubjects || [])].forEach(s => {
                        let subjectObj = s;
                        if (typeof s === 'string') {
                            subjectObj = allSubjects.find(sub => sub._id === s) || { _id: s, name: s };
                        }
                        if (subjectObj && subjectObj._id) {
                            collectedSubjects.push(subjectObj);
                        }
                    });
                });

                // Remove duplicates
                const uniqueSubjects = collectedSubjects.filter((s, index, self) => 
                    s && s._id && index === self.findIndex((t) => t._id === s._id)
                );

                setSubjects(uniqueSubjects);
                setFilters(prev => ({ ...prev, subjectId: "" })); // Reset subject
            } else {
                setSubjects([]);
            }
        };

        fetchSubjects();
    }, [filters.classId, filters.batchId, classes, allSubjects]);

    // 3. Calculate Date Headers
    useEffect(() => {
        const date = new Date(filters.year, filters.month, 1);
        const days = [];
        while (date.getMonth() === filters.month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        setDaysInMonth(days);
    }, [filters.month, filters.year]);

    // 4. Fetch Attendance Data
    useEffect(() => {
        const loadAttendance = async () => {
            if ((!filters.classId && !filters.batchId) || !filters.subjectId) {
                return;
            }

            setLoading(true);

            try {
                const params = {
                    subjectId: filters.subjectId,
                    month: filters.month,
                    year: filters.year
                };
                if (filters.classId) {
                    params.classId = filters.classId;
                }
                if (filters.batchId) {
                    params.batchId = filters.batchId;
                }

                const res = await axios.get("/api/attendance-sheet", {
                    headers: getHeaders(),
                    params
                });
                setData(res.data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load attendance records");
            } finally {
                setLoading(false);
            }
        };

        if (filters.subjectId) {
            loadAttendance();
        }
    }, [filters.subjectId, filters.month, filters.year, filters.classId, filters.batchId, apiKey, userId]);

    const exportToCSV = () => {
        if (!data.students || data.students.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = ["Sl.No", "Student Name"];
        daysInMonth.forEach(day => headers.push(day.getDate().toString()));
        headers.push("P", "A", "L");

        const rows = [headers];

        data.students.forEach((student, idx) => {
            const row = [idx + 1, student.name];
            let presentCount = 0;
            let absentCount = 0;
            let leaveCount = 0;

            daysInMonth.forEach(day => {
                const dateKey = day.getDate();
                const isFriday = day.getDay() === 5;
                const isNonWorkingDay = !isFriday && (dateKey in (data.nonWorkingDaysMap || {}));
                const teacherLeaveReason = data.teacherLeavesMap?.[dateKey];
                
                const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
                const isNoPeriod = filters.classId && data.subjectDays?.length > 0 && !data.subjectDays.includes(dayName) && !isFriday;
                
                if (isFriday || isNonWorkingDay || teacherLeaveReason || isNoPeriod) {
                    row.push("-");
                } else {
                    const status = data.attendanceMap[student._id]?.[dateKey];
                    const hasLeave = data.leavesMap[student._id]?.[dateKey];
                    
                    if (hasLeave) {
                        row.push("L");
                        leaveCount++;
                    } else if (status === "Present") {
                        row.push("P");
                        presentCount++;
                    } else if (status === "Absent") {
                        row.push("A");
                        absentCount++;
                    } else {
                        row.push("");
                    }
                }
            });

            row.push(presentCount, absentCount, leaveCount);
            rows.push(row);
        });

        const csvContent = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_${filters.year}_${filters.month + 1}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Styles for Print */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: landscape; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
                    body { margin: 0; padding: 0 !important; overflow: visible !important; }
                    html { margin: 0; padding: 0; overflow: visible !important; }
                    
                    /* Hide App Layout Elements */
                    nav, aside, header, .header, .sidebar, .top-bar, .app-sidebar, [data-sidebar="sidebar"] { display: none !important; }
                    .print\:hidden { display: none !important; }

                    /* Reset Layout Containers for Full Print */
                    div, main { overflow: visible !important; height: auto !important; }
                    
                    /* Pagination Control */
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            `}</style>

            {/* Filters - Hidden in Print */}
            <div className="flex flex-col xl:flex-row flex-wrap items-start xl:items-center gap-4 mb-6 print:hidden">
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <Select value={filters.year.toString()} onValueChange={(v) => setFilters(prev => ({ ...prev, year: parseInt(v) }))}>
                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - i;
                                return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            })}
                        </SelectContent>
                    </Select>

                    <Select value={filters.month.toString()} onValueChange={(v) => setFilters(prev => ({ ...prev, month: parseInt(v) }))}>
                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px]"><SelectValue placeholder="Month" /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.batchId || "none"} onValueChange={handleBatchChange}>
                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px]"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">All/No Batch</SelectItem>
                            {batches.map(b => (
                                <SelectItem key={b._id} value={b._id}>
                                    {b.name} {b.academicYear ? `(${b.academicYear})` : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={filters.classId || "none"} onValueChange={handleClassChange}>
                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px]"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">All/No Class</SelectItem>
                            {filteredClasses.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <Select value={filters.subjectId} onValueChange={(v) => setFilters(prev => ({ ...prev, subjectId: v }))} disabled={!filters.classId && !filters.batchId}>
                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px]"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                        <SelectContent>
                            {subjects.map(s => (
                                <SelectItem key={s._id || `s-${s}`} value={s._id || s}>
                                    {s.name || s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:ml-auto">
                    {loading && (
                        <div className="flex items-center text-sm text-muted-foreground mr-2">
                            <Loader className="animate-spin h-4 w-4 mr-2" />
                            Loading...
                        </div>
                    )}

                    <Button variant="outline" onClick={exportToCSV} disabled={!data.students || data.students.length === 0} className="gap-2 flex-1 sm:flex-none">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel
                    </Button>

                    <Button
                        className="bg-black text-white hover:bg-gray-800 flex-1 sm:flex-none"
                        onClick={() => window.print()}
                    >
                        Print
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md print:max-h-none print:overflow-visible flex flex-col bg-background">
                {/* Display Attendance Info - Attached to Table */}
                {filters.subjectId && !loading && data.students && data.students.length > 0 && (
                    <div className="flex flex-col items-center justify-center p-5 border-b bg-muted/5 print:border-b-gray-300 print:mb-2 print:p-4">
                        <h2 className="text-xl font-bold uppercase tracking-widest text-foreground mb-3">
                            Attendance Sheet
                        </h2>
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span className="text-xs uppercase tracking-wider">Month:</span>
                                <span className="text-foreground">{new Date(0, filters.month).toLocaleString('default', { month: 'long' })} {filters.year}</span>
                            </div>
                            {filters.batchId && (
                                <>
                                    <span className="text-border">|</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs uppercase tracking-wider">Batch:</span>
                                        <span className="text-foreground">{batches.find(b => b._id === filters.batchId)?.name || 'All'}</span>
                                    </div>
                                </>
                            )}
                            {filters.classId && (
                                <>
                                    <span className="text-border">|</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs uppercase tracking-wider">Class:</span>
                                        <span className="text-foreground">{classes.find(c => c._id === filters.classId)?.name || 'All'}</span>
                                    </div>
                                </>
                            )}
                            {filters.subjectId && (
                                <>
                                    <span className="text-border">|</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs uppercase tracking-wider">Subject:</span>
                                        <span className="text-foreground">{subjects.find(s => s._id === filters.subjectId)?.name || ''}</span>
                                    </div>
                                </>
                            )}
                            {data.subjectTeacherName && (
                                <>
                                    <span className="text-border">|</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs uppercase tracking-wider text-primary print:!text-black">Teacher:</span>
                                        <span className="text-foreground font-bold">{data.subjectTeacherName}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="overflow-x-auto w-full">
                    <Table>
                    <TableHeader className="sticky top-0 bg-secondary z-20 print:static">
                        <TableRow>
                            <TableHead className="w-[50px] sticky left-0 bg-secondary z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Sl.No</TableHead>
                            <TableHead className="min-w-[150px] sticky left-[50px] bg-secondary z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Student Name</TableHead>
                            {daysInMonth.map(day => {
                                const dateKey = day.getDate();
                                const isFriday = day.getDay() === 5;
                                // Use 'in' check so empty-string occasions (legacy dates) are still treated as non-working
                                const isNonWorkingDay = !isFriday && (dateKey in (data.nonWorkingDaysMap || {}));
                                const teacherLeaveReason = data.teacherLeavesMap?.[dateKey];
                                
                                const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
                                const isNoPeriod = filters.classId && data.subjectDays?.length > 0 && !data.subjectDays.includes(dayName) && !isFriday;

                                return (
                                    <TableHead key={day.toISOString()} className={`text-center min-w-[30px] px-1 ${
                                        isFriday ? 'bg-red-50 text-red-600 print:!bg-red-100 print:!text-red-600' :
                                        teacherLeaveReason ? 'bg-blue-50 text-blue-600 print:!bg-blue-100 print:!text-blue-600' :
                                        isNoPeriod ? 'bg-gray-100 text-gray-400 print:!bg-gray-200 print:!text-gray-400' :
                                        isNonWorkingDay ? 'bg-orange-50 text-orange-600 print:!bg-orange-100 print:!text-orange-600' : ''
                                    }`}>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold">{day.getDate()}</span>
                                            <span className="text-[9px] uppercase">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={daysInMonth.length + 2} className="text-center h-24">
                                    {loading ? "Loading..." : "No data to display. specific filters to load."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.students.map((student, index) => (
                                <TableRow key={student._id} className="group print:break-inside-avoid">
                                    <TableCell className="sticky left-0 bg-background group-hover:bg-muted/50 z-30 font-medium text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="sticky left-[50px] bg-background group-hover:bg-muted/50 z-10 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">
                                        <div className="flex flex-col">
                                            <span>{student.name}</span>
                                            {filters.batchId && !filters.classId && student.studentSpecificField?.classId && (
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    {classes.find(c => c._id === student.studentSpecificField.classId)?.name || ""}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    {daysInMonth.map(day => {
                                        const dateKey = day.getDate();
                                        const entry = data.attendanceMap[student._id]?.[dateKey];
                                        // Determine status: Database
                                        const isPresent = entry?.present;
                                        const isFriday = day.getDay() === 5;
                                        const occasionName = data.nonWorkingDaysMap?.[dateKey];
                                        // Use 'in' check so empty-string occasions (legacy dates) are still non-working
                                        const isNonWorkingDay = !isFriday && (dateKey in (data.nonWorkingDaysMap || {}));
                                        const teacherLeaveReason = data.teacherLeavesMap?.[dateKey];
                                        
                                        const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
                                        const isNoPeriod = filters.classId && data.subjectDays?.length > 0 && !data.subjectDays.includes(dayName) && !isFriday;

                                        if (isFriday) {
                                            const isMiddle = index === Math.floor(data.students.length / 2);

                                            // VISUAL MERGE: We simulate a merged column by hiding borders between cells.
                                            // This allows the browser to break the table across pages (starting on Page 1),
                                            // which is impossible with a real 'rowSpan' of 50+ rows.
                                            const borderTop = index === 0 ? '' : 'border-t-0 print:border-t-0';
                                            const borderBottom = index === data.students.length - 1 ? '' : 'border-b-0 print:border-b-0';

                                            return (
                                                <TableCell
                                                    key={day.toISOString()}
                                                    className={`text-center p-0 border-l bg-red-50/50 print:!bg-red-50 align-middle ${borderTop} ${borderBottom}`}
                                                >
                                                    <div className="flex items-center justify-center w-full h-12 relative overflow-visible">
                                                        {isMiddle && (
                                                            <span className="absolute z-0 text-xl text-red-300 print:!text-red-300 font-bold tracking-[1em] uppercase [writing-mode:vertical-lr] py-4 whitespace-nowrap">
                                                                Friday
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        if (teacherLeaveReason) {
                                            const isMiddle = index === Math.floor(data.students.length / 2);
                                            const borderTop = index === 0 ? '' : 'border-t-0 print:border-t-0';
                                            const borderBottom = index === data.students.length - 1 ? '' : 'border-b-0 print:border-b-0';

                                            return (
                                                <TableCell
                                                    key={day.toISOString()}
                                                    className={`text-center p-0 border-l bg-blue-50/50 print:!bg-blue-50 align-middle ${borderTop} ${borderBottom}`}
                                                >
                                                    <div className="flex items-center justify-center w-full h-12 relative overflow-visible">
                                                        {isMiddle && (
                                                            <span className="absolute z-0 text-xl text-blue-300 print:!text-blue-300 font-bold tracking-[0.2em] uppercase [writing-mode:vertical-lr] py-4 whitespace-nowrap">
                                                                {teacherLeaveReason}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        if (isNoPeriod) {
                                            const isMiddle = index === Math.floor(data.students.length / 2);
                                            const borderTop = index === 0 ? '' : 'border-t-0 print:border-t-0';
                                            const borderBottom = index === data.students.length - 1 ? '' : 'border-b-0 print:border-b-0';

                                            return (
                                                <TableCell
                                                    key={day.toISOString()}
                                                    className={`text-center p-0 border-l bg-gray-50/50 print:!bg-gray-100 align-middle ${borderTop} ${borderBottom}`}
                                                >
                                                    <div className="flex items-center justify-center w-full h-12 relative overflow-visible">
                                                        {isMiddle && (
                                                            <span className="absolute z-0 text-xl text-gray-400 print:!text-gray-400 font-bold tracking-[0.2em] uppercase [writing-mode:vertical-lr] py-4 whitespace-nowrap">
                                                                No Period
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        if (isNonWorkingDay) {
                                            const isMiddle = index === Math.floor(data.students.length / 2);
                                            const borderTop = index === 0 ? '' : 'border-t-0 print:border-t-0';
                                            const borderBottom = index === data.students.length - 1 ? '' : 'border-b-0 print:border-b-0';

                                            return (
                                                <TableCell
                                                    key={day.toISOString()}
                                                    className={`text-center p-0 border-l bg-orange-50/50 print:!bg-orange-50 align-middle ${borderTop} ${borderBottom}`}
                                                >
                                                    <div className="flex items-center justify-center w-full h-12 relative overflow-visible">
                                                        {isMiddle && occasionName && (
                                                            <span className="absolute z-0 text-xl text-orange-300 print:!text-orange-300 font-bold tracking-[0.5em] uppercase [writing-mode:vertical-lr] py-4 whitespace-nowrap">
                                                                {occasionName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        // Visuals
                                        let Icon = null;
                                        const leaveReason = data.leavesMap?.[student._id]?.[dateKey];

                                        if (isPresent === true) {
                                            Icon = <Check className="w-4 h-4 text-green-600 print:!text-green-600 font-bold" />;
                                        } else if (isPresent === false) {
                                            Icon = (
                                                <div className="flex flex-col items-center">
                                                    <X className="w-3 h-3 text-red-600 print:!text-red-600" />
                                                    {leaveReason && (
                                                        <span className="text-[7px] text-red-500 print:!text-red-500 leading-none mt-0.5 line-clamp-1 max-w-[40px]">
                                                            {leaveReason}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }


                                        return (
                                            <TableCell
                                                key={day.toISOString()}
                                                className={`text-center p-0.5 border-l`}
                                            >
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center justify-center h-6 w-full cursor-default">
                                                                {Icon ? Icon : <span className="text-gray-200">-</span>}
                                                            </div>
                                                        </TooltipTrigger>
                                                        {entry && (
                                                            <TooltipContent>
                                                                <p className="text-xs">Marked By: {entry.markedBy}</p>
                                                                <p className="text-[10px] text-muted-foreground">{new Date(entry.markedAt).toLocaleString()}</p>
                                                                {data.leavesMap?.[student._id]?.[dateKey] && (
                                                                    <p className="text-[10px] text-yellow-600 font-semibold mt-1">
                                                                        Leave: {data.leavesMap[student._id][dateKey]}
                                                                    </p>
                                                                )}
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
        </div>
    );
};

export default AttendanceSheet;
