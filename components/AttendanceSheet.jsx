"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Loader, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const AttendanceSheet = ({ apiKey, userId, userRole }) => {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        classId: "",
        subjectId: "",
    });

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ students: [], attendanceMap: {}, leavesMap: {} });
    const [daysInMonth, setDaysInMonth] = useState([]);


    // helper for headers
    const getHeaders = () => ({
        "api-key": apiKey,
        "x-user-id": userId
    });

    // 1. Fetch Metadata (Classes)
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await axios.get("/api/classes", { headers: getHeaders() });
                setClasses(res.data.classes || []);
            } catch (error) {
                toast.error("Failed to fetch classes");
            }
        };
        if (apiKey) fetchClasses();
    }, [apiKey]);

    // 2. Fetch Subjects when Class changes
    useEffect(() => {
        if (filters.classId) {
            const cls = classes.find(c => c._id === filters.classId);
            setSubjects(cls?.subjects || []);
            setFilters(prev => ({ ...prev, subjectId: "" })); // Reset subject
        }
    }, [filters.classId, classes]);

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
    const loadAttendance = async () => {
        if (!filters.classId || !filters.subjectId) {
            toast.error("Please select Class and Subject");
            return;
        }

        setLoading(true);


        try {
            const res = await axios.get("/api/attendance-sheet", {
                headers: getHeaders(),
                params: {
                    classId: filters.classId,
                    subjectId: filters.subjectId,
                    month: filters.month,
                    year: filters.year
                }
            });
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Styles for Print */}
            <style jsx global>{`
                @media print {
                    @page { margin: 10mm; size: landscape; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
            <Card className="print:border-none print:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>ATTENDANCE SHEET</CardTitle>
                    {/* Export/Save buttons removed as requested */}
                </CardHeader>
                <CardContent className="print:p-0">
                    {/* Filters - Hidden in Print */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 print:hidden">
                        <Select value={filters.year.toString()} onValueChange={(v) => setFilters(prev => ({ ...prev, year: parseInt(v) }))}>
                            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent>
                                {[...Array(5)].map((_, i) => {
                                    const y = new Date().getFullYear() - i;
                                    return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>

                        <Select value={filters.month.toString()} onValueChange={(v) => setFilters(prev => ({ ...prev, month: parseInt(v) }))}>
                            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filters.classId} onValueChange={(v) => setFilters(prev => ({ ...prev, classId: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.subjectId} onValueChange={(v) => setFilters(prev => ({ ...prev, subjectId: v }))} disabled={!filters.classId}>
                            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                            <SelectContent>
                                {subjects.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Button onClick={loadAttendance} disabled={loading} className="w-full">
                            {loading ? <Loader className="animate-spin" /> : "Load Data"}
                        </Button>

                        <Button
                            className="bg-black text-white hover:bg-gray-800 w-full"
                            onClick={() => window.print()}
                        >
                            Print
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="border rounded-md overflow-x-auto print:max-h-none print:overflow-visible">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary z-20 print:static">
                                <TableRow>
                                    <TableHead className="w-[50px] sticky left-0 bg-secondary z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Sl.No</TableHead>
                                    <TableHead className="min-w-[150px] sticky left-[50px] bg-secondary z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Student Name</TableHead>
                                    {daysInMonth.map(day => (
                                        <TableHead key={day} className={`text-center min-w-[30px] px-1 ${day.getDay() === 5 ? 'bg-red-50 text-red-600 print:bg-red-100' : ''}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold">{day.getDate()}</span>
                                                <span className="text-[9px] uppercase">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                            </div>
                                        </TableHead>
                                    ))}
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
                                                {student.name}
                                            </TableCell>
                                            {daysInMonth.map(day => {
                                                const dateKey = day.getDate();
                                                const entry = data.attendanceMap[student._id]?.[dateKey];
                                                // Determine status: Database
                                                const isPresent = entry?.present;

                                                // Visuals
                                                let Icon = null;
                                                if (isPresent === true) Icon = <Check className="w-4 h-4 text-green-600 font-bold" />; // Slightly smaller for dense print
                                                else if (isPresent === false) Icon = <X className="w-3 h-3 text-red-600" />;

                                                return (
                                                    <TableCell
                                                        key={day.toISOString()}
                                                        className={`text-center p-0.5 border-l ${day.getDay() === 5 ? 'bg-red-50/50 print:bg-red-50' : ''}`}
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
                </CardContent>
            </Card>
        </div>
    );
};

export default AttendanceSheet;
