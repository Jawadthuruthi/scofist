"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, CheckCircle2, Clock, Users, X } from "lucide-react";
import Link from "next/link";
import useCrud from "@/hooks/use-crud";
import { formatDate } from "@/lib/utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

const PrayerSection = ({ prayer, classes, date, apiKey, sessionCategory }) => {
    const searchParams = useSearchParams();
    const shouldBeOpen = searchParams.get("expanded") === prayer;
    const [isOpen, setIsOpen] = useState(shouldBeOpen);
    const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
    const [presenteesDialogOpen, setPresenteesDialogOpen] = useState(false);
    const [currentAbsentees, setCurrentAbsentees] = useState([]);
    const [currentPresentees, setCurrentPresentees] = useState([]);
    const [currentClassName, setCurrentClassName] = useState("");

    const absenteesPopupRef = useRef(null);
    const { handleDownload: handleAbsenteesDownload } = useDownloadPopup(absenteesPopupRef, `Absentees_${currentClassName.replace(/\s+/g, '_')}_${prayer}.jpeg`);

    const presenteesPopupRef = useRef(null);
    const { handleDownload: handlePresenteesDownload } = useDownloadPopup(presenteesPopupRef, `Presentees_${currentClassName.replace(/\s+/g, '_')}_${prayer}.jpeg`);

    const formattedDate = formatDate(date);

    // Fetch attendance status for this prayer
    const { useFetchItems } = useCrud("masjid/attendance", apiKey);
    const { data: attendanceData, isLoading } = useFetchItems(
        0,
        0,
        {
            date: formattedDate,
            prayer,
        },
        {
            refetchOnWindowFocus: true,
            staleTime: 1000 * 60 * 5, // 5 minutes
            enabled: !!formattedDate && !!prayer,
        }
    );

    const markedClassIds = new Set(
        attendanceData?.attendances?.map((att) => att.classId._id) || []
    );

    const markedCount = markedClassIds.size;
    const totalClasses = classes.length;
    const isComplete = markedCount === totalClasses && totalClasses > 0;

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

    return (
        <>
            <Card className="border-l-4 border-l-primary">
                <CardHeader className="py-4 px-6 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-lg font-bold">{prayer}</CardTitle>
                            <Badge variant={isComplete ? "success" : "secondary"}>
                                {markedCount}/{totalClasses} Marked
                            </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardHeader>
                {isOpen && (
                    <CardContent className="pt-0 pb-4 px-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {classes.map((cls) => {
                                // Find the specific attendance record for this class
                                const attendanceRecord = attendanceData?.attendances?.find(
                                    (att) => att.classId._id === cls._id
                                );
                                const isMarked = !!attendanceRecord;

                                // Calculate absentees and presentees if marked
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

                                return (
                                    <Link
                                        key={cls._id}
                                        href={`/dashboard/masjid-attendance/mark?classId=${cls._id}&className=${cls.name}&batchId=${cls.batchId}&prayer=${prayer}&date=${formattedDate}&apiKey=${apiKey}&sessionLabel=${encodeURIComponent(sessionCategory || "General")}`}
                                        prefetch={false}
                                    >
                                        <div
                                            className={`p-4 border rounded-lg flex items-center justify-between hover:bg-accent transition-colors ${isMarked ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : ""
                                                }`}
                                        >
                                            <div>
                                                <h4 className="font-medium">
                                                    {cls.name}
                                                </h4>
                                                {isMarked ? (
                                                    <div
                                                        className="text-xs text-green-600 font-medium hover:underline cursor-pointer z-10 relative"
                                                        onClick={(e) => handleShowPresentees(e, presentees, cls.name)}
                                                    >
                                                        {presenteeCount} Present
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">
                                                        Pending
                                                    </p>
                                                )}
                                            </div>
                                            {isMarked ? (
                                                <div 
                                                    className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 cursor-pointer z-10 relative hover:bg-red-200 dark:hover:bg-red-800"
                                                    onClick={(e) => handleShowAbsentees(e, absentees, cls.name)}
                                                >
                                                    <span className="text-sm font-bold text-red-700 dark:text-red-300">
                                                        {absenteeCount}
                                                    </span>
                                                </div>
                                            ) : (
                                                <Clock className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </CardContent>
                )}
            </Card>

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
                                List of absentees for {prayer}.
                            </DialogDescription>
                        </div>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    <div className="text-sm border-0 px-4 py-1 max-h-80 overflow-y-auto bg-muted/5 flex-1">
                        {currentAbsentees.length > 0 ? (
                            <div className="space-y-0">
                                {currentAbsentees.map((record, idx) => (
                                    <div key={idx} className="flex items-center gap-3 py-1.5 px-3 border-b last:border-0 hover:bg-muted/50 rounded transition-colors">
                                        <span className="font-medium text-muted-foreground w-6 text-center">{idx + 1}.</span>
                                        <div className="flex flex-col">
                                            <span>
                                                {record.studentId?.name || "Unknown Student"}
                                            </span>
                                            {record.status === "LEAVE" && (
                                                <span className="text-xs text-yellow-600 bg-yellow-100 px-1 py-0.5 rounded border border-yellow-200 mt-0.5 w-fit flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    On Leave
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No students absent.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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
                                List of students marked present for {prayer}
                            </DialogDescription>
                        </div>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    <div className="text-sm border-0 px-4 py-1 max-h-80 overflow-y-auto bg-muted/5 flex-1">
                        {currentPresentees.length > 0 ? (
                            <div className="space-y-0">
                                {currentPresentees.map((record, idx) => (
                                    <div key={idx} className="flex items-center gap-3 py-1.5 px-3 border-b last:border-0 hover:bg-muted/50 rounded transition-colors">
                                        <span className="font-medium text-muted-foreground w-6 text-center">{idx + 1}.</span>
                                        <span>
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

export default PrayerSection;
