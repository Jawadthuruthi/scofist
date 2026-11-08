"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { sortClasses } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback } from "react";

export default function TodayStatusModal({ type = "student", students = [], classes = [], customTrigger }) {
    const [open, setOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState("all");
    const [selectedPerson, setSelectedPerson] = useState("");
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    // Default to today in local time
    const [selectedDateStr, setSelectedDateStr] = useState(() => {
        const today = new Date();
        return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
    });

    const handlePrevDay = () => {
        setSelectedDateStr(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 1);
            return d.toISOString().split("T")[0];
        });
    };

    const handleNextDay = () => {
        setSelectedDateStr(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 1);
            return d.toISOString().split("T")[0];
        });
    };

    // Sort classes by ID (value) and filter out inactive classes
    const activeSortedClasses = useMemo(() => {
        if (!classes || classes.length === 0) return [];
        return classes
            .filter(c => c.status !== "Closed") // Only active classes
            .sort((a, b) => {
                const classCompare = sortClasses(a, b, (x) => x.originalName || x.label || x.name || "");
                if (classCompare !== 0) return classCompare;
                return String(a.label || a.name || "").localeCompare(String(b.label || b.name || ""));
            });
    }, [classes]);

    const filteredStudents = useMemo(() => {
        if (type !== "student") return students;
        
        // Filter active students only, and by selected class if any
        const filtered = students.filter(s => {
            const status = s.studentSpecificField?.status;
            // A student is active if status is not explicitly dropped out or graduated
            const isActive = status !== "Dropped Out" && status !== "Graduated";
            if (!isActive) return false;
            
            if (selectedClassId !== "all") {
                const sClassId = s.classId || s.studentSpecificField?.classId || s.studentSpecificField?.admissionClassId;
                
                if (sClassId) {
                    // Try to match by ID first, as it's the most reliable
                    if (sClassId === selectedClassId || sClassId._id === selectedClassId) {
                        return true;
                    }
                }
                
                // Fallback to name matching if IDs are missing (shouldn't happen with updated API)
                const selectedClass = activeSortedClasses.find(c => c.value === selectedClassId);
                const selectedClassLabel = selectedClass?.originalName || selectedClass?.label;
                const getClassName = (st) => st.className || st.studentSpecificField?.className || "";
                
                return getClassName(s) === selectedClassLabel;
            }
            return true;
        });
        
        // Sort by Admission Number (Student ID)
        return filtered.sort((a, b) => {
            const getAdmNo = (s) => parseInt(s.studentSpecificField?.admissionNumber) || 0;
            const admA = getAdmNo(a);
            const admB = getAdmNo(b);
            
            if (admA !== admB) {
                return admA - admB;
            }
            
            const idA = a.value || a._id || "";
            const idB = b.value || b._id || "";
            return idA.localeCompare(idB);
        });
    }, [students, type, selectedClassId, activeSortedClasses]);

    const fetchTodayRecords = useCallback(async () => {
        if (!selectedPerson) {
            setRecords([]);
            return;
        }
        setLoading(true);
        try {
            const timestamp = Date.now();
            const endpoint = type === "student" 
                ? `/api/student-attendance-lookup?studentId=${selectedPerson}&date=${selectedDateStr}&includeScheduleForDate=${selectedDateStr}&_t=${timestamp}`
                : `/api/teacher-attendance-lookup?teacherId=${selectedPerson}&date=${selectedDateStr}&_t=${timestamp}`;
            
            const res = await fetch(endpoint, { cache: "no-store" });
            const data = await res.json();
            const allRecords = data.records || [];
            
            // Filter only selected date's records
            const todayRecords = allRecords.filter(r => {
                const rDate = new Date(r.date);
                const rDateStr = new Date(rDate.getTime() - (rDate.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
                return rDateStr === selectedDateStr;
            });
            
            // Deduplicate by periodNumber (in case of legacy DB duplicates)
            const uniqueRecordsMap = new Map();
            todayRecords.forEach(r => {
                if (!uniqueRecordsMap.has(r.periodNumber)) {
                    uniqueRecordsMap.set(r.periodNumber, r);
                }
            });
            const uniqueRecords = Array.from(uniqueRecordsMap.values());
            
            // Ensure they are sorted by periodNumber ascending
            uniqueRecords.sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0));

            setRecords(uniqueRecords);
        } catch (error) {
            console.error(error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [selectedPerson, type, selectedDateStr]);

    useEffect(() => {
        fetchTodayRecords();
    }, [fetchTodayRecords]);

    // When modal closes, reset state
    useEffect(() => {
        if (!open) {
            setSelectedClassId("all");
            setSelectedPerson("");
            setRecords([]);
            const today = new Date();
            setSelectedDateStr(new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split("T")[0]);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {customTrigger || (
                    <Button 
                        variant="outline" 
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 bg-white hover:bg-neutral-100"
                        title="Today's Status"
                    >
                        <CalendarDays className="h-4 w-4 text-black" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-xl max-h-[85vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
                <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
                    <DialogTitle className="flex-1 text-xl font-bold m-0 text-left">Status</DialogTitle>
                    
                    <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 bg-neutral-100 rounded-md p-0.5 border border-neutral-200">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handlePrevDay}
                                title="Previous Day"
                                className="h-7 w-7 rounded-sm hover:bg-white text-muted-foreground hover:text-black"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <input 
                                type="date"
                                value={selectedDateStr}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setSelectedDateStr(e.target.value);
                                    }
                                }}
                                className="bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 px-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer h-7"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleNextDay}
                                title="Next Day"
                                className="h-7 w-7 rounded-sm hover:bg-white text-muted-foreground hover:text-black"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={fetchTodayRecords} 
                            disabled={loading || !selectedPerson}
                            title="Refresh Status"
                            className="h-8 w-8 text-muted-foreground hover:text-black transition-colors rounded-full bg-neutral-100/50 hover:bg-neutral-100 shrink-0"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-3 p-5 overflow-y-auto">
                    {type === "student" ? (
                        <div className="flex gap-4 w-full">
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-sm font-medium">Class</label>
                                <Select 
                                    value={selectedClassId} 
                                    onValueChange={(val) => {
                                        setSelectedClassId(val);
                                        setSelectedPerson("");
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Class..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {activeSortedClasses.map(c => (
                                            <SelectItem key={c.value} value={c.value}>
                                                {c.originalName || c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-sm font-medium">Student</label>
                                <Select 
                                    value={selectedPerson} 
                                    onValueChange={setSelectedPerson}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Student..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredStudents.map(s => {
                                            const admNo = s.studentSpecificField?.admissionNumber || s.value || s._id;
                                            const displayLabel = admNo ? `${s.label || s.name} (${admNo})` : (s.label || s.name);
                                            return (
                                                <SelectItem key={s.value || s._id} value={s.value || s._id}>
                                                    {displayLabel}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-sm font-medium">Teacher</label>
                            <Select 
                                value={selectedPerson} 
                                onValueChange={setSelectedPerson}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Teacher..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(s => (
                                        <SelectItem key={s.value || s._id} value={s.value || s._id}>
                                            {s.label || s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="mt-4 border rounded-md max-h-[350px] overflow-auto relative">
                        {loading ? (
                            <div className="flex h-[200px] items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : !selectedPerson ? (
                            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                Please select a {type} to view today's status.
                            </div>
                        ) : records.length === 0 ? (
                            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                No records found for today.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-12 text-center">Period</TableHead>
                                        <TableHead>{type === "student" ? "Subject / Teacher" : "Subject / Class"}</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((rec, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col gap-0.5 items-center justify-center">
                                                    <span className="font-semibold text-sm">{rec.periodNumber || i + 1}</span>
                                                    {rec.periodTime && (
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                            {rec.periodTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm leading-tight">{rec.subjectName}</span>
                                                    <span className="text-[10px] text-muted-foreground leading-tight italic">
                                                        {type === "student" ? (rec.teacherName || "—") : (rec.className || "—")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {rec.present === true ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0 text-[10px] uppercase font-bold tracking-tight">
                                                        Present
                                                    </Badge>
                                                ) : rec.present === false ? (
                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                        <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0 text-[10px] uppercase font-bold tracking-tight">
                                                            Absent
                                                        </Badge>
                                                        {rec.leaveReason && (
                                                            <span className="text-[10px] text-red-600/90 font-medium text-center leading-tight">
                                                                {rec.leaveReason}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm font-medium tracking-tight opacity-70">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
