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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, BookOpen, Loader2 } from "lucide-react";
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
import { format } from "date-fns";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function BestReaderCard() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState(currentMonth.toString());
    const [data, setData] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    // Popup state
    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        const fetchBestReader = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/library/stats/best-reader?year=${year}&month=${month}`);
                const json = await res.json();

                if (res.ok) {
                    if (json.success && json.data) {
                        setData(json.data);
                        setDebugInfo(null);
                    } else {
                        setData(null);
                        setDebugInfo(json.debug || null);
                    }
                } else {
                    setData(null);
                    setDebugInfo({ error: json.msg || "Fetch failed" });
                }
            } catch (error) {
                console.error(error);
                setData(null);
                setDebugInfo({ error: error.message });
            } finally {
                setLoading(false);
            }
        };

        fetchBestReader();
    }, [year, month]);

    const handleCardClick = () => {
        if (!data?.student?._id) return;
        setPopupOpen(true);
    };

    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    const booksRead = data?.books || [];

    return (
        <>
            <Card
                className={`h-full ${data ? "cursor-pointer hover:border-primary transition-all active:scale-[0.98]" : ""}`}
                onClick={handleCardClick}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Best Reader</CardTitle>
                    <Trophy className="w-4 h-4 text-yellow-500" />
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
                            <div className="flex flex-col items-center">
                                <Avatar className="h-12 w-12 border-2 border-yellow-500">
                                    <AvatarImage src={data.student?.profilePic?.url} />
                                    <AvatarFallback>{data.student?.name?.substring(0, 2) || "BR"}</AvatarFallback>
                                </Avatar>
                                <p className="text-[10px] text-muted-foreground mt-1">{data.student?._id}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">{data.student?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {data.student?.studentSpecificField?.classId?.name || "Unknown Class"}
                                </p>
                                <div className="flex items-center pt-1 text-xs text-muted-foreground">
                                    <BookOpen className="mr-1 h-3 w-3" />
                                    {data.count} Books
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

            {/* Books Read Popup */}
            <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 uppercase text-lg">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            BOOKS READ - {MONTHS[parseInt(month)]} - {year}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Student Info */}
                    {data?.student && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-3">
                            <Avatar className="h-10 w-10 border-2 border-yellow-500">
                                <AvatarImage src={data.student?.profilePic?.url} />
                                <AvatarFallback>{data.student?.name?.substring(0, 2) || "BR"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="text-sm font-semibold">{data.student?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    ID: {data.student?._id}
                                    {data.student?.studentSpecificField?.classId?.name && (
                                        <> &bull; {data.student.studentSpecificField.classId.name}</>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-bold text-yellow-600">
                                <BookOpen className="h-4 w-4" />
                                <span>{data.count} <span className="hidden sm:inline">Books</span></span>
                            </div>
                        </div>
                    )}

                        <div className="rounded-md border overflow-auto max-h-[300px]">
                            <Table className="whitespace-nowrap">
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-8">#</TableHead>
                                        <TableHead>Book ID</TableHead>
                                        <TableHead>Book Name</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Language</TableHead>
                                        <TableHead>Rented On</TableHead>
                                        <TableHead>Returned On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {booksRead.length > 0 ? (
                                        booksRead.map((rental, idx) => (
                                            <TableRow key={rental._id}>
                                                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                                <TableCell className="font-medium text-primary text-sm">
                                                    {rental.bookId?.id || "–"}
                                                </TableCell>
                                                <TableCell className="book-text-font text-sm">
                                                    {rental.bookId?.name || "Unknown"}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground uppercase">
                                                    {rental.bookId?.author || "–"}
                                                </TableCell>
                                                <TableCell className="text-xs uppercase">
                                                    {rental.bookId?.category || "–"}
                                                </TableCell>
                                                <TableCell className="text-xs uppercase">
                                                    {rental.bookId?.language || "–"}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {rental.rentedDate ? format(new Date(rental.rentedDate), "PP") : "–"}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {rental.receivedDate ? (
                                                        <span className="text-green-600 font-medium">
                                                            {format(new Date(rental.receivedDate), "PP")}
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-500 font-semibold">Pending</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                No books found for this period
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
