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
import { Trophy, BookOpen, Loader2, X } from "lucide-react";
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
        setPopupOpen(true);
    };

    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    const booksRead = data?.books || [];

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
                    <CardTitle className="text-sm font-medium">Best Reader</CardTitle>
                    <Trophy className="w-4 h-4 text-yellow-500" />
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
                            <div className="flex flex-col items-center shrink-0">
                                <Avatar className="h-12 w-12 border-2 border-yellow-500">
                                    <AvatarImage src={data.student?.profilePic?.url} />
                                    <AvatarFallback>{data.student?.name?.substring(0, 2) || "BR"}</AvatarFallback>
                                </Avatar>
                                <p className="text-[10px] text-muted-foreground mt-1">{data.student?._id}</p>
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug break-words">{data.student?.name}</p>
                                <p className="text-xs text-muted-foreground leading-snug break-words">
                                    {data.student?.studentSpecificField?.classId?.name || "Unknown Class"}
                                </p>
                                <div className="flex items-center pt-0.5 text-xs text-muted-foreground">
                                    <BookOpen className="mr-1 h-3 w-3 shrink-0" />
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
                <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl p-0 gap-0 overflow-y-auto rounded-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col [&>button.absolute]:hidden">
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-background/95 dark:bg-background/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
                        <div className="p-2 rounded-lg bg-yellow-500/20 dark:bg-yellow-500/30 text-yellow-600 dark:text-yellow-500 shrink-0">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left space-y-0.5 min-w-0">
                            <DialogTitle className="text-xl font-bold m-0 text-foreground">Best Reader</DialogTitle>
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
                        {/* Student Info */}
                        {data?.student ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <Avatar className="h-10 w-10 border-2 border-yellow-500 shrink-0">
                                    <AvatarImage src={data.student?.profilePic?.url} />
                                    <AvatarFallback>{data.student?.name?.substring(0, 2) || "BR"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{data.student?.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        ID: {data.student?._id}
                                        {data.student?.studentSpecificField?.classId?.name && (
                                            <> &bull; {data.student.studentSpecificField.classId.name}</>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-bold text-yellow-600 shrink-0">
                                    <BookOpen className="h-4 w-4" />
                                    <span>{data.count} <span className="hidden sm:inline">Books</span></span>
                                </div>
                            </div>
                        ) : !loading && (
                            <div className="text-center py-6 text-sm text-muted-foreground">
                                No best reader data found for {MONTHS[parseInt(month)]} {year}.
                            </div>
                        )}

                        <div className="rounded-md border overflow-x-auto">
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
                                                    {rental.rentedDate ? format(new Date(rental.rentedDate), "dd/MM/yyyy") : "–"}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {rental.receivedDate ? (
                                                        <span className="text-green-600 font-medium">
                                                            {format(new Date(rental.receivedDate), "dd/MM/yyyy")}
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
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
