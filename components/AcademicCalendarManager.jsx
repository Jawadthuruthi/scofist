"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
    CalendarDays, Plus, Pencil, Trash2, Printer,
    ChevronLeft, ChevronRight, X, Check, Loader, CalendarIcon, AlertCircle, BellRing,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import PrintHeader from "./PrintHeader";
import { useRef } from "react";
import React from "react";

import useCrud from "@/hooks/use-crud";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

// ─── Constants ──────────────────────────────────────────────────────────────
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const EMPTY_FORM = { title: "", date: "", time: "", description: "", type: "Event" };

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtInput = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const fmtDisplay = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDDMMYYYY = (d) => { if (!d) return ""; const x = new Date(d); return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`; };

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function AcademicCalendarManager({ apiKey }) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [isDeletingRecord, setIsDeletingRecord] = useState(false);
    const [notifyingId, setNotifyingId] = useState(null);
    const [confirmNotifyEv, setConfirmNotifyEv] = useState(null);
    const calendarRef = useRef();

    const addPopupRef = useRef(null);
    const { handleDownload: handleAddDownload } = useDownloadPopup(
        addPopupRef,
        `${editingEvent ? "Edit" : "Add"}_Special_Day.jpeg`
    );

    const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } =
        useCrud("academic-calendar", apiKey);

    const calendarQuery = useFetchItems(0, 0, { year }, {
        staleTime: 0, refetchOnWindowFocus: false,
    });

    const addEvent = useAddItem();
    const updateEvent = useUpdateItem();
    const deleteEvent = useDeleteItem();

    const events = useMemo(
        () => calendarQuery.data?.["academic-calendar"] || [],
        [calendarQuery.data]
    );

    // Descending order for the on-screen table (latest dates on top)
    const tableMonthGroups = useMemo(() => {
        const sortedDesc = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));
        const groups = [];
        const monthMap = new Map();
        sortedDesc.forEach((ev) => {
            const m = new Date(ev.date).getMonth();
            if (!monthMap.has(m)) {
                const group = [m, []];
                monthMap.set(m, group);
                groups.push(group);
            }
            monthMap.get(m)[1].push(ev);
        });
        return groups;
    }, [events]);

    // Ascending order for print view (chronological order: January to December)
    const printMonthGroups = useMemo(() => {
        const sortedAsc = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
        const groups = [];
        const monthMap = new Map();
        sortedAsc.forEach((ev) => {
            const m = new Date(ev.date).getMonth();
            if (!monthMap.has(m)) {
                const group = [m, []];
                monthMap.set(m, group);
                groups.push(group);
            }
            monthMap.get(m)[1].push(ev);
        });
        return groups.sort(([mA], [mB]) => Number(mA) - Number(mB));
    }, [events]);

    const years = useMemo(() => Array.from({ length: 10 }, (_, i) => currentYear - 3 + i), [currentYear]);

    const openAddDialog = useCallback((preDate = "") => {
        setEditingEvent(null);
        setForm({ ...EMPTY_FORM, date: preDate || fmtInput(new Date()) });
        setDialogOpen(true);
    }, []);

    const openEditDialog = useCallback((ev) => {
        setEditingEvent(ev);
        setForm({ title: ev.title, date: fmtInput(ev.date), time: ev.time || "", description: ev.description || "", type: ev.type || "Event" });
        setDialogOpen(true);
    }, []);

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.date) { toast.error("Title and date are required."); return; }
        setSubmitting(true);
        const payload = { title: form.title.trim(), date: form.date, time: form.time || "", description: form.description || "", type: form.type || "Event" };
        try {
            editingEvent
                ? await updateEvent.mutateAsync({ data: { ids: [editingEvent._id], ...payload } })
                : await addEvent.mutateAsync(payload);
            toast.success(editingEvent ? "Special day updated!" : "Special day added!");
            setDialogOpen(false); setForm(EMPTY_FORM); calendarQuery.refetch();
        } catch (err) { toast.error(err.message || "Something went wrong."); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id) => {
        setIsDeletingRecord(true);
        try {
            await deleteEvent.mutateAsync({ data: [id] });
            toast.success("Special day deleted.");
            calendarQuery.refetch();
            setDeletingId(null);
        } catch (err) { toast.error(err.message || "Delete failed."); }
        finally { setIsDeletingRecord(false); }
    };

    const handleNotify = async (ev) => {
        setNotifyingId(ev._id);
        try {
            const res = await fetch("/api/academic-calendar/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventName: ev.title,
                    date: fmtDisplay(ev.date),
                    time: ev.time
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send notification.");
            toast.success(data.message || "Alert sent to all teachers.");
            setConfirmNotifyEv(null);
        } catch (err) {
            toast.error(err.message || "Failed to send alert.");
        } finally {
            setNotifyingId(null);
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: calendarRef,
        documentTitle: `Academic Calendar - ${year}`,
    });

    return (
        <>
            <div className="space-y-6 no-print">
            {/* Toolbar */}
            <div className="flex flex-row items-center justify-between gap-2 overflow-x-auto pb-2 sm:pb-0 sm:overflow-visible">
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setYear(y => y - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[140px] sm:w-[140px] h-8 sm:h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setYear(y => y + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button onClick={() => openAddDialog()} className="h-8 sm:h-9 px-2 sm:px-4 gap-1 sm:gap-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span>Add <span className="hidden sm:inline">Special Day</span></span>
                    </Button>
                    <Button onClick={handlePrint} className="h-8 sm:h-9 px-2 sm:px-4 gap-1 sm:gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print text-xs sm:text-sm">
                        <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Print
                    </Button>
                </div>
            </div>

            {calendarQuery.isLoading ? (
                <div className="flex justify-center items-center h-60">
                    <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Card className="shadow-sm border">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-primary" />
                                Special Days in {year}
                            </CardTitle>
                            <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5">
                                {events.length} {events.length === 1 ? "Day" : "Days"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        {events.length === 0 ? (
                            <div className="text-center py-16 px-4 space-y-3">
                                <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                                <p className="text-base font-medium text-foreground">
                                    No special days marked for {year}.
                                </p>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Click "Add Special Day" above to mark holidays, exams, or events for this academic year.
                                </p>
                                <Button onClick={() => openAddDialog()} className="mt-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                                    <Plus className="h-4 w-4" /> Add Special Day
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-14 sm:w-16 text-center font-semibold">Sl No</TableHead>
                                        <TableHead className="w-36 sm:w-44 font-semibold">Date & Time</TableHead>
                                        <TableHead className="w-28 sm:w-32 font-semibold">Type</TableHead>
                                        <TableHead className="font-semibold">Event Details</TableHead>
                                        <TableHead className="w-28 text-right pr-4 font-semibold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableMonthGroups.flatMap(([monthIndex, monthEvents]) => [
                                        <TableRow key={`m-${monthIndex}`} className="bg-muted/60 hover:bg-muted/60 border-y border-border">
                                            <TableCell colSpan={5} className="font-bold text-center py-2 h-auto text-xs uppercase tracking-wider text-muted-foreground">
                                                {MONTHS[monthIndex]}
                                            </TableCell>
                                        </TableRow>,
                                        ...monthEvents.map((ev, idx) => (
                                            <TableRow key={ev._id} className="hover:bg-muted/40 transition-colors">
                                                <TableCell className="text-center font-medium text-xs text-muted-foreground align-top py-3 w-14 sm:w-16">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="text-xs font-medium whitespace-nowrap align-top py-3">
                                                    <div className="font-semibold text-foreground">{fmtDisplay(ev.date)}</div>
                                                    <div className="text-muted-foreground mt-0.5">{ev.time || "--"}</div>
                                                </TableCell>
                                                <TableCell className="align-top py-3">
                                                    <Badge
                                                        variant={
                                                            ev.type === "Holiday"
                                                                ? "destructive"
                                                                : ev.type === "Exam"
                                                                ? "secondary"
                                                                : "outline"
                                                        }
                                                        className={cn(
                                                            "text-[11px] font-medium",
                                                            ev.type === "Holiday" && "bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
                                                            ev.type === "Exam" && "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
                                                            ev.type === "Event" && "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
                                                            ev.type === "Activity" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                                                        )}
                                                    >
                                                        {ev.type || "Event"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="align-top py-3">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                                                        {ev.description && (
                                                            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-w-2xl">
                                                                {ev.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4 align-top py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            title="Edit Special Day"
                                                            onClick={() => openEditDialog(ev)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            title="Delete Special Day"
                                                            onClick={() => setDeletingId(ev._id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                            title="Send Alert to Teachers"
                                                            onClick={() => setConfirmNotifyEv(ev)}
                                                            disabled={notifyingId === ev._id}
                                                        >
                                                            {notifyingId === ev._id ? (
                                                                <Loader className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <BellRing className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ])}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent
                    ref={addPopupRef}
                    data-html2canvas-popup="true"
                    className="w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col [&>button.absolute]:hidden no-print max-h-[90dvh]"
                >
                    <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
                        <button
                            type="button"
                            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer shrink-0"
                            onClick={handleAddDownload}
                            title="Download Image"
                            data-html2canvas-ignore="true"
                        >
                            {editingEvent ? (
                                <Pencil className="h-5 w-5 text-primary" />
                            ) : (
                                <CalendarDays className="h-5 w-5 text-primary" />
                            )}
                        </button>
                        <div className="flex-1 text-left space-y-0.5 min-w-0">
                            <DialogTitle className="text-xl font-bold m-0 text-foreground">
                                {editingEvent ? "Edit Special Day" : "Add Special Day"}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground m-0">
                                {editingEvent ? "Update the details of this special day." : "Mark a date as a special day."}
                            </DialogDescription>
                        </div>
                        <DialogClose asChild>
                            <button
                                type="button"
                                className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
                                data-html2canvas-ignore="true"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </DialogClose>
                    </DialogHeader>

                    <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90dvh-130px)]">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="e.g. Eid Al-Fitr, Semester Exam, College Day"
                                value={form.title}
                                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !form.date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                            <span className="truncate">{form.date ? fmtDDMMYYYY(form.date) : "DD/MM/YYYY"}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={form.date ? new Date(form.date) : undefined}
                                            onSelect={(d) => setForm(p => ({ ...p, date: d ? fmtInput(d) : "" }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Time <span className="text-muted-foreground text-xs">(optional)</span></label>
                                <Input
                                    placeholder="e.g. 10:00 AM, All Day"
                                    value={form.time}
                                    onChange={(e) => setForm(p => ({ ...p, time: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Type</label>
                            <Select
                                value={form.type || "Event"}
                                onValueChange={(val) => setForm(p => ({ ...p, type: val }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Holiday">Holiday</SelectItem>
                                    <SelectItem value="Event">Event</SelectItem>
                                    <SelectItem value="Exam">Exam</SelectItem>
                                    <SelectItem value="Activity">Activity</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Description <span className="text-muted-foreground text-xs">(optional)</span></label>
                            <Textarea
                                placeholder="Add any extra notes, instructions, or schedule details..."
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                                <X className="h-4 w-4 mr-1" />Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {submitting ? <Loader className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                {editingEvent ? "Update" : "Add Special Day"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        {/* Printable View - Hidden on Screen */}
        <div ref={calendarRef} className="absolute -top-[9999px] left-0 print:static print:block p-4 sm:p-8 bg-white print:w-full">
                <PrintHeader
                        apiKey={apiKey}
                        title={`ACADEMIC CALENDAR - ${year}`}
                        subTitle="Special Days and Events"
                        displayOnScreen={true}
                    />

                    <div className="mt-6">
                        <table className="w-full border-collapse border border-slate-300 text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="w-14 font-bold border border-slate-300 p-2 text-center">Sl No</th>
                                    <th className="w-1/4 font-bold border border-slate-300 p-2 text-left">Date</th>
                                    <th className="w-1/5 font-bold border border-slate-300 p-2 text-left">Time</th>
                                    <th className="font-bold border border-slate-300 p-2 text-left">Event Title</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printMonthGroups.map(([monthIndex, monthEvents]) => (
                                    <React.Fragment key={monthIndex}>
                                        <tr className="bg-slate-100">
                                            <td colSpan={4} className="text-center font-bold py-2 border border-slate-300">
                                                {MONTHS[monthIndex]}
                                            </td>
                                        </tr>
                                        {monthEvents.map((ev, idx) => (
                                            <tr key={ev._id} className="border-b">
                                                <td className="border border-slate-300 p-2 text-center text-slate-600 font-medium">
                                                    {idx + 1}
                                                </td>
                                                <td className="border border-slate-300 p-2">{fmtDisplay(ev.date)}</td>
                                                <td className="border border-slate-300 p-2 text-slate-500 italic">
                                                    {ev.time || "--"}
                                                </td>
                                                <td className="border border-slate-300 p-2 font-medium">{ev.title}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm shadow-2xl border-destructive/20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="bg-destructive/5 pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                <AlertCircle className="w-5 h-5" />
                                Confirm Deletion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete this special day? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setDeletingId(null)}
                                    disabled={isDeletingRecord}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => handleDelete(deletingId)}
                                    disabled={isDeletingRecord}
                                >
                                    {isDeletingRecord ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Notify Confirmation Modal */}
            {confirmNotifyEv && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm shadow-2xl border-blue-500/20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="bg-blue-500/5 pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                                <BellRing className="w-5 h-5" />
                                Send Alert
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to send a notification to all teachers about <strong>{confirmNotifyEv.title}</strong>?
                            </p>
                            <div className="p-3 bg-muted/50 rounded-md border text-sm space-y-1">
                                <p className="font-semibold text-foreground">
                                    Special Day Alert 📅
                                </p>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {`Event: ${confirmNotifyEv.title}\nDate: ${fmtDisplay(confirmNotifyEv.date)}${confirmNotifyEv.time ? `\nTime: ${confirmNotifyEv.time}` : ''}`}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setConfirmNotifyEv(null)}
                                    disabled={notifyingId === confirmNotifyEv._id}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => handleNotify(confirmNotifyEv)}
                                    disabled={notifyingId === confirmNotifyEv._id}
                                >
                                    {notifyingId === confirmNotifyEv._id ? <Loader className="h-4 w-4 mr-1 animate-spin" /> : <BellRing className="h-4 w-4 mr-1" />}
                                    Send
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
