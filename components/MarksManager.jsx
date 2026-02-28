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
import { Trash2, Save, Plus, Printer, Trophy, Edit, Settings, X } from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function MarksManager() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedClassName, setSelectedClassName] = useState("");
    const [examName, setExamName] = useState("");
    const [subjects, setSubjects] = useState([{ name: "", maxMark: 100, passMark: 40 }]);
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({});
    const [savedExams, setSavedExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [examReady, setExamReady] = useState(false);
    const [savingMarks, setSavingMarks] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [resultExam, setResultExam] = useState(null);
    const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(null);
    const [isAddingNewExam, setIsAddingNewExam] = useState(false);

    const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
    const [editingSubjectIndex, setEditingSubjectIndex] = useState(null);
    const [subjectForm, setSubjectForm] = useState({ name: "", maxMark: 100, passMark: 40 });
    const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);

    const [gradingScale, setGradingScale] = useState([]);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);

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
        setSubjects([{ name: "", maxMark: 100, passMark: 40 }]);
        setGradingScale([]);
        setExamReady(false);
        setSelectedSubjectIndex(null);
        setIsAddingNewExam(false);
    }, [selectedClass]);

    const loadExam = (exam) => {
        setSelectedExam(exam);
        setExamName(exam.examName);
        const examSubjects = exam.subjects?.length
            ? exam.subjects.map((s) => (typeof s === "string" ? { name: s, maxMark: 100, passMark: 40 } : s))
            : [{ name: "", maxMark: 100, passMark: 40 }];
        setSubjects(examSubjects);
        setGradingScale(exam.gradingScale || []);
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
                const key = subj.name || `col${i}`;
                if (marksObj[key] !== undefined) md[sid][i] = marksObj[key];
            });
        });
        setMarksData(md);
        setExamReady(true);
        setShowResult(false);
        setSelectedSubjectIndex(null);
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

    const openSubjectDialog = (index = null) => {
        if (index !== null) {
            setEditingSubjectIndex(index);
            setSubjectForm(subjects[index]);
        } else {
            setEditingSubjectIndex(null);
            setSubjectForm({ name: "", maxMark: 100, passMark: 40 });
        }
        setIsSubjectDialogOpen(true);
    };

    const saveSubject = () => {
        if (!subjectForm.name.trim()) {
            toast.error("Subject name is required");
            return;
        }
        setSubjects((prev) => {
            const updated = [...prev];
            if (editingSubjectIndex !== null) {
                updated[editingSubjectIndex] = subjectForm;
            } else {
                updated.push(subjectForm);
            }
            return updated;
        });
        setIsSubjectDialogOpen(false);
    };

    const confirmRemoveSubject = () => {
        if (subjectToDeleteIndex === null) return;
        const index = subjectToDeleteIndex;
        const removedKey = subjects[index].name;
        setSubjects((prev) => prev.filter((_, i) => i !== index));
        if (removedKey) {
            const updated = { ...marksData };
            Object.keys(updated).forEach((id) => {
                const newRow = {};
                let offset = 0;
                for (let j = 0; j <= subjects.length; j++) {
                    if (j === index) {
                        offset = 1; continue;
                    }
                    if (updated[id][j] !== undefined) {
                        newRow[j - offset] = updated[id][j];
                    }
                }
                updated[id] = newRow;
            });
            setMarksData(updated);
        }
        setSubjectToDeleteIndex(null);
    };

    const handleMarkChange = (studentId, index, value) => {
        const maxMark = subjects[index]?.maxMark || 100;
        let finalValue = value === "" ? "" : Number(value);
        if (finalValue !== "" && finalValue > maxMark) {
            finalValue = maxMark;
        }
        setMarksData((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], [index]: finalValue },
        }));
    };

    const computeStats = () => {
        // Use only the selected subject for teachers if one is selected
        const currentSubjects = (activeRole === "Teacher" && selectedSubjectIndex !== null)
            ? [subjects[selectedSubjectIndex]]
            : subjects;

        // Map back to original indices in subjects array to read from marksData
        const currentIndices = (activeRole === "Teacher" && selectedSubjectIndex !== null)
            ? [selectedSubjectIndex]
            : subjects.map((_, i) => i);

        const totals = students.map((st) => {
            const total = currentIndices.reduce(
                (sum, origIdx) => sum + (Number(marksData[st._id]?.[origIdx]) || 0),
                0
            );
            const maxTotal = currentSubjects.reduce((sum, s) => sum + (Number(s.maxMark) || 0), 0);
            const percentage =
                maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";

            // Check if student passed relevant subjects
            const hasFailed = currentSubjects.some((subj, i) => {
                const origIdx = currentIndices[i];
                const mark = marksData[st._id]?.[origIdx] || 0;
                return mark < (Number(subj.passMark) || 0);
            });

            let remark = hasFailed ? "Fail" : "Pass";
            if (gradingScale?.length > 0) {
                const matched = gradingScale.find(g => Number(percentage) >= g.min && Number(percentage) <= g.max);
                if (matched) remark = matched.remark;
            }

            return { studentId: st._id, total, percentage, remark };
        });
        const sorted = [...totals].sort((a, b) => Number(b.total) - Number(a.total));
        return totals.map((t) => ({
            ...t,
            rank: sorted.findIndex((s) => s.studentId === t.studentId) + 1,
        }));
    };

    const stats = computeStats();

    const saveMarks = async () => {
        setSavingMarks(true);
        // Ensure all subjects have a name to avoid Mongoose validation errors
        const validatedSubjects = subjects.map((s, i) => ({
            ...s,
            name: s.name.trim() || `Subject ${i + 1}`
        }));

        const payload = {
            examName,
            classId: selectedClass,
            subjects: validatedSubjects,
            gradingScale,
            students: students.map((st) => ({
                studentId: st._id,
                marks: validatedSubjects.reduce((acc, subj, i) => {
                    const val = marksData[st._id]?.[i];
                    if (val !== undefined) acc[subj.name] = val;
                    return acc;
                }, {}),
            })),
        };

        const method = selectedExam ? "PUT" : "POST";
        const url = selectedExam ? `/api/marks/${selectedExam._id}` : `/api/marks`;

        try {
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
                        if (thisExam) {
                            setResultExam(thisExam);
                            // Also update current subjects/marks if needed
                            setSubjects(thisExam.subjects);
                        }
                    });
                if (!selectedExam) setSelectedExam(data.data);
            } else {
                toast.error(data.message || "Failed to save marks");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Network error occurred while saving");
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
                (sum, subj, i) => {
                    const sName = typeof subj === "string" ? subj : subj.name;
                    return sum + (marksMap[sName || `col${i}`] || 0);
                },
                0
            );
            const maxTotal = examSubjects.reduce((sum, s) => sum + (Number(s.maxMark) || 100), 0);
            const percentage =
                maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";

            const hasFailed = examSubjects.some((subj, i) => {
                const sName = typeof subj === "string" ? subj : subj.name;
                const mark = marksMap[sName || `col${i}`] || 0;
                const pMark = typeof subj === "string" ? 40 : (Number(subj.passMark) || 40);
                return mark < pMark;
            });

            let remark = hasFailed ? "Fail" : "Pass";
            if (exam.gradingScale?.length > 0) {
                const matched = exam.gradingScale.find(g => percentage >= g.min && percentage <= g.max);
                if (matched) remark = matched.remark;
            }

            return {
                studentId: entry.studentId?._id,
                studentName: entry.studentId?.name,
                total,
                percentage,
                marksMap,
                remark
            };
        });
        const sorted = [...totals].sort((a, b) => Number(b.total) - Number(a.total));
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
                        // Entry Mode
                        <>
                            {activeRole === "Teacher" || (activeRole !== "Teacher" && !isAddingNewExam && !examReady) ? (
                                <div className="relative">
                                    <Select
                                        value={selectedExam?._id || ""}
                                        onValueChange={(val) => {
                                            if (val === "NEW_EXAM") {
                                                setIsAddingNewExam(true);
                                                setSelectedExam(null);
                                                setExamName("");
                                                return;
                                            }
                                            const exam = savedExams.find((e) => e._id === val);
                                            if (exam) {
                                                loadExam(exam);
                                            } else {
                                                setSelectedExam(null);
                                                setExamName("");
                                                setSubjects([{ name: "", maxMark: 100, passMark: 40 }]);
                                                setExamReady(false);
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select exam..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeRole !== "Teacher" && (
                                                <SelectItem value="NEW_EXAM" className="font-semibold text-primary">
                                                    + Add New Exam
                                                </SelectItem>
                                            )}
                                            {savedExams.map((exam) => (
                                                <SelectItem key={exam._id} value={exam._id}>
                                                    {exam.examName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="flex gap-1 items-center">
                                    <Input
                                        placeholder="e.g. First Term Exam"
                                        value={examName}
                                        onChange={(e) => setExamName(e.target.value)}
                                        onKeyDown={(e) =>
                                            e.key === "Enter" && !examReady && handleOpenTable()
                                        }
                                        className="flex-1"
                                    />
                                    {isAddingNewExam && !examReady && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => setIsAddingNewExam(false)}
                                            title="Back to dropdown"
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Subject Selection for Teachers */}
                {!showResult && examReady && activeRole === "Teacher" && (
                    <div className="w-48">
                        <label className="text-sm font-medium mb-1 block">Subject</label>
                        <Select
                            value={selectedSubjectIndex !== null ? selectedSubjectIndex.toString() : ""}
                            onValueChange={(val) => setSelectedSubjectIndex(val === "" ? null : Number(val))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select subject..." />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map((subj, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        {subj.name || `Subject ${i + 1}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

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
                                {activeRole !== "Teacher" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 py-0"
                                        onClick={() => loadExam(resultExam)}
                                    >
                                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                                        Edit
                                    </Button>
                                )}
                                {activeRole === "College Admin" && (
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
                                        <th className="p-3 text-left border font-bold w-20">Adm. No</th>
                                        <th className="p-3 text-left border font-bold">Student</th>
                                        {(resultExam.subjects || []).map((s, i) => (
                                            <th key={i} className="p-3 text-center border font-bold">
                                                {typeof s === 'string' ? s : (s.name || `Col ${i + 1}`)}
                                                {s.maxMark && <div className="text-[10px] font-normal opacity-70">Max: {s.maxMark}</div>}
                                            </th>
                                        ))}
                                        <th className="p-3 text-center border font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 print:text-black">
                                            Total
                                        </th>
                                        <th className="p-3 text-center border font-bold bg-green-50 dark:bg-green-950 text-green-900 print:text-black">
                                            %
                                        </th>
                                        <th className="p-3 text-center border font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 print:text-black">
                                            Remark
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
                                                    {stat.marksMap[typeof subj === 'string' ? subj : subj.name] ?? "-"}
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold border text-blue-700 dark:text-blue-300 print:text-black">
                                                {stat.total}
                                            </td>
                                            <td className="p-2 text-center font-bold border text-green-700 dark:text-green-300 print:text-black">
                                                {stat.percentage}%
                                            </td>
                                            <td className={`p-2 text-center font-bold border ${stat.remark === "Pass" ? "text-green-600 print:text-green-700" : stat.remark === "Fail" ? "text-red-600 print:text-red-700" : "text-blue-600 print:text-blue-700"}`}>
                                                {stat.remark}
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
                activeRole !== "Teacher" || selectedSubjectIndex !== null ? (
                    <div className="space-y-3">
                        <div className="overflow-x-auto rounded border" ref={printRef}>
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-center border-b w-12">Sl No</th>
                                        <th className="p-1 text-left border-b w-[50px]">Adm. No</th>
                                        <th className="p-1 text-left border-b min-w-[80px]">Name</th>
                                        {subjects.map((subj, i) => {
                                            // Filter for teachers: only show selected subject
                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;

                                            return (
                                                <th key={i} className="p-1 text-center border-b w-auto">
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold truncate max-w-[80px]">
                                                                {subj.name || `Sub ${i + 1}`}
                                                            </span>
                                                            {activeRole !== "Teacher" && (
                                                                <div className="flex items-center gap-1">
                                                                    <Edit
                                                                        className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                                                                        onClick={() => openSubjectDialog(i)}
                                                                    />
                                                                    <Trash2
                                                                        className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (subjects.length <= 1) {
                                                                                toast.error("At least one subject is required.");
                                                                                return;
                                                                            }
                                                                            setSubjectToDeleteIndex(i);
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground leading-none">
                                                            ({subj.passMark}/{subj.maxMark})
                                                        </div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {activeRole !== "Teacher" && (
                                            <th className="p-2 border-b w-10">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openSubjectDialog()}
                                                    title="Add subject column"
                                                >
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </Button>
                                            </th>
                                        )}
                                        <th className="p-3 text-center border-b bg-blue-50 dark:bg-blue-950 min-w-[60px]">
                                            Total
                                        </th>
                                        <th className="p-3 text-center border-b bg-green-50 dark:bg-green-950 min-w-[60px]">
                                            %
                                        </th>
                                        <th className="p-3 text-center border-b bg-yellow-50 dark:bg-yellow-950 min-w-[60px]">
                                            Rank
                                        </th>
                                        <th
                                            className={`p-3 text-center border-b bg-slate-50 dark:bg-slate-900 min-w-[70px] ${activeRole !== "Teacher" ? "cursor-pointer hover:bg-slate-100 transition-colors group" : ""}`}
                                            onClick={() => activeRole !== "Teacher" && setIsGradingDialogOpen(true)}
                                            title={activeRole !== "Teacher" ? "Click to change remark settings" : ""}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Remark
                                                {activeRole !== "Teacher" && (
                                                    <Settings className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                                                )}
                                            </div>
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
                                                {subjects.map((_, i) => {
                                                    // Filter for teachers: only show selected subject
                                                    if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;

                                                    return (
                                                        <td key={i} className="p-1 text-center">
                                                            <Input
                                                                id={`mark-${idx}-${i}`}
                                                                type="number"
                                                                min={0}
                                                                max={subjects[i]?.maxMark || 100}
                                                                className="w-14 mx-auto text-center h-7 text-xs"
                                                                value={marksData[st._id]?.[i] ?? ""}
                                                                onChange={(e) =>
                                                                    handleMarkChange(st._id, i, e.target.value)
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        e.preventDefault();
                                                                        // For teachers, find the next visible student since only one column is shown
                                                                        if (activeRole === "Teacher" && selectedSubjectIndex !== null) {
                                                                            const nextRow = document.getElementById(
                                                                                `mark-${idx + 1}-${i}`
                                                                            );
                                                                            if (nextRow) nextRow.focus();
                                                                            return;
                                                                        }

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
                                                    );
                                                })}
                                                {activeRole !== "Teacher" && <td />}
                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300">
                                                    {stat?.total ?? 0}
                                                </td>
                                                <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300">
                                                    {stat?.percentage ?? 0}%
                                                </td>
                                                <td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300">
                                                    {stat?.rank ?? "-"}
                                                </td>
                                                <td className={`p-2 text-center font-bold ${stat?.remark === "Pass" ? "text-green-600" : stat?.remark === "Fail" ? "text-red-600" : "text-blue-600"}`}>
                                                    {stat?.remark ?? "-"}
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
                ) : (
                    activeRole === "Teacher" && !showResult && examReady && (
                        <div className="p-10 text-center border rounded border-dashed bg-muted/20 text-muted-foreground mt-4">
                            <p className="font-medium">Please select a subject to start entering marks.</p>
                            <p className="text-xs">Subject dropdown is available at the top.</p>
                        </div>
                    )
                )
            )}
            <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{editingSubjectIndex !== null ? "Edit Subject" : "Add New Subject"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Subject Name</label>
                            <Input
                                placeholder="e.g. Mathematics"
                                value={subjectForm.name}
                                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Maximum Mark</label>
                                <Input
                                    type="number"
                                    value={subjectForm.maxMark}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, maxMark: Number(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Pass Mark</label>
                                <Input
                                    type="number"
                                    value={subjectForm.passMark}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, passMark: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between items-center sm:justify-between">
                        {editingSubjectIndex !== null && subjects.length > 1 ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete <strong>{subjectForm.name}</strong>?
                                            All marks for this subject will be permanently removed.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                setIsSubjectDialogOpen(false);
                                                confirmRemoveSubject();
                                            }}
                                            className="bg-red-500 hover:bg-red-600"
                                        >
                                            Confirm Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : <div />}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsSubjectDialogOpen(false)}>Cancel</Button>
                            <Button onClick={saveSubject}>Save Subject</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Grading Scale Dialog */}
            <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Remarks Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {gradingScale.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <Input
                                        type="number"
                                        className="w-16 h-8 text-xs"
                                        placeholder="Min"
                                        value={item.min}
                                        onChange={(e) => {
                                            const updated = [...gradingScale];
                                            updated[idx].min = Number(e.target.value);
                                            setGradingScale(updated);
                                        }}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <Input
                                        type="number"
                                        className="w-16 h-8 text-xs"
                                        placeholder="Max"
                                        value={item.max}
                                        onChange={(e) => {
                                            const updated = [...gradingScale];
                                            updated[idx].max = Number(e.target.value);
                                            setGradingScale(updated);
                                        }}
                                    />
                                    <Input
                                        className="flex-1 h-8 text-xs"
                                        placeholder="Remark (e.g. Good)"
                                        value={item.remark}
                                        onChange={(e) => {
                                            const updated = [...gradingScale];
                                            updated[idx].remark = e.target.value;
                                            setGradingScale(updated);
                                        }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-400"
                                        onClick={() => setGradingScale(prev => prev.filter((_, i) => i !== idx))}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 border-dashed"
                            onClick={() => setGradingScale(prev => [...prev, { min: 0, max: 100, remark: "" }])}
                        >
                            <Plus className="w-3 h-3 mr-2" />
                            Add Range
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsGradingDialogOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Global Subject Delete Confirmation */}
            <AlertDialog
                open={subjectToDeleteIndex !== null}
                onOpenChange={(open) => !open && setSubjectToDeleteIndex(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{subjects[subjectToDeleteIndex]?.name || "this subject"}</strong>?
                            This will clear all marks entered for this subject.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSubjectToDeleteIndex(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemoveSubject}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Delete Column
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
