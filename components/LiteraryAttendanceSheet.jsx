"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import axios from "axios";
import { Loader, Check, X, Calendar as CalendarIcon, Search, Printer, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, sortClasses } from "@/lib/utils";
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

const LiteraryAttendanceSheet = ({ apiKey, userId }) => {
    const [classes, setClasses] = useState([]);
    const [groups, setGroups] = useState([]);

    const [filters, setFilters] = useState({
        fromDate: startOfMonth(new Date()),
        toDate: endOfMonth(new Date()),
        category: "", // "ALL", "GROUP", "BOTH"
        categoryId: "", // Selected class._id
    });

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ students: [], attendanceMap: {}, leavesMap: {} });
    const [daysInMonth, setDaysInMonth] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    const displayedStudents = useMemo(() => {
        const studentsList = data?.students || [];
        if (!searchQuery.trim()) {
            return studentsList.map((student, index) => ({ student, originalIndex: index + 1 }));
        }
        const q = searchQuery.trim().toLowerCase();
        return studentsList
            .map((student, index) => ({ student, originalIndex: index + 1 }))
            .filter(({ student, originalIndex }) => {
                const name = (student.name || "").toLowerCase();
                const admNo = String(
                    student.studentSpecificField?.admissionNumber ||
                    student.admissionNumber ||
                    ""
                ).toLowerCase();
                const id = String(student._id || "").toLowerCase();
                return name.includes(q) || admNo.includes(q) || id.includes(q) || String(originalIndex) === q;
            });
    }, [data?.students, searchQuery]);


    // helper for headers
    const getHeaders = () => ({
        "api-key": apiKey,
        "x-user-id": userId
    });

    // 1. Fetch Metadata (Classes & Groups)
    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [classRes, groupRes] = await Promise.all([
                    axios.get("/api/classes?status=Active", { headers: getHeaders() }),
                    axios.get("/api/literary/groups", { headers: getHeaders() })
                ]);
                const fetchedClasses = (classRes.data.classes || [])
                    .filter((c) => c?.status !== "Closed")
                    .sort((a, b) => {
                    const classCompare = sortClasses(a, b);
                    if (classCompare !== 0) return classCompare;
                    return String(a.name || "").localeCompare(String(b.name || ""));
                });
                setClasses(fetchedClasses);
                setGroups(groupRes.data.groups || []);
            } catch (error) {
                toast.error("Failed to fetch classes or groups");
            }
        };
        if (apiKey) fetchFiltersData();
    }, [apiKey]);

    // Reset selected ID when category changes
    useEffect(() => {
        setFilters(prev => ({ ...prev, categoryId: "" }));
        setData({ students: [], attendanceMap: {}, leavesMap: {} });
    }, [filters.category]);

    // 3. Calculate Date Headers (Default to all days initially, filter later)
    useEffect(() => {
        if (!filters.fromDate || !filters.toDate) return;
        const days = [];
        let d = new Date(filters.fromDate);
        const end = new Date(filters.toDate);
        end.setHours(23, 59, 59, 999);
        while (d <= end) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        setDaysInMonth(days);
    }, [filters.fromDate, filters.toDate]);

    // Track active dates based on the response data
    const [activeDates, setActiveDates] = useState(new Set());

    // Filtered active days based on data
    const filteredDays = useMemo(() => {
        return daysInMonth.filter(d => activeDates.has(format(d, "yyyy-MM-dd")));
    }, [daysInMonth, activeDates]);

    // Group active days by month for merged header
    const monthGroups = useMemo(() => {
        const groups = [];
        filteredDays.forEach(day => {
            const monthKey = format(day, "yyyy-MM");
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.key === monthKey) {
                lastGroup.count += 1;
                lastGroup.days.push(day);
            } else {
                groups.push({
                    key: monthKey,
                    count: 1,
                    days: [day],
                });
            }
        });
        return groups;
    }, [filteredDays]);

    // 4. Fetch Attendance Data
    const loadAttendance = async () => {
        if (!filters.category || !filters.categoryId) {
            toast.error("Please select a Category and specify the Class.");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.get("/api/literary/attendance-sheet", {
                headers: getHeaders(),
                params: {
                    category: filters.category,
                    categoryId: filters.categoryId,
                    startDate: format(filters.fromDate, "yyyy-MM-dd"),
                    endDate: format(filters.toDate, "yyyy-MM-dd")
                }
            });
            setData(res.data);

            // Determine which days have attendance data
            const activeDbDates = new Set();
            Object.values(res.data.attendanceMap || {}).forEach(studentData => {
                Object.keys(studentData).forEach(dateStr => activeDbDates.add(dateStr));
            });
            setActiveDates(activeDbDates);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const getFilterLabel = () => {
        if (!filters.category) return "Category / Class";

        let prefix = "General";
        if (filters.category === "BOTH") prefix = "Both";
        if (filters.category === "GROUP") prefix = "Group";

        const cls = classes.find(c => c._id === filters.categoryId);
        return cls ? `${prefix} - ${cls.name}` : `${prefix} - Class`;
    }

    return (
        <div className="space-y-2 animate-in fade-in duration-500">
            {/* Styles for Print */}
            <style jsx global>{`
                @media screen {
                    .print-only-header {
                        display: none !important;
                    }
                }
                @media print {
                    @page {
                        margin: 8mm 6mm;
                        size: auto;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        background: #fff !important;
                        color: #000 !important;
                        font-size: 11px !important;
                    }
                    
                    /* Hide App Layout Elements */
                    nav, aside, header, .header, .sidebar, .top-bar, .app-sidebar, [data-sidebar="sidebar"], .no-print, .print\:hidden {
                        display: none !important;
                    }

                    /* Reset Layout Containers for Full Print */
                    div, main, .container {
                        overflow: visible !important;
                        height: auto !important;
                        max-width: 100% !important;
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Print Header */
                    .print-only-header {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 100% !important;
                        margin: 0 0 10px 0 !important;
                        padding: 0 !important;
                        text-align: center !important;
                        visibility: visible !important;
                    }

                    /* Pagination and Table Control */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        page-break-inside: auto;
                        table-layout: auto !important;
                    }
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tfoot {
                        display: table-footer-group;
                    }
                    th, td {
                        border: 1px solid #cbd5e1 !important;
                        padding: 3px 2px !important;
                        font-size: 10px !important;
                        color: #000 !important;
                    }
                    th {
                        background-color: #f1f5f9 !important;
                        font-weight: 700 !important;
                    }
                }
            `}</style>
            {/* Print-only Header */}
            <div className="print-only-header text-black print:text-black">
                <div className="tracking-[0.15em] font-extrabold text-xl uppercase leading-tight text-black">
                    LITERARY ATTENDANCES
                </div>
                <div className="flex items-center justify-center gap-4 text-xs font-semibold uppercase tracking-wider mt-1 text-black">
                    <span>
                        {filters.fromDate ? format(filters.fromDate, 'dd MMM yyyy') : ''}
                        {filters.fromDate && filters.toDate ? ' - ' : ''}
                        {filters.toDate ? format(filters.toDate, 'dd MMM yyyy') : ''}
                    </span>
                    <span>•</span>
                    <span>{getFilterLabel()}</span>
                    {displayedStudents.length > 0 && (
                        <>
                            <span>•</span>
                            <span>Total Students: {displayedStudents.length}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Filters - Hidden in Print */}
            <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-end gap-3 mb-6 print:hidden">
                {/* Date pickers */}
                <div className="grid grid-cols-2 gap-2 md:flex md:items-end md:gap-3 shrink-0">
                    <div className="space-y-1 md:w-[135px]">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">From</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-background text-xs md:text-sm px-2.5",
                                        !filters.fromDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                    {filters.fromDate ? format(filters.fromDate, "dd MMM yyyy") : <span>Select Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={filters.fromDate}
                                    onSelect={(v) => setFilters(prev => ({ ...prev, fromDate: v }))}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1 md:w-[135px]">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">To</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-background text-xs md:text-sm px-2.5",
                                        !filters.toDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                    {filters.toDate ? format(filters.toDate, "dd MMM yyyy") : <span>Select Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={filters.toDate}
                                    onSelect={(v) => setFilters(prev => ({ ...prev, toDate: v }))}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Category, Class & Action Buttons */}
                <div className="flex items-end gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <div className="space-y-1 w-[92px] sm:w-[110px] md:w-[125px] shrink-0">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Category</label>
                        <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
                            <SelectTrigger className="w-full text-xs md:text-sm px-2"><SelectValue placeholder="Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">General</SelectItem>
                                <SelectItem value="GROUP">Group</SelectItem>
                                <SelectItem value="BOTH">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Class</label>
                        <Select value={filters.categoryId} onValueChange={(v) => setFilters(prev => ({ ...prev, categoryId: v }))} disabled={!filters.category}>
                            <SelectTrigger className="w-full text-xs md:text-sm px-2 truncate"><SelectValue placeholder="Select Class" /></SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons: Icons only on mobile, icon + label on desktop */}
                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                        <Button
                            onClick={loadAttendance}
                            disabled={loading}
                            className="h-9 w-9 p-0 md:w-auto md:px-4 md:py-2 text-xs md:text-sm shrink-0"
                            title="Load Data"
                        >
                            {loading ? (
                                <Loader className="animate-spin h-4 w-4 md:mr-1.5" />
                            ) : (
                                <RotateCw className="h-4 w-4 md:mr-1.5" />
                            )}
                            <span className="hidden md:inline">Load Data</span>
                        </Button>
                        <Button
                            className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 h-9 w-9 p-0 md:w-auto md:px-3.5 md:py-2 btn-print text-xs md:text-sm shrink-0"
                            onClick={() => window.print()}
                            title="Print"
                        >
                            <Printer className="h-4 w-4 md:mr-1.5" />
                            <span className="hidden md:inline">Print</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md overflow-x-auto max-w-full print:max-h-none print:overflow-visible">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary z-20 print:static">
                        {monthGroups.length > 0 ? (
                            <>
                                <TableRow className="border-b dark:border-zinc-700">
                                    <TableHead
                                        rowSpan={2}
                                        className="w-[38px] sm:w-[50px] sticky left-0 bg-secondary z-30 px-1 sm:px-2 text-center text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none border-r border-b border-border dark:border-zinc-700 align-middle font-bold text-foreground"
                                    >
                                        Sl.No
                                    </TableHead>
                                    <TableHead
                                        rowSpan={2}
                                        className="w-auto whitespace-nowrap sticky left-[38px] sm:left-[50px] px-2 py-1.5 bg-secondary z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none min-w-[120px] max-w-[150px] sm:max-w-xs print:min-w-0 print:max-w-none border-r border-b border-border dark:border-zinc-700 align-middle"
                                    >
                                        <span className="hidden print:inline px-2 font-bold text-black text-xs">Student Name</span>
                                        <div className="relative flex items-center w-full max-w-[120px] sm:max-w-xs print:hidden">
                                            <Search className="absolute left-1.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                            <Input
                                                type="text"
                                                placeholder="Search students..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Escape") setSearchQuery("");
                                                }}
                                                className="h-8 pl-7 pr-6 text-xs bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none w-full placeholder:text-muted-foreground font-medium"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSearchQuery("");
                                                    }}
                                                    className="absolute right-1 text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors"
                                                    title="Clear search"
                                                    aria-label="Clear search"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </TableHead>
                                    {monthGroups.map((group, gIdx) => (
                                        <TableHead
                                            key={group.key}
                                            colSpan={group.count}
                                            className={`text-center font-bold text-xs uppercase tracking-wider py-1.5 border-r border-b border-border dark:border-zinc-700 ${gIdx === 0 ? 'border-l' : ''} bg-secondary/80 print:bg-slate-100 text-foreground print:text-black h-7`}
                                        >
                                            <span className="hidden sm:inline print:inline">
                                                {format(group.days[0], "MMMM yyyy")}
                                            </span>
                                            <span className="sm:hidden print:hidden">
                                                {group.count < 3 ? format(group.days[0], "MMM yyyy") : format(group.days[0], "MMMM yyyy")}
                                            </span>
                                        </TableHead>
                                    ))}
                                    <TableHead rowSpan={2} className="w-full print:hidden border-b border-border dark:border-zinc-700"></TableHead>
                                </TableRow>
                                <TableRow>
                                    {filteredDays.map((day, dIdx) => (
                                        <TableHead
                                            key={day.toISOString()}
                                            className={`text-center min-w-[30px] px-1 border-r border-b border-border dark:border-zinc-700 ${
                                                dIdx === 0 ? 'border-l' : ''
                                            } ${
                                                day.getDay() === 5 ? 'bg-red-50 text-red-600 print:bg-red-100' : 'bg-secondary'
                                            }`}
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold">{day.getDate()}</span>
                                                <span className="text-[9px] uppercase">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </>
                        ) : (
                            <TableRow>
                                <TableHead className="w-[38px] sm:w-[50px] sticky left-0 bg-secondary z-30 px-1 sm:px-2 text-center text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none border-r border-border dark:border-zinc-700">Sl.No</TableHead>
                                <TableHead className="w-auto whitespace-nowrap sticky left-[38px] sm:left-[50px] px-2 py-1.5 bg-secondary z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none min-w-[120px] max-w-[150px] sm:max-w-xs print:min-w-0 print:max-w-none border-r border-border dark:border-zinc-700">
                                    <span className="hidden print:inline px-2 font-bold text-black text-xs">Student Name</span>
                                    <div className="relative flex items-center w-full max-w-[120px] sm:max-w-xs print:hidden">
                                        <Search className="absolute left-1.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                        <Input
                                            type="text"
                                            placeholder="Search students..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") setSearchQuery("");
                                            }}
                                            className="h-8 pl-7 pr-6 text-xs bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none w-full placeholder:text-muted-foreground font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSearchQuery("");
                                                }}
                                                className="absolute right-1 text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors"
                                                title="Clear search"
                                                aria-label="Clear search"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </TableHead>
                                <TableHead className="w-full print:hidden"></TableHead>
                            </TableRow>
                        )}
                    </TableHeader>
                    <TableBody>
                        {displayedStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={filteredDays.length + 2} className="text-center h-24">
                                    {searchQuery ? `No students found matching "${searchQuery}"` : (loading ? "Loading..." : "No data to display. Please select specific filters to load.")}
                                </TableCell>
                            </TableRow>
                        ) : activeDates.size === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    No attendance has been marked for the selected filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayedStudents.map(({ student, originalIndex }, index) => (
                                <TableRow key={student._id} className="group print:break-inside-avoid">
                                    <TableCell className="w-[38px] sm:w-[50px] sticky left-0 bg-background group-hover:bg-muted/50 z-30 font-medium text-center text-xs px-1 sm:px-2 py-2 sm:py-2.5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none print:w-auto print:text-black border-r border-b border-border dark:border-zinc-700">
                                        {originalIndex}
                                    </TableCell>
                                    <TableCell className="sticky left-[38px] sm:left-[50px] px-2 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap bg-background group-hover:bg-muted/50 z-10 font-medium text-xs sm:text-sm max-w-[140px] sm:max-w-none truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none print:max-w-none print:whitespace-normal print:text-black border-r border-b border-border dark:border-zinc-700">
                                        {student.name}
                                    </TableCell>
                                    {filteredDays.map((day, dIdx) => {
                                        const dateKey = format(day, "yyyy-MM-dd");
                                        const entry = data.attendanceMap[student._id]?.[dateKey];
                                        // Determine status: Database
                                        const isPresent = entry?.present;
                                        const isFriday = day.getDay() === 5;

                                        if (isFriday) {
                                            const isMiddle = index === Math.floor(displayedStudents.length / 2);

                                            const borderTop = index === 0 ? '' : 'border-t-0 print:border-t-0';
                                            const borderBottom = index === displayedStudents.length - 1 ? '' : 'border-b-0 print:border-b-0';

                                            return (
                                                <TableCell
                                                    key={day.toISOString()}
                                                    className={`text-center p-0 border-r border-b border-border dark:border-zinc-700 ${
                                                        dIdx === 0 ? 'border-l' : ''
                                                    } bg-red-50/50 print:bg-red-50 align-middle ${borderTop} ${borderBottom}`}
                                                >
                                                    <div className="flex items-center justify-center w-full h-12 relative overflow-visible">
                                                        {isMiddle && (
                                                            <span className="absolute z-0 text-xl text-red-300 font-bold tracking-[1em] uppercase [writing-mode:vertical-lr] py-4 whitespace-nowrap">
                                                                Friday
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
                                            Icon = <Check className="w-4 h-4 text-green-600 font-bold" />;
                                        } else if (isPresent === false) {
                                            Icon = (
                                                <div className="flex flex-col items-center">
                                                    <X className="w-3 h-3 text-red-600" />
                                                    {leaveReason && (
                                                        <span className="text-[7px] text-red-500 leading-none mt-0.5 line-clamp-1 max-w-[40px]">
                                                            {leaveReason}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <TableCell
                                                key={day.toISOString()}
                                                className={`text-center p-0.5 border-r border-b border-border dark:border-zinc-700 ${
                                                    dIdx === 0 ? 'border-l' : ''
                                                }`}
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
                                    {/* Empty flexible column to push active dates to left */}
                                    <TableCell className="w-full print:hidden"></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
};

export default LiteraryAttendanceSheet;
