"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, Plus, Printer, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function MarksManager() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedClassName, setSelectedClassName] = useState("");
    const [examName, setExamName] = useState("");
    // subjects = array of subject names; starts with one blank column
    const [subjects, setSubjects] = useState([""]);
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({}); // { studentId: { subjectIndex: mark } }
    const [savedExams, setSavedExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [examReady, setExamReady] = useState(false);
    const [savingMarks, setSavingMarks] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [resultExam, setResultExam] = useState(null); // exam shown in Results view
    const printRef = useRef(null);

    // ── Fetch classes on mount
    useEffect(() => {
        fetch("/api/classes")
            .then((r) => r.json())
            .then((d) => setClasses(d.classes || []));
    }, []);

    // ── When class changes, load students + existing exams
    useEffect(() => {
        if (!selectedClass) return;
        fetch(`/api/users?roles=Student&classId=${selectedClass}&status=Active`)
            .then((r) => r.json())
            .then((d) => {
                const s = d.users || [];
                setStudents(s);
                const init = {};
                s.forEach((st) => (init[st._id] = {}));
                setMarksData(init);
            });

        fetch(`/api/marks?classId=${selectedClass}`)
            .then((r) => r.json())
            .then((d) => setSavedExams(d.data || []));

        setSelectedExam(null);
        setExamName("");
        setSubjects([""]);
        setExamReady(false);
        setShowResult(false);
    }, [selectedClass]);

    // ── Load an existing exam
    const loadExam = (exam) => {
        setSelectedExam(exam);
        setExamName(exam.examName);
        const examSubjects = exam.subjects?.length ? exam.subjects : [""];
        setSubjects(examSubjects);
        const md = {};
        exam.students.forEach((entry) => {
            const sid = entry.studentId?._id || entry.studentId;
            // entry.marks can be a Mongoose Map, a plain object, or null
            let marksObj = {};
            if (entry.marks instanceof Map) {
                marksObj = Object.fromEntries(entry.marks);
            } else if (entry.marks && typeof entry.marks === "object") {
                marksObj = entry.marks; // already plain object from JSON
            }
            // Re-index from subject-name keys → column-index keys
            md[sid] = {};
            examSubjects.forEach((subj, i) => {
                const key = subj || `col${i}`;
                if (marksObj[key] !== undefined) md[sid][i] = marksObj[key];
            });
        });
        setMarksData(md);
        setExamReady(true);
        setShowResult(false);
    };

    // ── Open table
    const handleOpenTable = () => {
        if (!selectedClass || !examName.trim()) {
            alert("Please select a class and enter an exam name.");
            return;
        }
        setExamReady(true);
        setShowResult(false);
    };

    // ── Rename a subject column header
    const renameSubject = (index, value) => {
        setSubjects((prev) => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    // ── Add a new (blank) subject column
    const addSubjectColumn = () => {
        setSubjects((prev) => [...prev, ""]);
    };

    // ── Remove a subject column by index
    const removeSubjectColumn = (index) => {
        const removedKey = subjects[index];
        setSubjects((prev) => prev.filter((_, i) => i !== index));
        if (removedKey) {
            const updated = { ...marksData };
            Object.keys(updated).forEach((id) => delete updated[id][removedKey]);
            setMarksData(updated);
        }
    };

    // ── Handle mark input (keyed by column index as string)
    const handleMarkChange = (studentId, index, value) => {
        setMarksData((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], [index]: Number(value) },
        }));
    };

    // ── Compute total, percentage, rank (by index)
    const computeStats = () => {
        const totals = students.map((st) => {
            const total = subjects.reduce(
                (sum, _, i) => sum + (marksData[st._id]?.[i] || 0),
                0
            );
            const maxTotal = subjects.length * 100;
            const percentage =
                maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";
            return { studentId: st._id, total, percentage };
        });
        const sorted = [...totals].sort((a, b) => b.total - a.total);
        return totals.map((t) => ({
            ...t,
            rank: sorted.findIndex((s) => s.studentId === t.studentId) + 1,
        }));
    };

    const stats = computeStats();

    // ── Save marks
    const saveMarks = async () => {
        setSavingMarks(true);
        const payload = {
            examName,
            classId: selectedClass,
            subjects,
            students: students.map((st) => ({
                studentId: st._id,
                // convert index-keyed marks to subject-name keyed
                marks: subjects.reduce((acc, subj, i) => {
                    const val = marksData[st._id]?.[i];
                    if (val !== undefined) acc[subj || `col${i}`] = val;
                    return acc;
                }, {}),
            })),
        };

        const method = selectedExam ? "PUT" : "POST";
        const url = selectedExam ? `/api/marks/${selectedExam._id}` : `/api/marks`;

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            toast.success("Marks saved successfully!");
            const savedId = data.data?._id || selectedExam?._id;
            fetch(`/api/marks?classId=${selectedClass}`)
                .then((r) => r.json())
                .then((d) => {
                    const exams = d.data || [];
                    setSavedExams(exams);
                    // Auto-select this exam in the Results view
                    const thisExam = exams.find((e) => e._id === savedId);
                    if (thisExam) setResultExam(thisExam);
                });
            if (!selectedExam) setSelectedExam(data.data);
        }
        setSavingMarks(false);
    };

    // ── Print
    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const win = window.open("", "_blank");
        win.document.write(`
            <html><head><title>${examName} - ${selectedClassName}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
                h2 { text-align: center; margin-bottom: 4px; }
                p { text-align: center; color: #555; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #999; padding: 6px 10px; text-align: center; }
                th { background: #f0f0f0; font-weight: bold; }
                td:nth-child(3) { text-align: left; }
            </style></head><body>
            <h2>${examName}</h2>
            <p>${selectedClassName}</p>
            ${content.innerHTML}
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    // ── Stats for result view (from resultExam, not entry form)
    const computeResultStats = (exam) => {
        if (!exam) return [];
        const examStudents = exam.students || [];
        const examSubjects = exam.subjects || [];
        const totals = examStudents.map((entry) => {
            let marksMap = {};
            if (entry.marks instanceof Map) {
                marksMap = Object.fromEntries(entry.marks);
            } else if (entry.marks && typeof entry.marks === "object") {
                marksMap = entry.marks;
            }
            // Use same key fallback as saveMarks: subj || `col${i}`
            const total = examSubjects.reduce((sum, subj, i) => sum + (marksMap[subj || `col${i}`] || 0), 0);
            const maxTotal = examSubjects.length * 100;
            const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";
            return { studentId: entry.studentId?._id, studentName: entry.studentId?.name, total, percentage, marksMap };
        });
        const sorted = [...totals].sort((a, b) => b.total - a.total);
        return totals.map((t) => ({
            ...t,
            rank: sorted.findIndex((s) => s.studentId === t.studentId) + 1,
        })).sort((a, b) => a.rank - b.rank);
    };

    const resultStats = computeStats();
    const resultViewStats = computeResultStats(resultExam);

    return (
        <div className="space-y-6">
            {/* ── Select Class + Exam Name */}
            <div className="flex gap-4 flex-wrap items-end justify-between">
                <div className="flex gap-4 flex-wrap items-end">
                    <div className="w-56">
                        <label className="text-sm font-medium mb-1 block">Select Class</label>
                        <Select
                            onValueChange={(val) => {
                                setSelectedClass(val);
                                const cls = classes.find((c) => c._id === val);
                                setSelectedClassName(cls?.name || "");
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose class..." />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls._id} value={cls._id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-56">
                        <label className="text-sm font-medium mb-1 block">Exam Name</label>
                        {showResult ? (
                            <Select
                                value={resultExam?._id || ""}
                                onValueChange={(val) => {
                                    const exam = savedExams.find((e) => e._id === val);
                                    setResultExam(exam || null);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select exam..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedExams.map((exam) => (
                                        <SelectItem key={exam._id} value={exam._id}>
                                            {exam.examName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                placeholder="e.g. First Term Exam"
                                value={examName}
                                onChange={(e) => setExamName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !examReady && handleOpenTable()}
                            />
                        )}
                    </div>

                    {!examReady && (
                        <Button onClick={handleOpenTable} disabled={!selectedClass || !examName.trim()}>
                            <Save className="w-4 h-4 mr-2" />
                            Open Table
                        </Button>
                    )}
                </div>

                {/* Print + Result */}
                {examReady && (
                    <div className="flex gap-2">
                        <Button variant="default" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </Button>
                        <Button
                            variant={showResult ? "default" : "outline"}
                            onClick={() => setShowResult((v) => !v)}
                        >
                            <Trophy className="w-4 h-4 mr-2" />
                            {showResult ? "Hide Results" : "Results"}
                        </Button>
                    </div>
                )}
            </div>



            {/* ── Results View */}
            {examReady && showResult && (
                <div className="rounded border overflow-x-auto">
                    {/* Results header — simple */}
                    <div className="bg-muted px-4 py-3 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold text-sm">Results</span>
                    </div>
                    {/* Table — only shown when an exam is selected */}
                    {resultExam ? (
                        <div ref={printRef}>
                            <table className="w-full text-sm">
                                <thead className="bg-muted/60">
                                    <tr>
                                        <th className="p-3 text-center border-b">Rank</th>
                                        <th className="p-3 text-left border-b">Student</th>
                                        {(resultExam.subjects || []).map((s, i) => (
                                            <th key={i} className="p-3 text-center border-b">{s || `Col ${i + 1}`}</th>
                                        ))}
                                        <th className="p-3 text-center border-b bg-blue-50 dark:bg-blue-950">Total</th>
                                        <th className="p-3 text-center border-b bg-green-50 dark:bg-green-950">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultViewStats.map((stat) => (
                                        <tr
                                            key={stat.studentId}
                                            className={`border-b ${stat.rank === 1 ? "bg-yellow-50 dark:bg-yellow-950/30" : stat.rank === 2 ? "bg-slate-50 dark:bg-slate-800/30" : stat.rank === 3 ? "bg-orange-50 dark:bg-orange-950/30" : "hover:bg-muted/30"}`}
                                        >
                                            <td className="p-2 text-center font-bold text-lg">
                                                {stat.rank === 1 ? "🥇" : stat.rank === 2 ? "🥈" : stat.rank === 3 ? "🥉" : stat.rank}
                                            </td>
                                            <td className="p-2 font-medium">{stat.studentName}</td>
                                            {(resultExam.subjects || []).map((subj, i) => (
                                                <td key={i} className="p-2 text-center">
                                                    {stat.marksMap[subj || `col${i}`] ?? "-"}
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300">{stat.total}</td>
                                            <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300">{stat.percentage}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground">Select an exam above to view results.</div>
                    )}
                </div>
            )}

            {/* ── Marks Entry Table */}
            {examReady && !showResult && students.length > 0 && (
                <div className="space-y-3">
                    <div className="overflow-x-auto rounded border" ref={printRef}>
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 text-center border-b w-12">Sl No</th>
                                    <th className="p-1 text-left border-b w-[50px]">Adm. No</th>
                                    <th className="p-1 text-left border-b min-w-[80px]">Name</th>
                                    {subjects.map((subj, i) => (
                                        <th key={i} className="p-1 text-center border-b w-auto">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    className="h-7 text-xs text-center"
                                                    placeholder={`Subject ${i + 1}`}
                                                    value={subj}
                                                    onChange={(e) => renameSubject(i, e.target.value)}
                                                />
                                                {subjects.length > 1 && (
                                                    <Trash2
                                                        className="w-3 h-3 shrink-0 cursor-pointer text-red-400 hover:text-red-600"
                                                        onClick={() => removeSubjectColumn(i)}
                                                    />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {/* Add column button in header */}
                                    <th className="p-2 border-b w-10">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={addSubjectColumn}
                                            title="Add subject column"
                                        >
                                            <Plus className="w-4 h-4 text-primary" />
                                        </Button>
                                    </th>
                                    {/* Stats columns */}
                                    <th className="p-3 text-center border-b bg-blue-50 dark:bg-blue-950 min-w-[60px]">Total</th>
                                    <th className="p-3 text-center border-b bg-green-50 dark:bg-green-950 min-w-[60px]">%</th>
                                    <th className="p-3 text-center border-b bg-yellow-50 dark:bg-yellow-950 min-w-[60px]">Rank</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((st, idx) => {
                                    const stat = stats.find((s) => s.studentId === st._id);
                                    return (
                                        <tr key={st._id} className="hover:bg-muted/30 border-b">
                                            <td className="p-2 text-center text-muted-foreground">{idx + 1}</td>
                                            <td className="p-1 text-muted-foreground truncate max-w-[50px]">{st._id}</td>
                                            <td className="p-1 font-medium">{st.name}</td>
                                            {subjects.map((_, i) => (
                                                <td key={i} className="p-1 text-center">
                                                    <Input
                                                        id={`mark-${idx}-${i}`}
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        className="w-14 mx-auto text-center h-7 text-xs"
                                                        value={marksData[st._id]?.[i] ?? ""}
                                                        onChange={(e) =>
                                                            handleMarkChange(st._id, i, e.target.value)
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                // Next subject in same row
                                                                const nextCol = document.getElementById(`mark-${idx}-${i + 1}`);
                                                                if (nextCol) {
                                                                    nextCol.focus();
                                                                } else {
                                                                    // First subject of next row
                                                                    const nextRow = document.getElementById(`mark-${idx + 1}-0`);
                                                                    if (nextRow) nextRow.focus();
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            ))}
                                            {/* Empty cell under Add button */}
                                            <td />
                                            <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300">
                                                {stat?.total ?? 0}
                                            </td>
                                            <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300">
                                                {stat?.percentage ?? 0}%
                                            </td>
                                            <td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300">
                                                {stat?.rank ?? "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={saveMarks} disabled={savingMarks}>
                            <Save className="w-4 h-4 mr-2" />
                            {savingMarks ? "Saving..." : "Save Marks"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
