"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Calendar as CalendarIcon,
    Users,
    BookOpen,
    Presentation,
    Loader2,
    X,
    ArrowLeft,
    ChevronRight,
    Crown,
    Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { cn, sortClasses } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";

export default function LiterarySummaryCard({ apiKey }) {
    // Default to All Time so it strictly matches the History default view
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [selectedModal, setSelectedModal] = useState(null); // 'groups' | 'groupMeetings' | 'generalMeetings' | null
    const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);
    const [selectedMeetingForAbsentees, setSelectedMeetingForAbsentees] = useState(null);

    // Fetch Total Groups
    // Assuming 'literary/groups' returns an array of groups
    const { useFetchItems: useFetchGroups } = useCrud("literary/groups", apiKey);
    const groupsQuery = useFetchGroups(0, 0, {}, {
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    });

    const totalGroups = useMemo(() => {
        return groupsQuery.data?.groups?.length || 0;
    }, [groupsQuery.data]);

    // Fetch Attendances for the date range
    // Convert dates to YYYY-MM-DD for the API if necessary, or just rely on API date filtering
    // Depending on the API, it might support fromDate and toDate query params.
    // Let's pass them as strings formatted properly, or fetch all and filter client-side if the API doesn't support range natively

    const formattedFromDate = fromDate ? format(fromDate, "yyyy-MM-dd") : undefined;
    const formattedToDate = toDate ? format(toDate, "yyyy-MM-dd") : undefined;

    const { useFetchItems: useFetchAttendances } = useCrud("literary/attendances", apiKey);

    // We pass the dates for caching keys. If API supports range filtering:
    const queryParams = { trackHistory: true };
    if (formattedFromDate) queryParams.startDate = formattedFromDate;
    if (formattedToDate) queryParams.endDate = formattedToDate;

    const attendancesQuery = useFetchAttendances(0, 0, queryParams, {
        staleTime: 1000 * 60 * 5
    });

    const { groupMeetingsList, generalMeetingsList, attendanceStats } = useMemo(() => {
        let groupMeetings = 0;
        let generalMeetings = 0;
        const groupList = [];
        const generalList = [];

        const history = attendancesQuery.data?.history || [];

        // Filter client-side just in case the API doesn't support startDate/endDate params
        const fromTime = formattedFromDate ? new Date(formattedFromDate).getTime() : 0;
        const toTime = formattedToDate ? new Date(formattedToDate).setHours(23, 59, 59, 999) : Infinity;

        history.forEach(record => {
            const recordTime = new Date(record.date).getTime();

            if (recordTime >= fromTime && recordTime <= toTime) {
                if (record.category === "GROUP") {
                    groupMeetings++;
                    groupList.push(record);
                } else if (record.category === "ALL") {
                    generalMeetings++;
                    generalList.push(record);
                }
            }
        });

        groupList.sort((a, b) => new Date(b.date) - new Date(a.date));
        generalList.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            groupMeetingsList: groupList,
            generalMeetingsList: generalList,
            attendanceStats: {
                groupMeetings,
                generalMeetings
            }
        };
    }, [attendancesQuery.data, formattedFromDate, formattedToDate]);

    const groupsList = useMemo(() => {
        return groupsQuery.data?.groups || [];
    }, [groupsQuery.data]);

    const handleCloseDialog = () => {
        setSelectedModal(null);
        setSelectedTeamForDetails(null);
        setSelectedMeetingForAbsentees(null);
    };

    const groupedAbsentees = useMemo(() => {
        if (!selectedMeetingForAbsentees?.absentees) return [];
        const grouped = {};
        selectedMeetingForAbsentees.absentees.forEach((st) => {
            const cName = st.className || "Class Not Assigned";
            if (!grouped[cName]) grouped[cName] = [];
            grouped[cName].push(st);
        });
        return Object.entries(grouped).sort(([a], [b]) =>
            sortClasses(a, b, (x) => x)
        );
    }, [selectedMeetingForAbsentees]);

    const groupedTeamMembers = useMemo(() => {
        if (!selectedTeamForDetails) return [];
        const list = selectedTeamForDetails.studentsDetails || [];
        if (list.length > 0) {
            const grouped = {};
            list.forEach((st) => {
                const cName = st.className || "Class Not Assigned";
                if (!grouped[cName]) grouped[cName] = [];
                grouped[cName].push(st);
            });
            return Object.entries(grouped).sort(([a], [b]) =>
                sortClasses(a, b, (x) => x)
            );
        }
        if (Array.isArray(selectedTeamForDetails.studentsName) && selectedTeamForDetails.studentsName.length > 0) {
            return [
                ["All Members", selectedTeamForDetails.studentsName.map((s) => ({ _id: s.split(" ")[0], name: s, className: "" }))]
            ];
        }
        return [];
    }, [selectedTeamForDetails]);

    const isLoading = groupsQuery.isLoading || attendancesQuery.isLoading;

    const currentMeetingsList =
        selectedModal === "groupMeetings"
            ? groupMeetingsList
            : selectedModal === "generalMeetings"
            ? generalMeetingsList
            : [];

    return (
        <Card className="">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 pb-2 bg-muted/30 border-b gap-4">
                <CardTitle className="text-lg font-bold">Literary Overview</CardTitle>

                {/* Date Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[140px] justify-start text-left font-normal bg-background h-8",
                                        !fromDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {fromDate ? format(fromDate, "dd MMM yyyy") : <span>From</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={fromDate}
                                    onSelect={(date) => date && setFromDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground text-sm">to</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[140px] justify-start text-left font-normal bg-background h-8",
                                        !toDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {toDate ? format(toDate, "dd MMM yyyy") : <span>To</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={toDate}
                                    onSelect={(date) => date && setToDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Total Groups */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedModal("groups")}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedModal("groups")}
                        className="flex items-center gap-4 p-4 border rounded-lg bg-card/50 shadow-sm hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer select-none active:scale-[0.99]"
                        title="Click to view all groups"
                    >
                        <div className="p-3 bg-primary/10 text-primary rounded-full shrink-0">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Groups</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {groupsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : totalGroups}
                            </h3>
                        </div>
                    </div>

                    {/* Group Meetings */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedModal("groupMeetings")}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedModal("groupMeetings")}
                        className="flex items-center gap-4 p-4 border rounded-lg bg-card/50 shadow-sm hover:bg-muted/50 hover:border-blue-500/50 transition-all cursor-pointer select-none active:scale-[0.99]"
                        title="Click to view group meeting dates"
                    >
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full shrink-0">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Group <span className="hidden sm:inline">Meetings</span></p>
                            <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                                {attendancesQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : attendanceStats.groupMeetings}
                            </h3>
                        </div>
                    </div>

                    {/* General Meetings */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedModal("generalMeetings")}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedModal("generalMeetings")}
                        className="flex items-center gap-4 p-4 border rounded-lg bg-card/50 shadow-sm hover:bg-muted/50 hover:border-green-500/50 transition-all cursor-pointer select-none active:scale-[0.99]"
                        title="Click to view general meeting dates"
                    >
                        <div className="p-3 bg-green-500/10 text-green-500 rounded-full shrink-0">
                            <Presentation className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">General <span className="hidden sm:inline">Meetings</span></p>
                            <h3 className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                                {attendancesQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : attendanceStats.generalMeetings}
                            </h3>
                        </div>
                    </div>

                </div>
            </CardContent>

            {/* Popup Dialog for Cards */}
            <Dialog open={Boolean(selectedModal)} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[75vh] sm:max-h-[85vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
                    <DialogHeader className={cn(
                        "flex flex-row items-center gap-3 mx-0 px-5 py-3 border-b space-y-0 sticky top-0 z-20 backdrop-blur-md",
                        selectedMeetingForAbsentees
                            ? "bg-red-50/80 dark:bg-red-950/30"
                            : "bg-muted/50 dark:bg-muted/20"
                    )}>
                        {/* Back Arrow when drilled into team or absentees */}
                        {selectedTeamForDetails && (
                            <button
                                type="button"
                                onClick={() => setSelectedTeamForDetails(null)}
                                className="p-1.5 -ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                title="Back to Groups"
                                aria-label="Back to Groups"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}
                        {selectedMeetingForAbsentees && (
                            <button
                                type="button"
                                onClick={() => setSelectedMeetingForAbsentees(null)}
                                className="p-1.5 -ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                title="Back to Meetings"
                                aria-label="Back to Meetings"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}

                        <div className={cn(
                            "p-2 rounded-lg shrink-0",
                            selectedMeetingForAbsentees
                                ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                                : (selectedModal === "groups" || selectedTeamForDetails)
                                ? "bg-primary/10 text-primary"
                                : selectedModal === "groupMeetings"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-green-500/10 text-green-500"
                        )}>
                            {selectedMeetingForAbsentees ? (
                                <Users className="h-5 w-5" />
                            ) : (selectedModal === "groups" || selectedTeamForDetails) ? (
                                <Users className="h-5 w-5" />
                            ) : selectedModal === "groupMeetings" ? (
                                <BookOpen className="h-5 w-5" />
                            ) : (
                                <Presentation className="h-5 w-5" />
                            )}
                        </div>

                        <div className="flex-1 text-left space-y-0.5 min-w-0">
                            <DialogTitle className={cn(
                                "text-xl font-bold m-0 truncate",
                                selectedMeetingForAbsentees
                                    ? "text-red-600 dark:text-red-400"
                                    : (selectedModal === "groups" || selectedTeamForDetails)
                                    ? "text-foreground"
                                    : selectedModal === "groupMeetings"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-green-600 dark:text-green-400"
                            )}>
                                {selectedMeetingForAbsentees ? (
                                    `Absentees (${selectedMeetingForAbsentees.absentees?.length || 0})`
                                ) : selectedTeamForDetails ? (
                                    selectedTeamForDetails.name
                                ) : selectedModal === "groups" ? (
                                    "Total Groups"
                                ) : selectedModal === "groupMeetings" ? (
                                    "Group Meetings"
                                ) : (
                                    "General Meetings"
                                )}
                            </DialogTitle>
                            <DialogDescription className="m-0 text-xs text-muted-foreground truncate">
                                {selectedMeetingForAbsentees ? (
                                    `${selectedMeetingForAbsentees.dateForDisplay || (selectedMeetingForAbsentees.date ? format(new Date(selectedMeetingForAbsentees.date), "dd MMM yyyy") : "")} • ${selectedMeetingForAbsentees.category === "GROUP" ? "Group Meeting" : "General Meeting"}`
                                ) : selectedTeamForDetails ? (
                                    `${selectedTeamForDetails.studentsDetails?.length || selectedTeamForDetails.studentsId?.length || 0} Members`
                                ) : selectedModal === "groups" ? (
                                    `${totalGroups} active literary groups`
                                ) : selectedModal === "groupMeetings" ? (
                                    `${groupMeetingsList.length} meetings recorded`
                                ) : (
                                    `${generalMeetingsList.length} meetings recorded`
                                )}
                            </DialogDescription>
                        </div>
                        <DialogClose
                            onClick={handleCloseDialog}
                            className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0 cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>

                    {/* Dialog Content List */}
                    <div className="text-sm px-4 py-3 max-h-[60vh] overflow-y-auto bg-muted/5 flex-1 space-y-2">
                        {/* 1. Absentees View (when an absent badge is clicked) */}
                        {selectedMeetingForAbsentees ? (
                            groupedAbsentees.length > 0 ? (
                                <div className="space-y-3">
                                    {groupedAbsentees.map(([className, students]) => {
                                        const sortedStudents = [...students].sort((s1, s2) => {
                                            const idComp = String(s1.studentId || "").localeCompare(String(s2.studentId || ""), undefined, { numeric: true });
                                            if (idComp !== 0) return idComp;
                                            return (s1.studentName || "").localeCompare(s2.studentName || "");
                                        });

                                        return (
                                            <div key={className} className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-2xs">
                                                <div className="flex items-center justify-between px-3.5 py-2 bg-muted/60 border-b">
                                                    <span className="font-bold text-xs sm:text-sm text-foreground">{className}</span>
                                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        {sortedStudents.length} Absent
                                                    </span>
                                                </div>
                                                <div className="divide-y divide-border/40">
                                                    {sortedStudents.map((st, idx) => (
                                                        <div key={st.studentId || idx} className="flex items-center justify-between py-2 px-3 hover:bg-muted/30 transition-colors text-xs">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className="text-muted-foreground font-mono w-5 text-center shrink-0 text-[11px]">
                                                                    {idx + 1}.
                                                                </span>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-semibold text-foreground truncate">
                                                                        {st.studentName || "—"}
                                                                    </span>
                                                                    {st.groupName && (
                                                                        <span className="text-[10px] text-muted-foreground truncate">
                                                                            Team: {st.groupName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded shrink-0">
                                                                {st.studentId || "—"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-6 text-sm">
                                    No students were absent on this day.
                                </p>
                            )
                        ) : selectedTeamForDetails ? (
                            /* 2. Team Details View (when a group in Total Groups is clicked) */
                            <div className="space-y-3">
                                {/* Leaders Header Card */}
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                                        <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                                            <Crown className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                                Team Leader
                                            </span>
                                            <span className="text-xs font-semibold text-foreground truncate">
                                                {selectedTeamForDetails.leaderName || (selectedTeamForDetails.leaderId?.name ? `${selectedTeamForDetails.leaderId.name} (${selectedTeamForDetails.leaderId._id})` : "Not Assigned")}
                                            </span>
                                        </div>
                                    </div>

                                    {(selectedTeamForDetails.assistantLeaderName || selectedTeamForDetails.assistantLeaderId) && (
                                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5">
                                            <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500 shrink-0">
                                                <Shield className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                    Assistant Leader
                                                </span>
                                                <span className="text-xs font-semibold text-foreground truncate">
                                                    {selectedTeamForDetails.assistantLeaderName || (selectedTeamForDetails.assistantLeaderId?.name ? `${selectedTeamForDetails.assistantLeaderId.name} (${selectedTeamForDetails.assistantLeaderId._id})` : "Not Assigned")}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Class-wise Members List */}
                                <div className="space-y-3">
                                    {groupedTeamMembers.length > 0 ? (
                                        groupedTeamMembers.map(([className, members]) => {
                                            const sortedMembers = [...members].sort((m1, m2) => {
                                                const idComp = String(m1._id || "").localeCompare(String(m2._id || ""), undefined, { numeric: true });
                                                if (idComp !== 0) return idComp;
                                                return (m1.name || "").localeCompare(m2.name || "");
                                            });

                                            return (
                                                <div key={className} className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-2xs">
                                                    <div className="flex items-center justify-between px-3.5 py-2 bg-muted/60 border-b">
                                                        <span className="font-bold text-xs sm:text-sm text-foreground">{className}</span>
                                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                            {sortedMembers.length} {sortedMembers.length === 1 ? "student" : "students"}
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-border/40">
                                                        {sortedMembers.map((member, idx) => {
                                                            const isLeader = member._id === selectedTeamForDetails.leaderId?._id || member._id === selectedTeamForDetails.leaderId;
                                                            const isAssist = member._id === selectedTeamForDetails.assistantLeaderId?._id || member._id === selectedTeamForDetails.assistantLeaderId;

                                                            return (
                                                                <div key={member._id || idx} className="flex items-center justify-between py-2 px-3 hover:bg-muted/30 transition-colors text-xs">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <span className="text-muted-foreground font-mono w-5 text-center shrink-0 text-[11px]">
                                                                            {idx + 1}.
                                                                        </span>
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="font-semibold text-foreground truncate">
                                                                                {member.name}
                                                                            </span>
                                                                            {isLeader && (
                                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                                                                                    Leader
                                                                                </span>
                                                                            )}
                                                                            {isAssist && (
                                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shrink-0">
                                                                                    Asst. Leader
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded shrink-0">
                                                                        {member._id || "—"}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center text-muted-foreground py-6 text-sm">No members found in this group.</p>
                                    )}
                                </div>
                            </div>
                        ) : selectedModal === "groups" ? (
                            /* 3. Total Groups List */
                            groupsList.length > 0 ? (
                                groupsList.map((group, idx) => {
                                    const studentCount = group.studentsDetails?.length || group.studentsId?.length || 0;
                                    const leaderName = group.leaderName || group.leaderId?.name;

                                    return (
                                        <div
                                            key={group._id || idx}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setSelectedTeamForDetails(group)}
                                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedTeamForDetails(group)}
                                            className="flex items-center justify-between gap-3 py-2.5 px-3 border border-border/60 bg-card rounded-lg hover:bg-muted/60 hover:border-primary/40 transition-all shadow-2xs cursor-pointer select-none active:scale-[0.99]"
                                            title="Click to view team members and leaders"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="font-semibold text-xs text-muted-foreground w-5 text-center shrink-0">
                                                    {idx + 1}.
                                                </span>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-sm text-foreground truncate">
                                                        {group.name}
                                                    </span>
                                                    {leaderName && (
                                                        <span className="text-[11px] text-muted-foreground truncate">
                                                            Leader: {leaderName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                                                    {studentCount} {studentCount === 1 ? "student" : "students"}
                                                </span>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center text-muted-foreground py-6 text-sm">No groups found.</p>
                            )
                        ) : (
                            /* 4. Group / General Meetings List */
                            currentMeetingsList.length > 0 ? (
                                currentMeetingsList.map((record, idx) => {
                                    const d = new Date(record.date);
                                    const dayName = !isNaN(d.getTime()) ? format(d, "EEEE") : "";
                                    const displayDate = record.dateForDisplay || (!isNaN(d.getTime()) ? format(d, "dd MMM yyyy") : record.date);
                                    const absCount = record.absentees?.length || 0;

                                    return (
                                        <div
                                            key={record._id || idx}
                                            className="flex items-center justify-between gap-3 py-2.5 px-3 border border-border/60 bg-card rounded-lg hover:bg-muted/50 transition-colors shadow-2xs"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="font-semibold text-xs text-muted-foreground w-5 text-center shrink-0">
                                                    {idx + 1}.
                                                </span>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span className="font-bold text-sm text-foreground">
                                                            {displayDate}
                                                        </span>
                                                    </div>
                                                    {dayName && (
                                                        <span className="text-[11px] text-muted-foreground ml-5">
                                                            {dayName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {absCount > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedMeetingForAbsentees(record);
                                                        }}
                                                        className="text-[11px] font-semibold text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                                        title="Click to view absentees in class heading order"
                                                    >
                                                        <span>{absCount} Absent</span>
                                                        <ChevronRight className="h-3 w-3" />
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-green-600 bg-green-100 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900/50">
                                                        All Present
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center text-muted-foreground py-6 text-sm">
                                    No meetings recorded for the selected period.
                                </p>
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
