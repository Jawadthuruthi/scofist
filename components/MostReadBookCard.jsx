"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Book, Star, Loader2, Users, X } from "lucide-react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function MostReadBookCard() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState(currentMonth.toString());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Popup state
    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        const fetchMostReadBook = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/library/stats/most-read-book?year=${year}&month=${month}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json.data);
                } else {
                    setData(null);
                }
            } catch (error) {
                console.error(error);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchMostReadBook();
    }, [year, month]);

    const handleCardClick = () => {
        setPopupOpen(true);
    };

    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    const students = data?.students || [];

    return (
        <>
            <Card
                role="button"
                tabIndex={0}
                className="h-full cursor-pointer hover:border-primary/60 hover:shadow-md transition-all active:scale-[0.98] select-none"
                onClick={handleCardClick}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardClick();
                    }
                }}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Most Read Book</CardTitle>
                    <Star className="w-4 h-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="w-fit flex gap-2" onClick={e => e.stopPropagation()}>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[80px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="w-[135px] sm:w-[140px]">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m, i) => (
                                        <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : data ? (
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="h-12 w-12 flex items-center justify-center bg-secondary rounded-md border text-purple-600 shrink-0">
                                <Book className="w-6 h-6" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug book-text-font break-words" title={data.book?.name}>{data.book?.name}</p>
                                <p className="text-xs text-muted-foreground leading-snug break-words">
                                    {data.book?.author || "Unknown Author"}
                                </p>
                                <div className="flex items-center pt-0.5 text-xs text-muted-foreground">
                                    <Star className="mr-1 h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                                    {data.count} Rentals
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-center text-muted-foreground py-4">
                            No data for this period
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Students Popup */}
            <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
                <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl p-0 gap-0 overflow-y-auto rounded-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col [&>button.absolute]:hidden">
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-background/95 dark:bg-background/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
                        <div className="p-2 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 text-purple-600 dark:text-purple-400 shrink-0">
                            <Star className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left space-y-0.5 min-w-0">
                            <DialogTitle className="text-xl font-bold m-0 text-foreground">Most Read Book</DialogTitle>
                            <DialogDescription asChild>
                                <div className="text-sm text-muted-foreground m-0">
                                    {MONTHS[parseInt(month)]} {year}
                                </div>
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <DialogClose asChild>
                                <button className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer">
                                    <X className="h-5 w-5" />
                                </button>
                            </DialogClose>
                        </div>
                    </DialogHeader>

                    <div className="p-5 space-y-4">
                        {/* Book Info */}
                        {data?.book ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="h-10 w-10 flex items-center justify-center bg-secondary rounded-md border text-purple-600 shrink-0">
                                    <Book className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold book-text-font truncate">{data.book.name}</p>
                                    <div className="text-xs text-muted-foreground uppercase flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 truncate">
                                        <span>{data.book.author || "Unknown Author"}</span>
                                        {data.book.id && (
                                            <span className="text-[10px] sm:text-xs">
                                                <span className="hidden sm:inline">&bull; </span>ID: {data.book.id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-bold text-purple-600 shrink-0">
                                    <Users className="h-4 w-4" />
                                    <span>{data.count} <span className="hidden sm:inline">Rentals</span></span>
                                </div>
                            </div>
                        ) : !loading && (
                            <div className="text-center py-6 text-sm text-muted-foreground">
                                No most read book data found for {MONTHS[parseInt(month)]} {year}.
                            </div>
                        )}

                        <div className="rounded-md border overflow-x-auto">
                        <Table className="whitespace-nowrap">
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-8">#</TableHead>
                                    <TableHead>Student ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Class / Batch</TableHead>
                                    <TableHead>Rented On</TableHead>
                                    <TableHead>Returned On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.length > 0 ? (
                                    students.map((student, idx) => (
                                        <TableRow key={`${student._id}-${idx}`}>
                                            <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                            <TableCell className="font-medium text-primary text-sm">
                                                {student._id || "–"}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                {student.name || "Unknown"}
                                                {student.admissionNumber && (
                                                    <span className="ml-1 text-xs text-muted-foreground">
                                                        ({student.admissionNumber})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    {student.batchName && (
                                                        <span className="text-xs font-medium text-foreground">{student.batchName}</span>
                                                    )}
                                                    {student.className && (
                                                        <span className="text-[11px] text-muted-foreground">{student.className}</span>
                                                    )}
                                                    {!student.batchName && !student.className && (
                                                        <span className="text-muted-foreground text-xs">–</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {student.rentedDate ? format(new Date(student.rentedDate), "dd/MM/yyyy") : "–"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {student.receivedDate ? (
                                                    <span className="text-green-600 font-medium">
                                                        {format(new Date(student.receivedDate), "dd/MM/yyyy")}
                                                    </span>
                                                ) : (
                                                    <span className="text-red-500 font-semibold">Pending</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No student records found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
