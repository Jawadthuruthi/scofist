"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "@/components/Header";
import PrayerSection from "./PrayerSection";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    ChevronsUpDown,
    Plus,
    X,
    CheckCircle2,
    History,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Users,
    Clock,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const prayers = ["ZUHR", "ASAR", "MAGRIB", "ISHA", "SUBH"];

const DEFAULT_CATEGORIES = ["Masjid", "Haddad", "Programs", "Spot"];
const STORAGE_KEY = "masjid_attendance_categories";

// ── Combobox ───────────────────────────────────────────────────────────────
const CategoryCombobox = ({ value, onChange, categories, onAddCategory, onRemoveCategory }) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);

    const filtered = useMemo(() => {
        if (!inputValue.trim()) return categories;
        return categories.filter((c) =>
            c.toLowerCase().includes(inputValue.trim().toLowerCase())
        );
    }, [categories, inputValue]);

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        const exists = categories.some((c) => c.toLowerCase() === trimmed.toLowerCase());
        if (!exists) onAddCategory(trimmed);
        onChange(trimmed);
        setInputValue("");
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length === 1) {
                onChange(filtered[0]);
                setInputValue("");
                setOpen(false);
            } else {
                handleAdd();
            }
        }
        if (e.key === "Escape") setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-sm font-normal"
                >
                    <span className={cn(!value && "text-muted-foreground")}>
                        {value || "Select category…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0" align="start" style={{ zIndex: 9999 }}>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1 px-2 py-2 border-b">
                        <input
                            ref={inputRef}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Search or add…"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleAdd}
                            className="flex items-center justify-center h-6 w-6 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Add custom category"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                Press Enter or + to add
                            </div>
                        ) : (
                            filtered.map((cat) => (
                                <div
                                    key={cat}
                                    className={cn(
                                        "group flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground rounded-sm mx-1",
                                        value === cat && "bg-accent text-accent-foreground font-medium"
                                    )}
                                >
                                    <span
                                        className="flex-1"
                                        onClick={() => {
                                            onChange(cat);
                                            setInputValue("");
                                            setOpen(false);
                                        }}
                                    >
                                        {cat}
                                    </span>
                                    {!DEFAULT_CATEGORIES.includes(cat) && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveCategory(cat);
                                                if (value === cat) onChange("");
                                            }}
                                            className="opacity-0 group-hover:opacity-100 ml-1 text-muted-foreground hover:text-destructive transition-all"
                                            title="Remove category"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// ── Classwise view (for non-Masjid categories) ────────────────────────────
const ClasswiseSection = ({ classes, apiKey, selectedCategory, formattedDate, displayDate, isPastDate, isToday }) => {
    const router = useRouter();

    // Use category name (uppercased) as the "prayer" value to store/query
    const categoryKey = selectedCategory.toUpperCase().replace(/\s+/g, "_");

    const { useFetchItems } = useCrud("masjid/attendance", apiKey);
    const { data: attendanceData } = useFetchItems(
        0, 0,
        { date: formattedDate, prayer: categoryKey },
        { refetchOnWindowFocus: true, refetchOnMount: true }
    );

    const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
    const [presenteesDialogOpen, setPresenteesDialogOpen] = useState(false);
    const [currentAbsentees, setCurrentAbsentees] = useState([]);
    const [currentPresentees, setCurrentPresentees] = useState([]);
    const [currentClassName, setCurrentClassName] = useState("");

    const absenteesPopupRef = useRef(null);
    const { handleDownload: handleAbsenteesDownload } = useDownloadPopup(
        absenteesPopupRef,
        `Absentees_${currentClassName.replace(/\s+/g, "_")}_${categoryKey}.jpeg`
    );

    const presenteesPopupRef = useRef(null);
    const { handleDownload: handlePresenteesDownload } = useDownloadPopup(
        presenteesPopupRef,
        `Presentees_${currentClassName.replace(/\s+/g, "_")}_${categoryKey}.jpeg`
    );

    const handleShowAbsentees = (e, absentees, className) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentAbsentees(absentees);
        setCurrentClassName(className);
        setAbsenteesDialogOpen(true);
    };

    const handleShowPresentees = (e, presentees, className) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentPresentees(presentees);
        setCurrentClassName(className);
        setPresenteesDialogOpen(true);
    };

    const handleSendWhatsApp = async (e, record) => {
        e.preventDefault();
        e.stopPropagation();

        const sObj = record.studentId;
        let number =
            sObj?.studentSpecificField?.guardianContactNumber ||
            sObj?.guardianContactNumber ||
            sObj?.studentSpecificField?.guardianAlternativeNumber ||
            sObj?.guardianAlternativeNumber ||
            sObj?.studentSpecificField?.contactNumber ||
            sObj?.contactNumber ||
            sObj?.alternativeNumber;

        const studentIdStr = typeof sObj === "object" ? sObj?._id : sObj;

        if (!number && studentIdStr) {
            try {
                const res = await fetch(`/api/users?_id=${studentIdStr}`, {
                    headers: apiKey ? { "api-key": apiKey } : {},
                });
                if (res.ok) {
                    const data = await res.json();
                    const user = data?.users?.[0];
                    if (user) {
                        number =
                            user.studentSpecificField?.guardianContactNumber ||
                            user.guardianContactNumber ||
                            user.studentSpecificField?.guardianAlternativeNumber ||
                            user.guardianAlternativeNumber ||
                            user.studentSpecificField?.contactNumber ||
                            user.contactNumber ||
                            user.alternativeNumber;
                    }
                }
            } catch (err) {
                console.error("Error fetching student contact details:", err);
            }
        }

        if (!number) {
            toast.error(`No contact number found for ${sObj?.name || "this student"}.`);
            return;
        }

        let formattedNumber = String(number).replace(/\D/g, "");
        if (!formattedNumber) {
            toast.error(`Invalid contact number for ${sObj?.name || "this student"}.`);
            return;
        }

        if (formattedNumber.length === 10) {
            formattedNumber = `91${formattedNumber}`;
        }

        const studentName = sObj?.name || "Student";
        const leaveReason = record.status === "LEAVE" ? "On Leave" : "No Reason";
        const msg = `Dear parent, your child ${studentName} is absent today for ${selectedCategory} (${currentClassName}).\nLeave Reason : ${leaveReason}`;
        const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(msg)}`;

        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <>
            <div className="overflow-x-auto border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="h-10 sm:h-11">
                            <TableHead className="py-2.5 px-4 sm:px-5 font-semibold text-xs sm:text-sm">Class</TableHead>
                            <TableHead className="py-2.5 px-4 sm:px-5 text-right font-semibold text-xs sm:text-sm">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.map((cls) => {
                            const attendanceRecord = attendanceData?.attendances?.find(
                                (att) => att.classId._id === cls._id
                            );
                            const isMarked = !!attendanceRecord;

                            let absentees = [];
                            let presentees = [];
                            if (isMarked && attendanceRecord.attendanceData) {
                                absentees = attendanceRecord.attendanceData.filter(
                                    (record) => record.status === "ABSENT" || record.status === "LEAVE"
                                );
                                presentees = attendanceRecord.attendanceData.filter(
                                    (record) => record.status === "PRESENT"
                                );
                            }

                            const absenteeCount = absentees.length;
                            const presenteeCount = presentees.length;

                            const handleRowClick = () => {
                                if (isPastDate) {
                                    if (isMarked) {
                                        if (absenteeCount > 0) {
                                            setCurrentAbsentees(absentees);
                                            setCurrentClassName(cls.name);
                                            setAbsenteesDialogOpen(true);
                                        } else {
                                            setCurrentPresentees(presentees);
                                            setCurrentClassName(cls.name);
                                            setPresenteesDialogOpen(true);
                                        }
                                    }
                                    return;
                                }
                                router.push(
                                    `/dashboard/general-attendance/mark?classId=${cls._id}&className=${encodeURIComponent(cls.name)}&batchId=${cls.batchId || ""}&prayer=${categoryKey}&date=${formattedDate}&apiKey=${apiKey}&sessionLabel=${encodeURIComponent(selectedCategory)}`
                                );
                            };

                            return (
                                <TableRow
                                    key={cls._id}
                                    className={cn(
                                        "transition-colors h-14 sm:h-16",
                                        !isPastDate && "hover:bg-accent/50 cursor-pointer",
                                        isPastDate && isMarked && "hover:bg-green-100/50 dark:hover:bg-green-950/30 cursor-pointer bg-green-50/40 dark:bg-green-950/10",
                                        isPastDate && !isMarked && "cursor-default opacity-70"
                                    )}
                                    onClick={handleRowClick}
                                >
                                    <TableCell className="whitespace-nowrap py-3 px-4 sm:py-3.5 sm:px-5">
                                        <div className="text-sm sm:text-base font-semibold">{cls.name}</div>
                                        {isMarked && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span
                                                    className="text-xs sm:text-sm text-green-600 font-medium hover:underline cursor-pointer"
                                                    onClick={(e) => handleShowPresentees(e, presentees, cls.name)}
                                                >
                                                    {presenteeCount} Present
                                                </span>
                                                <span className="text-muted-foreground text-xs">·</span>
                                                <span
                                                    className="text-xs sm:text-sm text-red-600 font-medium hover:underline cursor-pointer"
                                                    onClick={(e) => handleShowAbsentees(e, absentees, cls.name)}
                                                >
                                                    {absenteeCount} Absent
                                                </span>
                                            </div>
                                        )}
                                        {!isMarked && isPastDate && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                Not Marked
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right py-3 px-4 sm:py-3.5 sm:px-5">
                                        {isMarked ? (
                                            <span className="inline-flex items-center gap-1.5 text-green-600 text-xs sm:text-sm font-semibold">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Marked
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">
                                                –
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {classes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-12 text-muted-foreground">
                                    No active classes found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Absentees Dialog */}
            <Dialog open={absenteesDialogOpen} onOpenChange={setAbsenteesDialogOpen}>
                <DialogContent ref={absenteesPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-2 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
                        <button 
                            type="button"
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus:outline-none cursor-pointer"
                            onClick={handleAbsenteesDownload}
                            title="Download Image"
                            data-html2canvas-ignore="true"
                        >
                            <Users className="h-5 w-5 text-red-500" />
                        </button>
                        <div className="flex-1 text-left space-y-0.5">
                            <DialogTitle className="text-xl font-bold m-0 text-red-600 dark:text-red-400">
                                Absentees - {currentClassName}
                            </DialogTitle>
                            <DialogDescription className="m-0">
                                {displayDate ? `${displayDate} - ${selectedCategory}` : selectedCategory}
                            </DialogDescription>
                        </div>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    <div className="text-sm border-0 px-4 py-2 max-h-80 overflow-y-auto bg-muted/5 flex-1 space-y-1">
                        {currentAbsentees.length > 0 ? (
                            <div className="space-y-1">
                                {currentAbsentees.map((record, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-3 py-2.5 px-3 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="font-medium text-muted-foreground w-6 text-center shrink-0">{idx + 1}.</span>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-foreground truncate">
                                                    {record.studentId?.name || "Unknown Student"}
                                                </span>
                                                {record.status === "LEAVE" && (
                                                    <span className="text-xs text-yellow-700 bg-yellow-100 dark:bg-yellow-950/50 dark:text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/50 mt-1 w-fit flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        On Leave
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => handleSendWhatsApp(e, record)}
                                            className="p-1.5 rounded-full text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950/40 transition-colors focus:outline-none cursor-pointer shrink-0"
                                            title={`Send WhatsApp message to parent of ${record.studentId?.name || "student"}`}
                                            data-html2canvas-ignore="true"
                                        >
                                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No students absent.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Presentees Dialog */}
            <Dialog open={presenteesDialogOpen} onOpenChange={setPresenteesDialogOpen}>
                <DialogContent ref={presenteesPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-2 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
                        <button 
                            type="button"
                            className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors focus:outline-none cursor-pointer"
                            onClick={handlePresenteesDownload}
                            title="Download Image"
                            data-html2canvas-ignore="true"
                        >
                            <Users className="h-5 w-5 text-green-500" />
                        </button>
                        <div className="flex-1 text-left space-y-0.5">
                            <DialogTitle className="text-xl font-bold m-0 text-green-600 dark:text-green-400">
                                Presentees - {currentClassName}
                            </DialogTitle>
                            <DialogDescription className="m-0">
                                {displayDate ? `${displayDate} - ${selectedCategory}` : selectedCategory}
                            </DialogDescription>
                        </div>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    <div className="text-sm border-0 px-4 py-2 max-h-80 overflow-y-auto bg-muted/5 flex-1 space-y-1">
                        {currentPresentees.length > 0 ? (
                            <div className="space-y-1">
                                {currentPresentees.map((record, idx) => (
                                    <div key={idx} className="flex items-center gap-3 py-2.5 px-3 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors">
                                        <span className="font-medium text-muted-foreground w-6 text-center shrink-0">{idx + 1}.</span>
                                        <span className="font-medium text-foreground">
                                            {record.studentId?.name || "Unknown Student"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No students present.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

// ── Main dashboard ─────────────────────────────────────────────────────────
const MasjidDashboard = ({ classes, apiKey, initialSession }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionFromUrl = searchParams?.get("session") || searchParams?.get("category") || initialSession;

    const [selectedDate, setSelectedDate] = useState(() => new Date());

    const formattedDate = useMemo(() => formatDateForDisplay(selectedDate), [selectedDate]);
    const isoDate = useMemo(() => formatDate(selectedDate), [selectedDate]);
    const today = useMemo(() => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[selectedDate.getDay()];
    }, [selectedDate]);

    const todayIso = useMemo(() => formatDate(new Date()), []);
    const isToday = isoDate === todayIso;
    const isPastDate = isoDate < todayIso;

    const handlePrevDay = () => {
        setSelectedDate((prev) => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 1);
            return d;
        });
    };

    const handleNextDay = () => {
        if (isToday) return;
        setSelectedDate((prev) => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 1);
            return d;
        });
    };

    const handleDateChange = (e) => {
        const val = e.target.value;
        if (!val) return;
        const [y, m, d] = val.split("-").map(Number);
        const newDate = new Date(y, m - 1, d);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        if (newDate > todayDate) {
            setSelectedDate(new Date());
        } else {
            setSelectedDate(newDate);
        }
    };

    const handleResetToToday = () => {
        setSelectedDate(new Date());
    };

    // Category state – persisted in localStorage
    const [categories, setCategories] = useState(() => {
        let base = DEFAULT_CATEGORIES;
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const merged = [...DEFAULT_CATEGORIES];
                    parsed.forEach((c) => { if (!merged.includes(c)) merged.push(c); });
                    base = merged;
                }
            } catch (_) {}
        }
        if (sessionFromUrl && !base.some((c) => c.toLowerCase() === sessionFromUrl.toLowerCase())) {
            base = [...base, sessionFromUrl];
        }
        return base;
    });

    const [selectedCategory, setSelectedCategory] = useState(() => {
        if (sessionFromUrl) {
            const found = DEFAULT_CATEGORIES.find((c) => c.toLowerCase() === sessionFromUrl.toLowerCase());
            return found || sessionFromUrl;
        }
        return "Masjid";
    });

    useEffect(() => {
        const sessionParam = searchParams?.get("session") || searchParams?.get("category");
        if (sessionParam) {
            setCategories((prev) => {
                const exists = prev.some((c) => c.toLowerCase() === sessionParam.toLowerCase());
                if (!exists) {
                    return [...prev, sessionParam];
                }
                return prev;
            });
            setSelectedCategory((prev) => {
                if (prev.toLowerCase() === sessionParam.toLowerCase()) return prev;
                const found = categories.find((c) => c.toLowerCase() === sessionParam.toLowerCase());
                return found || sessionParam;
            });
        }
    }, [searchParams]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
        } catch (_) {}
    }, [categories]);

    const handleAddCategory = useCallback((cat) => {
        setCategories((prev) => {
            if (prev.find((c) => c.toLowerCase() === cat.toLowerCase())) return prev;
            return [...prev, cat];
        });
    }, []);

    const handleRemoveCategory = useCallback((cat) => {
        setCategories((prev) => prev.filter((c) => c !== cat));
    }, []);

    const handleCategoryChange = (cat) => {
        setSelectedCategory(cat);
        const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
        if (cat === "Masjid") {
            params.delete("session");
        } else {
            params.set("session", cat);
        }
        const query = params.toString();
        router.replace(`/dashboard/general-attendance${query ? `?${query}` : ""}`, { scroll: false });
    };

    const isMasjid = selectedCategory === "Masjid";

    return (
        <div className="space-y-2">
            <Header
                title="GENERAL ATTENDANCE"
                subTitle={isMasjid ? "Manage Daily Prayer Attendance" : `Manage ${selectedCategory} Attendance`}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className={cn(
                        "inline-flex items-center justify-between gap-1 bg-background border border-border rounded-lg p-1 shadow-sm h-10",
                        !isToday ? "flex-1 sm:flex-initial sm:w-[310px]" : "w-full sm:w-[310px]"
                    )}>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={handlePrevDay}
                            title="Previous Day"
                            className="h-8 w-8 shrink-0 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <div className="relative flex-1 flex items-center justify-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group h-8 min-w-0">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                            <span className="text-xs sm:text-sm font-medium select-none whitespace-nowrap truncate">
                                {formattedDate}
                            </span>
                            <input
                                type="date"
                                value={isoDate}
                                max={todayIso}
                                onChange={handleDateChange}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                title="Choose Date"
                            />
                        </div>

                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={handleNextDay}
                            disabled={isToday}
                            title={isToday ? "Cannot navigate to future dates" : "Next Day"}
                            className="h-8 w-8 shrink-0 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {!isToday && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetToToday}
                            className="h-10 text-xs sm:text-sm px-3.5 bg-background shadow-sm rounded-lg border-border font-medium shrink-0"
                        >
                            Today
                        </Button>
                    )}

                    {isPastDate && (
                        <span className="hidden sm:inline-flex items-center text-xs px-2.5 rounded-lg bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-900/50 h-10 shrink-0">
                            View Only
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Session
                        </span>
                        <div className="flex-1 sm:w-56 min-w-0">
                            <CategoryCombobox
                                value={selectedCategory}
                                onChange={handleCategoryChange}
                                categories={categories}
                                onAddCategory={handleAddCategory}
                                onRemoveCategory={handleRemoveCategory}
                            />
                        </div>
                    </div>
                    <Link href="/dashboard/general-attendance/history" className="shrink-0">
                        <Button className="bg-black hover:bg-black/90 text-white shadow-md flex items-center gap-2">
                            <History className="h-4 w-4" />
                            <span>History</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── Content: prayer sections OR class list ── */}
            {isMasjid ? (
                <div className="grid gap-4 mt-4">
                    {prayers.map((prayer) => (
                        <PrayerSection
                            key={prayer}
                            prayer={prayer}
                            classes={classes}
                            date={selectedDate}
                            apiKey={apiKey}
                            sessionCategory={selectedCategory}
                        />
                    ))}
                </div>
            ) : (
                <ClasswiseSection
                    classes={classes}
                    apiKey={apiKey}
                    selectedCategory={selectedCategory}
                    formattedDate={isoDate}
                    displayDate={formattedDate}
                    isPastDate={isPastDate}
                    isToday={isToday}
                />
            )}
        </div>
    );
};

export default MasjidDashboard;
