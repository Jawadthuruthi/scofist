"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Header from "@/components/Header";
import {
    ListChecks,
    Printer,
    Loader2,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function CheckListClient({ teams = [], divisions = [], apiKey }) {
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedDivision, setSelectedDivision] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(""); // "Stage" | "Off-Stage"

    const [programs, setPrograms] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(false);

    // ─── Derived values ─────────────────────────────────────────────────────────
    const teamName = useMemo(
        () => teams.find((t) => t._id === selectedTeam)?.name || "",
        [teams, selectedTeam]
    );
    const divisionName = useMemo(
        () => divisions.find((d) => d._id === selectedDivision)?.name || "",
        [divisions, selectedDivision]
    );

    // Sort programs alphabetically
    const sortedPrograms = useMemo(
        () => [...programs].sort((a, b) => a.name.localeCompare(b.name)),
        [programs]
    );

    // Sort participants by chest number, then name
    const sortedParticipants = useMemo(
        () =>
            [...participants].sort((a, b) => {
                if (a.chestNumber && b.chestNumber) return a.chestNumber - b.chestNumber;
                if (a.chestNumber) return -1;
                if (b.chestNumber) return 1;
                return a.name.localeCompare(b.name);
            }),
        [participants]
    );

    // Set of participant program IDs for O(1) lookup
    // participantProgramMap[participantId] = Set<programId>
    const participantProgramMap = useMemo(() => {
        const map = {};
        for (const p of participants) {
            map[p._id] = new Set((p.programs || []).map((pr) => String(pr.id)));
        }
        return map;
    }, [participants]);

    // ─── Fetch data when all 3 filters are set ───────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!selectedTeam || !selectedDivision || !selectedCategory) return;

        setLoading(true);
        try {
            const [programsRes, participantsRes] = await Promise.all([
                fetch(
                    `/api/programs?divisionId=${encodeURIComponent(selectedDivision)}&category=${encodeURIComponent(selectedCategory)}&limit=200`,
                    { headers: { "api-key": apiKey, "Content-Type": "application/json" } }
                ),
                fetch(
                    `/api/participants?teamId=${encodeURIComponent(selectedTeam)}&divisionId=${encodeURIComponent(selectedDivision)}&limit=500`,
                    { headers: { "api-key": apiKey, "Content-Type": "application/json" } }
                ),
            ]);

            const [programsData, participantsData] = await Promise.all([
                programsRes.json(),
                participantsRes.json(),
            ]);

            if (!programsRes.ok) throw new Error(programsData.message || "Failed to fetch programs");
            if (!participantsRes.ok) throw new Error(participantsData.message || "Failed to fetch participants");

            setPrograms(programsData.programs || []);
            setParticipants(participantsData.participants || []);
        } catch (error) {
            console.error("Check list fetch error:", error);
            toast.error(error.message || "Failed to load data");
            setPrograms([]);
            setParticipants([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTeam, selectedDivision, selectedCategory, apiKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset data when filters change
    useEffect(() => {
        setPrograms([]);
        setParticipants([]);
    }, [selectedTeam, selectedDivision, selectedCategory]);

    const allSelected = selectedTeam && selectedDivision && selectedCategory;
    const hasData = sortedPrograms.length > 0 && sortedParticipants.length > 0;

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col space-y-4 pb-8">
            {/* Header */}
            <div className="no-print">
                <Header
                    title="CHECK LIST"
                    subTitle="Cross-reference participants and programs by team & division"
                    icon={<ListChecks className="h-5 w-5 text-muted-foreground" />}
                />
            </div>

            {/* Filters Card */}
            <Card className="border-primary/20 shadow-sm no-print">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg" />
                <CardHeader className="pb-3 pt-4 border-b bg-muted/10">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-primary" />
                        Filter Options
                    </CardTitle>
                    <CardDescription>
                        Select team, division, and stage category to generate the check list
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Team Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Team</label>
                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                <SelectTrigger id="checklist-team-select">
                                    <SelectValue placeholder="Select Team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((team) => (
                                        <SelectItem key={team._id} value={team._id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Division Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Division</label>
                            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                                <SelectTrigger id="checklist-division-select">
                                    <SelectValue placeholder="Select Division" />
                                </SelectTrigger>
                                <SelectContent>
                                    {divisions.map((div) => (
                                        <SelectItem key={div._id} value={div._id}>
                                            {div.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Stage / Off-Stage Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Category</label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger id="checklist-category-select">
                                    <SelectValue placeholder="Stage / Off-Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Stage">Stage</SelectItem>
                                    <SelectItem value="Off-Stage">Off-Stage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Table Section ────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading check list…</p>
                </div>
            ) : !allSelected ? (
                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-xl border-muted bg-muted/5">
                    <ListChecks className="h-12 w-12 text-muted mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No Filters Selected</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-xs text-center mt-1">
                        Please select a team, division, and category to generate the check list.
                    </p>
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-xl border-muted bg-muted/5">
                    <ListChecks className="h-12 w-12 text-muted mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No Data Found</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-xs text-center mt-1">
                        {sortedPrograms.length === 0
                            ? `No ${selectedCategory} programs found for ${divisionName}.`
                            : `No participants from ${teamName} in ${divisionName}.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Print header (only visible during print) */}
                    <div className="hidden print-only text-center mb-4">
                        <h1 className="text-xl font-bold uppercase tracking-wide">
                            {selectedCategory} Programs — Check List
                        </h1>
                        <p className="text-sm mt-1">
                            Team: <strong>{teamName}</strong> &nbsp;|&nbsp; Division:{" "}
                            <strong>{divisionName}</strong>
                        </p>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-between no-print">
                        <div className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{sortedParticipants.length}</span> participants
                            {" · "}
                            <span className="font-semibold text-foreground">{sortedPrograms.length}</span> programs
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.print()}
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                    </div>

                    {/* Scrollable matrix table */}
                    <div className="overflow-x-auto rounded-lg border shadow-sm">
                        <table className="checklist-table w-full border-collapse text-sm">
                            <thead>
                                {/* Title row */}
                                <tr>
                                    <th
                                        colSpan={sortedPrograms.length + 2}
                                        className="bg-primary text-primary-foreground text-center py-2 px-3 text-base font-bold tracking-wide uppercase"
                                    >
                                        {selectedCategory} Programs
                                        <span className="no-print">
                                            {" "}— {divisionName} Division
                                            <span className="ml-4 font-normal text-sm opacity-80">
                                                Team: {teamName}
                                            </span>
                                        </span>
                                    </th>
                                </tr>
                                {/* Column headers */}
                                <tr className="bg-muted/60">
                                    <th className="border border-border px-3 py-2 text-center whitespace-nowrap min-w-[40px] text-xs font-semibold text-muted-foreground">
                                        Chest No
                                    </th>
                                    <th className="border border-border px-3 py-2 text-left whitespace-nowrap min-w-[160px] text-xs font-semibold">
                                        Participant
                                    </th>
                                    {sortedPrograms.map((prog) => (
                                        <th
                                            key={prog._id}
                                            className="border border-border px-1 py-2 text-center min-w-[36px] max-w-[48px] w-[40px]"
                                        >
                                            <div
                                                className="text-xs font-semibold leading-tight"
                                                style={{
                                                    writingMode: "vertical-rl",
                                                    transform: "rotate(180deg)",
                                                    maxHeight: "110px",
                                                    overflow: "hidden",
                                                    whiteSpace: "normal",
                                                    wordBreak: "break-word",
                                                }}
                                                title={`${prog.name} (max: ${prog.maxParticipants})`}
                                            >
                                                {prog.name}
                                                {prog.maxParticipants && (
                                                    <span className="opacity-60 font-normal">
                                                        {" "}({prog.maxParticipants})
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedParticipants.map((participant, rowIndex) => {
                                    const progSet = participantProgramMap[participant._id] || new Set();
                                    const registeredCount = sortedPrograms.filter((prog) =>
                                        progSet.has(String(prog._id))
                                    ).length;

                                    return (
                                        <tr
                                            key={participant._id}
                                            className={
                                                rowIndex % 2 === 0
                                                    ? "bg-background hover:bg-muted/30 transition-colors"
                                                    : "bg-muted/20 hover:bg-muted/40 transition-colors"
                                            }
                                        >
                                            {/* Chest number / serial */}
                                            <td className="border border-border px-3 py-2 text-center text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                {participant.chestNumber ?? rowIndex + 1}
                                            </td>
                                            {/* Participant name */}
                                            <td className="border border-border px-3 py-2 whitespace-nowrap">
                                                <div className="font-medium text-sm leading-tight">
                                                    {participant.name}
                                                </div>
                                                {registeredCount > 0 && (
                                                    <div className="text-[10px] text-primary font-semibold mt-0.5">
                                                        {registeredCount} program{registeredCount !== 1 ? "s" : ""}
                                                    </div>
                                                )}
                                            </td>
                                            {/* Program cells */}
                                            {sortedPrograms.map((prog) => {
                                                const registered = progSet.has(String(prog._id));
                                                return (
                                                    <td
                                                        key={prog._id}
                                                        className={`border border-border text-center py-2 transition-colors ${
                                                            registered
                                                                ? "bg-emerald-50 dark:bg-emerald-950/30"
                                                                : ""
                                                        }`}
                                                    >
                                                        {registered && (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Footer summary row */}
                            <tfoot>
                                <tr className="bg-muted/50 font-semibold">
                                    <td
                                        colSpan={2}
                                        className="border border-border px-3 py-2 text-xs text-right text-muted-foreground"
                                    >
                                        Registrations per program →
                                    </td>
                                    {sortedPrograms.map((prog) => {
                                        const count = sortedParticipants.filter((p) =>
                                            (participantProgramMap[p._id] || new Set()).has(String(prog._id))
                                        ).length;
                                        return (
                                            <td
                                                key={prog._id}
                                                className="border border-border text-center py-2 text-xs font-bold text-primary"
                                            >
                                                {count}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground no-print">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Registered for program</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block w-3.5 h-3.5 border border-border rounded-sm bg-background" />
                            <span>Not registered</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .checklist-table { font-size: 10px; }
                    .checklist-table th,
                    .checklist-table td {
                        padding: 4px 6px;
                    }
                    body { background: white !important; }
                }
                @media screen {
                    .print-only { display: none; }
                }
            `}</style>
        </div>
    );
}
