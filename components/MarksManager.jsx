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
import { Trash2, Save, Plus, Printer, Trophy, Edit } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useReactToPrint } from "react-to-print";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MarksManager() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedClassName, setSelectedClassName] = useState("");
    const [examName, setExamName] = useState("");
    const [subjects, setSubjects] = useState([""]);
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({});
    const [savedExams, setSavedExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [examReady, setExamReady] = useState(false);
    const [savingMarks, setSavingMarks] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [resultExam, setResultExam] = useState(null);
    const printRef = useRef(null);
    const activeRole = Cookies.get("active-role");

    useEffect(() => {
        fetch("/api/classes")
            .then((r) => r.json())
            .then((d) => setClasses(d.classes || []));
    }, []);

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
        setResultExam(null);
        setExamName("");
        setSubjects([""]);
        setExamReady(false);
    }, [selectedClass]);

    const loadExam = (exam) => {
        setSelectedExam(exam);
        setExamName(exam.examName);
        const examSubjects = exam.subjects?.length ? exam.subjects : [""];
        setSubjects(examSubjects);
        const md = {};
        exam.students.forEach((entry) => {
            const sid = entry.studentId?._id || entry.studentId;
            let marksObj = {};
            if (entry.marks instanceof Map) {
                marksObj = Object.fromEntries(entry.marks);
            } else if (entry.marks && typeof entry.marks === "object") {
                marksObj = entry.marks;
            }
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

    const handleOpenTable = () => {
        if (!selectedClass || !examName.trim()) {
            alert("Please select a class and enter an exam name.");
            return;
        }
        setExamReady(true);
        setShowResult(false);
    };

    const handleDeleteExam = async (examId) => {
        try {
            const res = await fetch(`/api/marks/${examId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Exam deleted successfully!");
                setResultExam(null);
                fetch(`/api/marks?classId=${selectedClass}`)
                    .then((r) => r.json())
                    .then((d) => setSavedExams(d.data || []));
            } else {
                toast.error(data.message || "Failed to delete exam");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("An error occurred while deleting");
        }
    };

    const renameSubject = (index, value) => {
        setSubjects((prev) => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const addSubjectColumn = () => {
        setSubjects((prev) => [...prev, ""]);
    };

    const removeSubjectColumn = (index) => {
        const removedKey = subjects[index];
        setSubjects((prev) => prev.filter((_, i) => i !== index));
        if (removedKey) {
            const updated = { ...marksData };
            Object.keys(updated).forEach((id) => delete updated[id][removedKey]);
            setMarksData(updated);
        }
    };

    const handleMarkChange = (studentId, index, value) => {
        setMarksData((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], [index]: Number(value) },
        }));
    };

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

    const saveMarks = async () => {
        setSavingMarks(true);
        const payload = {
            examName,
            classId: selectedClass,
            subjects,
            students: students.map((st) => ({
                studentId: st._id,
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
                    const thisExam = exams.find((e) => e._id === savedId);
                    if (thisExam) setResultExam(thisExam);
                });
            if (!selectedExam) setSelectedExam(data.data);
        }
        setSavingMarks(false);
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${examName} - ${selectedClassName}`,
    });

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
            const total = examSubjects.reduce(
                (sum, subj, i) => sum + (marksMap[subj || `col${i}`] || 0),
                0
            );
            const maxTotal = examSubjects.length * 100;
            const percentage =
                maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";
            return {
                studentId: entry.studentId?._id,
                studentName: entry.studentId?.name,
                total,
                percentage,
                marksMap,
            };
        });
        const sorted = [...totals].sort((a, b) => b.total - a.total);
        return totals
            .map((t) => ({
                ...t,
                rank: sorted.findIndex((s) => s.studentId === t.studentId) + 1,
            }))
            .sort((a, b) => a.rank - b.rank);
    };

    const resultViewStats = computeResultStats(resultExam);

    return (
        <div className="space-y-6">
            {/* ── All controls in one row */}
            <div className="flex gap-4 flex-wrap items-end">
                {/* Mode */}
                <div className="w-40">
                    <label className="text-sm font-medium mb-1 block">Mode</label>
                    <Select
                        value={showResult ? "result" : "entry"}
                        onValueChange={(val) => setShowResult(val === "result")}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="entry">Marks Entry</SelectItem>
                            <SelectItem value="result">Result View</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Select Class */}
                <div className="w-48">
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

                {/* Exam Name */}
                <div className="w-48">
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
                            onKeyDown={(e) =>
                                e.key === "Enter" && !examReady && handleOpenTable()
                            }
                        />
                    )}
                </div>

                {/* Marks Entry button */}
                {!showResult && !examReady && (
                    <Button
                        className="self-end"
                        onClick={handleOpenTable}
                        disabled={!selectedClass || !examName.trim()}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Marks Entry
                    </Button>
                )}
            </div>

            {/* ── Results View */}
            {showResult && (
                <div className="rounded border overflow-x-auto">
                    <div className="bg-muted px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold text-sm">Results</span>
                        </div>
                        {resultExam && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 py-0"
                                    onClick={handlePrint}
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                                    Print
                                </Button>
                                {activeRole === "College Admin" && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 py-0"
                                            onClick={() => loadExam(resultExam)}
                                        >
                                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                                            Edit
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 py-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                                    Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the
                                                        exam <strong>{resultExam.examName}</strong> and all its marks.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteExam(resultExam._id)}
                                                        className="bg-red-500 hover:bg-red-600"
                                                    >
                                                        Delete Permanent
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {resultExam ? (
                        <div ref={printRef} className="p-0 sm:p-4 bg-white dark:bg-transparent">
                            {/* PDF/Print Header (Visible only in print) */}
                            <div className="hidden print:block text-center mb-6">
                                <h1 className="text-2xl font-bold uppercase mb-1">{resultExam.examName}</h1>
                                <p className="text-gray-600 text-lg">{selectedClassName}</p>
                                <div className="mt-2 border-b-2 border-black w-32 mx-auto"></div>
                            </div>

                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-muted/60 print:bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-center border font-bold">Rank</th>
                                        <th className="p-3 text-left border font-bold w-28">Adm. No</th>
                                        <th className="p-3 text-left border font-bold">Student</th>
                                        {(resultExam.subjects || []).map((s, i) => (
                                            <th key={i} className="p-3 text-center border font-bold">
                                                {s || `Col ${i + 1}`}
                                            </th>
                                        ))}
                                        <th className="p-3 text-center border font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 print:text-black">
                                            Total
                                        </th>
                                        <th className="p-3 text-center border font-bold bg-green-50 dark:bg-green-950 text-green-900 print:text-black">
                                            %
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultViewStats.map((stat) => (
                                        <tr
                                            key={stat.studentId}
                                            className={`border ${stat.rank === 1
                                                ? "bg-yellow-50 dark:bg-yellow-950/30"
                                                : stat.rank === 2
                                                    ? "bg-slate-50 dark:bg-slate-800/30"
                                                    : stat.rank === 3
                                                        ? "bg-orange-50 dark:bg-orange-950/30"
                                                        : "hover:bg-muted/30"
                                                }`}
                                        >
                                            <td className="p-2 text-center font-bold text-lg border">
                                                {stat.rank === 1
                                                    ? "🥇"
                                                    : stat.rank === 2
                                                        ? "🥈"
                                                        : stat.rank === 3
                                                            ? "🥉"
                                                            : stat.rank}
                                            </td>
                                            <td className="p-2 font-medium border">{stat.studentId}</td>
                                            <td className="p-2 font-medium border">{stat.studentName}</td>
                                            {(resultExam.subjects || []).map((subj, i) => (
                                                <td key={i} className="p-2 text-center border">
                                                    {stat.marksMap[subj || `col${i}`] ?? "-"}
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold border text-blue-700 dark:text-blue-300 print:text-black">
                                                {stat.total}
                                            </td>
                                            <td className="p-2 text-center font-bold border text-green-700 dark:text-green-300 print:text-black">
                                                {stat.percentage}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <style jsx global>{`
                                @media print {
                                    @page {
                                        size: auto;
                                        margin: 10mm;
                                    }
                                    body {
                                        background: white !important;
                                        padding: 0 !important;
                                    }
                                    table {
                                        border-collapse: separate !important;
                                        border-spacing: 2px !important;
                                        border: none !important;
                                    }
                                    th, td {
                                        border: 0.5pt solid black !important;
                                        padding: 4px 8px !important;
                                        line-height: 1.1 !important;
                                        background-color: transparent !important;
                                        -webkit-print-color-adjust: exact;
                                        print-color-adjust: exact;
                                    }
                                    tr {
                                        break-inside: avoid;
                                    }
                                }
                            `}</style>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            Select an exam above to view results.
                        </div>
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
                                    <th className="p-3 text-center border-b bg-blue-50 dark:bg-blue-950 min-w-[60px]">
                                        Total
                                    </th>
                                    <th className="p-3 text-center border-b bg-green-50 dark:bg-green-950 min-w-[60px]">
                                        %
                                    </th>
                                    <th className="p-3 text-center border-b bg-yellow-50 dark:bg-yellow-950 min-w-[60px]">
                                        Rank
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((st, idx) => {
                                    const stat = stats.find((s) => s.studentId === st._id);
                                    return (
                                        <tr key={st._id} className="hover:bg-muted/30 border-b">
                                            <td className="p-2 text-center text-muted-foreground">
                                                {idx + 1}
                                            </td>
                                            <td className="p-1 text-muted-foreground truncate max-w-[50px]">
                                                {st._id}
                                            </td>
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
                                                                const nextCol = document.getElementById(
                                                                    `mark-${idx}-${i + 1}`
                                                                );
                                                                if (nextCol) {
                                                                    nextCol.focus();
                                                                } else {
                                                                    const nextRow = document.getElementById(
                                                                        `mark-${idx + 1}-0`
                                                                    );
                                                                    if (nextRow) nextRow.focus();
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            ))}
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
