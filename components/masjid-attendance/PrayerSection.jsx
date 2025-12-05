"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import useCrud from "@/hooks/use-crud";
import { formatDate } from "@/lib/utils";

const PrayerSection = ({ prayer, classes, date, apiKey }) => {
    const [isOpen, setIsOpen] = useState(false);
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
        }
    );

    const markedClassIds = new Set(
        attendanceData?.attendances?.map((att) => att.classId._id) || []
    );

    const markedCount = markedClassIds.size;
    const totalClasses = classes.length;
    const isComplete = markedCount === totalClasses && totalClasses > 0;

    return (
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
                            const isMarked = markedClassIds.has(cls._id);
                            return (
                                <Link
                                    key={cls._id}
                                    href={`/dashboard/masjid-attendance/mark?classId=${cls._id}&className=${cls.name}&batchId=${cls.batchId}&prayer=${prayer}&date=${formattedDate}&apiKey=${apiKey}`}
                                    prefetch={false}
                                >
                                    <div
                                        className={`p-4 border rounded-lg flex items-center justify-between hover:bg-accent transition-colors ${isMarked ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : ""
                                            }`}
                                    >
                                        <div>
                                            <h4 className="font-medium">{cls.name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {isMarked ? "Attendance Marked" : "Pending"}
                                            </p>
                                        </div>
                                        {isMarked ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
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
    );
};

export default PrayerSection;
