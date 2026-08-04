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
import { Book, Star, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
        if (!data) return;
        setPopupOpen(true);
    };

    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    const students = data?.students || [];

    return (
        <>
            <Card
                className={`h-full ${data ? "cursor-pointer hover:border-primary transition-all active:scale-[0.98]" : ""}`}
                onClick={handleCardClick}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Most Read Book</CardTitle>
                    <Star className="w-4 h-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4" onClick={e => e.stopPropagation()}>
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
                            <SelectTrigger className="w-[110px]">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((m, i) => (
                                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : data ? (
                        <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 flex items-center justify-center bg-secondary rounded-md border text-purple-600">
                                <Book className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none line-clamp-1" title={data.book?.name}>{data.book?.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                    {data.book?.author || "Unknown Author"}
                                </p>
                                <div className="flex items-center pt-1 text-xs text-muted-foreground">
                                    <Star className="mr-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
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
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 uppercase text-lg">
                            <Star className="w-5 h-5 text-purple-500" />
                            STUDENTS LIST - {MONTHS[parseInt(month)]} - {year}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Book Info */}
                    {data?.book && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-3">
                            <div className="h-10 w-10 flex items-center justify-center bg-secondary rounded-md border text-purple-600 shrink-0">
                                <Book className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold book-text-font">{data.book.name}</p>
                                <div className="text-xs text-muted-foreground uppercase flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                                    <span>{data.book.author || "Unknown Author"}</span>
                                    {data.book.id && (
                                        <span className="text-[10px] sm:text-xs">
                                            <span className="hidden sm:inline">&bull; </span>ID: {data.book.id}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-bold text-purple-600">
                                <Users className="h-4 w-4" />
                                <span>{data.count} <span className="hidden sm:inline">Rentals</span></span>
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border overflow-auto max-h-[300px]">
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
                                                {student.rentedDate ? format(new Date(student.rentedDate), "PP") : "–"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {student.receivedDate ? (
                                                    <span className="text-green-600 font-medium">
                                                        {format(new Date(student.receivedDate), "PP")}
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
                </DialogContent>
            </Dialog>
        </>
    );
}
