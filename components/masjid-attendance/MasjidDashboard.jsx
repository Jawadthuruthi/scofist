"use client";

import { useState, useMemo } from "react";
import { formatDateForDisplay } from "@/lib/utils";
import Header from "@/components/Header";
import PrayerSection from "./PrayerSection";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader } from "lucide-react";

const prayers = ["ZUHR", "ASAR", "MAGRIB", "ISHA", "SUBH"];

const MasjidDashboard = ({ classes, apiKey }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const formattedDate = useMemo(
        () => formatDateForDisplay(selectedDate),
        [selectedDate]
    );

    return (
        <div className="space-y-6">
            <Header
                title="MASJID ATTENDANCE"
                subTitle="Manage Daily Prayer Attendance"
            />

            <div className="flex items-center justify-between">
                <div className="px-4 py-2 border rounded-md bg-background">
                    <span className="font-medium">{formattedDate}</span>
                </div>
                <Link href="/dashboard/masjid-attendance/history">
                    <Button className="bg-black hover:bg-black/90 text-white shadow-md">
                        History
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6">
                {prayers.map((prayer) => (
                    <PrayerSection
                        key={prayer}
                        prayer={prayer}
                        classes={classes}
                        date={selectedDate}
                        apiKey={apiKey}
                    />
                ))}
            </div>
        </div>
    );
};

export default MasjidDashboard;
