"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, Plus, Printer, Trophy, Edit, Settings, X, User } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useReactToPrint } from "react-to-print";
import { ComboBox } from "@/components/ui/combobox";
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

export default function MarksManager({ apiKey }) {
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("");
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedClassName, setSelectedClassName] = useState("");
    const [examName, setExamName] = useState("");
    const [subjects, setSubjects] = useState([{ name: "", maxMark: 100, passMark: 40, subColumns: [] }]);
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
    const [resultType, setResultType] = useState("class-wise");
    const [selectedStudentForIndividual, setSelectedStudentForIndividual] = useState("");
    const [institutionName, setInstitutionName] = useState("");
    const [institutionData, setInstitutionData] = useState({});
    const [showSavedPopup, setShowSavedPopup] = useState(false);

    const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
    const [editingSubjectIndex, setEditingSubjectIndex] = useState(null);
    const [subjectForm, setSubjectForm] = useState({ name: "", maxMark: 100, passMark: 40, subColumns: [] });
    const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);

    const [gradingScale, setGradingScale] = useState([]);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);

    const printRef = useRef(null);
    const activeRole = Cookies.get("active-role");

    useEffect(() => {
        if (!apiKey) return;
        const reqHeaders = { "api-key": apiKey };
        Promise.all([
            fetch("/api/classes", { headers: reqHeaders }).then((r) => r.json()),
            fetch("/api/batches", { headers: reqHeaders }).then((r) => r.json()),
            fetch("/api/settings", { headers: reqHeaders }).then((r) => r.json()).catch(() => ({}))
        ]).then(([classesData, batchesData, settingsData]) => {
            setClasses(classesData.classes || []);
            setBatches(
                (batchesData.batches || []).sort((a, b) => {
                    const aYear = a.endYear || a.startYear || 0;
                    const bYear = b.endYear || b.startYear || 0;
                    if (aYear !== bYear) return bYear - aYear;
                    return (b.name || "").localeCompare(a.name || "");
                })
            );
            if (settingsData?.settings?.institution) {
                const inst = settingsData.settings.institution;
                setInstitutionName(inst.name || "");
                setInstitutionData(inst);
            }
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!selectedClass) return;

        let fetchUrl = `/api/users?roles=Student&status=Active`;
        if (selectedBatch) {
            fetchUrl = `/api/users?roles=Student&batchId=${selectedBatch}`;
        } else {
            fetchUrl = `/api/users?roles=Student&classId=${selectedClass}&status=Active`;
        }

        fetch(fetchUrl)
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
        setSubjects([{ name: "", maxMark: 100, passMark: 40, subColumns: [] }]);
        setGradingScale([]);
        setExamReady(false);
        setSelectedSubjectIndex(null);
        setIsAddingNewExam(false);
        setResultType("class-wise");
        setSelectedStudentForIndividual("");
    }, [selectedClass]);

    const loadExam = (exam) => {
        setSelectedExam(exam);
        setExamName(exam.examName);
        const examSubjects = exam.subjects?.length
            ? exam.subjects.map((s) =>
                typeof s === "string"
                    ? { name: s, maxMark: 100, passMark: 40, subColumns: [] }
                    : { ...s, subColumns: s.subColumns || [] }
            )
            : [{ name: "", maxMark: 100, passMark: 40, subColumns: [] }];
        setSubjects(examSubjects);
        setGradingScale(exam.gradingScale || []);
        const md = {};
        (exam.students || []).forEach((entry) => {
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
                const val = marksObj[key];
                if (subj.subColumns && subj.subColumns.length > 0) {
                    // Deserialize { CE: 45, TE: 38 } → { 0: 45, 1: 38 }
                    if (val && typeof val === 'object') {
                        md[sid][i] = subj.subColumns.reduce((acc, sc, j) => {
                            if (val[sc.name] !== undefined) acc[j] = val[sc.name];
                            return acc;
                        }, {});
                    }
                } else {
                    if (val !== undefined) md[sid][i] = val;
                }
            });
        });
        setMarksData(md);
        setExamReady(true);
        setShowResult(false);
        setSelectedSubjectIndex(null);
        setResultType("class-wise");
        setSelectedStudentForIndividual("");
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
            setSubjectForm({ ...subjects[index], subColumns: subjects[index].subColumns || [] });
        } else {
            setEditingSubjectIndex(null);
            setSubjectForm({ name: "", maxMark: 100, passMark: 40, subColumns: [] });
        }
        setIsSubjectDialogOpen(true);
    };

    const saveSubject = () => {
        if (!subjectForm.name.trim()) {
            toast.error("Subject name is required");
            return;
        }
        const hasSubs = (subjectForm.subColumns || []).length > 0;
        const finalSubject = hasSubs
            ? {
                ...subjectForm,
                maxMark: subjectForm.subColumns.reduce((s, sc) => s + (Number(sc.maxMark) || 0), 0),
                passMark: subjectForm.subColumns.reduce((s, sc) => s + (Number(sc.passMark) || 0), 0),
              }
            : subjectForm;
        setSubjects((prev) => {
            const updated = [...prev];
            if (editingSubjectIndex !== null) {
                updated[editingSubjectIndex] = finalSubject;
            } else {
                updated.push(finalSubject);
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

    const handleMarkChange = (studentId, subjIdx, value, subColIdx = null) => {
        if (subColIdx === null) {
            // Simple subject — single mark
            const maxMark = subjects[subjIdx]?.maxMark || 100;
            let finalValue = value === "" ? "" : Number(value);
            if (finalValue !== "" && finalValue > maxMark) finalValue = maxMark;
            setMarksData((prev) => ({
                ...prev,
                [studentId]: { ...prev[studentId], [subjIdx]: finalValue },
            }));
        } else {
            // Sub-column mark
            const sc = subjects[subjIdx]?.subColumns?.[subColIdx];
            const maxMark = sc?.maxMark || 100;
            let finalValue = value === "" ? "" : Number(value);
            if (finalValue !== "" && finalValue > maxMark) finalValue = maxMark;
            setMarksData((prev) => {
                const prevSubj = prev[studentId]?.[subjIdx];
                const prevObj = (prevSubj && typeof prevSubj === 'object') ? prevSubj : {};
                return {
                    ...prev,
                    [studentId]: {
                        ...prev[studentId],
                        [subjIdx]: { ...prevObj, [subColIdx]: finalValue },
                    },
                };
            });
        }
    };

    const computeStats = () => {
        const currentSubjects = (activeRole === "Teacher" && selectedSubjectIndex !== null)
            ? [subjects[selectedSubjectIndex]]
            : subjects;
        const currentIndices = (activeRole === "Teacher" && selectedSubjectIndex !== null)
            ? [selectedSubjectIndex]
            : subjects.map((_, i) => i);

        const totals = students.map((st) => {
            let total = 0;
            let maxTotal = 0;
            let hasFailed = false;

            currentIndices.forEach((origIdx, i) => {
                const subj = currentSubjects[i];
                const markVal = marksData[st._id]?.[origIdx];

                if (subj.subColumns && subj.subColumns.length > 0) {
                    subj.subColumns.forEach((sc, j) => {
                        const v = (markVal && typeof markVal === 'object') ? (Number(markVal[j]) || 0) : 0;
                        total += v;
                        maxTotal += Number(sc.maxMark) || 0;
                        // Fail if ANY sub-column mark is below its pass mark
                        if (v < (Number(sc.passMark) || 0)) hasFailed = true;
                    });
                } else {
                    const v = Number(markVal) || 0;
                    total += v;
                    maxTotal += Number(subj.maxMark) || 0;
                    if (v < (Number(subj.passMark) || 0)) hasFailed = true;
                }
            });

            const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";
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
    const hasAnySubCols = subjects.some(s => (s.subColumns || []).length > 0);

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
                    if (subj.subColumns && subj.subColumns.length > 0) {
                        // Serialize { 0: v, 1: v } → { CE: v, TE: v }
                        const markObj = marksData[st._id]?.[i];
                        if (markObj && typeof markObj === 'object') {
                            const scData = subj.subColumns.reduce((scAcc, sc, j) => {
                                const v = markObj[j];
                                if (v !== undefined && v !== "") scAcc[sc.name] = v;
                                return scAcc;
                            }, {});
                            if (Object.keys(scData).length > 0) acc[subj.name] = scData;
                        }
                    } else {
                        const val = marksData[st._id]?.[i];
                        if (val !== undefined && val !== "") acc[subj.name] = val;
                    }
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
                setShowSavedPopup(true);
                setTimeout(() => setShowSavedPopup(false), 2500);
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

    const saveSettings = async () => {
        const activeExamId = showResult ? resultExam?._id : selectedExam?._id;
        if (!activeExamId) return;

        setSavingMarks(true);
        try {
            const res = await fetch(`/api/marks/${activeExamId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gradingScale,
                    // Send existing data to satisfy schema if needed, but the API should handle partial updates if implemented well.
                    // Assuming partial update is supported as it's a Mongoose PUT.
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Grading settings saved!");
                // Refresh exams to get updated scale everywhere
                const r = await fetch(`/api/marks?classId=${selectedClass}`);
                const d = await r.json();
                setSavedExams(d.data || []);
                setIsGradingDialogOpen(false); // Close dialog on success
            } else {
                toast.error(data.message || "Failed to save settings");
            }
        } catch (error) {
            console.error("Save settings error:", error);
            toast.error("Network error");
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
        const examSubjects = (exam.subjects || []).map(s =>
            typeof s === "string"
                ? { name: s, maxMark: 100, passMark: 40, subColumns: [] }
                : { ...s, subColumns: s.subColumns || [] }
        );

        const totals = examStudents.map((entry) => {
            let marksMap = {};
            if (entry.marks instanceof Map) {
                marksMap = Object.fromEntries(entry.marks);
            } else if (entry.marks && typeof entry.marks === "object") {
                marksMap = entry.marks;
            }

            let total = 0;
            let maxTotal = 0;
            let hasFailed = false;

            examSubjects.forEach((subj) => {
                const val = marksMap[subj.name];
                if (subj.subColumns && subj.subColumns.length > 0) {
                    // val is { CE: 45, TE: 38 }
                    subj.subColumns.forEach((sc) => {
                        const scVal = (val && typeof val === 'object') ? (Number(val[sc.name]) || 0) : 0;
                        total += scVal;
                        maxTotal += Number(sc.maxMark) || 0;
                        if (scVal < (Number(sc.passMark) || 0)) hasFailed = true;
                    });
                } else {
                    const markVal = Number(val) || 0;
                    total += markVal;
                    maxTotal += Number(subj.maxMark) || 100;
                    if (markVal < (Number(subj.passMark) || 0)) hasFailed = true;
                }
            });

            const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";
            let remark = hasFailed ? "Fail" : "Pass";
            if (exam.gradingScale?.length > 0) {
                const matched = exam.gradingScale.find(g => Number(percentage) >= g.min && Number(percentage) <= g.max);
                if (matched) remark = matched.remark;
            }
            return {
                studentId: entry.studentId?._id,
                studentName: entry.studentId?.name,
                total,
                percentage,
                marksMap,
                remark,
                examSubjects,
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
    const hasAnySubColsResult = (resultExam?.subjects || []).some(s => (s.subColumns || []).length > 0);

    const filteredClasses = classes;


    return (
        <div className="space-y-6">
            {/* Centered Save Success Popup */}
            {showSavedPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-background border border-border shadow-2xl rounded-xl px-8 py-5 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <div>
                            <p className="font-semibold text-base text-foreground">Saved Successfully!</p>
                            <p className="text-xs text-muted-foreground">Marks have been saved.</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
                {/* Mode */}
                <div className="col-span-1 order-1 md:order-1">
                    <label className="text-sm font-medium mb-1 block">Mode</label>
                    <Select
                        value={showResult ? "result" : "entry"}
                        onValueChange={(val) => setShowResult(val === "result")}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="entry">Marks Entry</SelectItem>
                            <SelectItem value="result">Result View</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Batch */}
                <div className="col-span-1 order-2 md:order-2">
                    <label className="text-sm font-medium mb-1 block">Batch</label>
                    <Select
                        value={selectedBatch || "none"}
                        onValueChange={(val) => {
                            setSelectedBatch(val === "none" ? "" : val);
                            setSelectedClass(""); 
                        }}
                    >
                        <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">All/No Batch</SelectItem>
                            {[...batches].sort((a, b) => (b.endYear || 0) - (a.endYear || 0)).map(b => (
                                <SelectItem key={b._id} value={b._id}>
                                    {b.name}{b.endYear ? ` (${b.endYear})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Class */}
                <div className="col-span-1 order-3 md:order-3">
                    <label className="text-sm font-medium mb-1 block">Class</label>
                    <Select
                        value={selectedClass || "none"}
                        onValueChange={(val) => {
                            const targetClass = val === "none" ? "" : val;
                            setSelectedClass(targetClass);
                            const cls = classes.find((c) => c._id === targetClass);
                            setSelectedClassName(cls?.name || "");
                        }}
                    >
                        <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">All/No Class</SelectItem>
                            {filteredClasses.map((cls) => (
                                <SelectItem key={cls._id} value={cls._id}>{cls.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Result Type Dropdown */}
                {showResult && resultExam && (
                    <div className="col-span-1 order-4 md:order-5">
                        <label className="text-sm font-medium mb-1 block">Result Type</label>
                        <Select
                            value={resultType}
                            onValueChange={(val) => {
                                setResultType(val);
                                if (val === "class-wise") setSelectedStudentForIndividual("");
                            }}
                        >
                            <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="class-wise">Class Wise</SelectItem>
                                <SelectItem value="individual">Individual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Exam Name */}
                <div className="col-span-2 md:col-span-1 order-5 md:order-4 w-full">
                    <label className="text-sm font-medium mb-1 block">Exam Name</label>
                    {showResult ? (
                        <Select
                            value={resultExam?._id || ""}
                            onValueChange={(val) => {
                                const exam = savedExams.find((e) => e._id === val);
                                setResultExam(exam || null);
                                if (exam && activeRole !== "Teacher") {
                                    setExamName(exam.examName);
                                    setGradingScale(exam.gradingScale || []);
                                }
                            }}
                        >
                            <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                            <SelectContent>
                                {savedExams.map((exam) => (
                                    <SelectItem key={exam._id} value={exam._id}>{exam.examName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <>
                            {activeRole === "Teacher" || (activeRole !== "Teacher" && !isAddingNewExam && !examReady) ? (
                                <Select
                                    value={selectedExam?._id || ""}
                                    onValueChange={(val) => {
                                        if (val === "NEW_EXAM") {
                                            setIsAddingNewExam(true);
                                            setSelectedExam(null);
                                            setExamName("");
                                            setGradingScale([]);
                                            return;
                                        }
                                        const exam = savedExams.find((e) => e._id === val);
                                        if (exam) {
                                            loadExam(exam);
                                        } else {
                                            setSelectedExam(null);
                                            setExamName("");
                                            setSubjects([{ name: "", maxMark: 100, passMark: 40, subColumns: [] }]);
                                            setGradingScale([]);
                                            setExamReady(false);
                                        }
                                    }}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                                    <SelectContent>
                                        {activeRole !== "Teacher" && (
                                            <SelectItem value="NEW_EXAM" className="font-semibold text-primary">+ Add New Exam</SelectItem>
                                        )}
                                        {savedExams.map((exam) => (
                                            <SelectItem key={exam._id} value={exam._id}>{exam.examName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex gap-1 items-center">
                                    <Input
                                        autoFocus
                                        placeholder="e.g. First Term Exam"
                                        value={examName}
                                        onChange={(e) => setExamName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !examReady && handleOpenTable()}
                                        className="flex-1"
                                    />
                                    {isAddingNewExam && !examReady && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsAddingNewExam(false)} title="Back to dropdown">
                                            <X className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Select Student */}
                {showResult && resultType === "individual" && resultExam && (
                    <div className="col-span-2 md:col-span-1 order-6 w-full">
                        <label className="text-sm font-medium mb-1 block">Select Student</label>
                        <ComboBox
                            items={resultViewStats.map(st => ({
                                value: st.studentId,
                                label: `${st.studentName} (${st.studentId})`
                            }))}
                            value={selectedStudentForIndividual}
                            onSelect={setSelectedStudentForIndividual}
                            placeholder="Search student..."
                        />
                    </div>
                )}

                {/* Subject Selection for Teachers */}
                {!showResult && examReady && activeRole === "Teacher" && (
                    <div className="col-span-2 md:col-span-1 order-7 w-full">
                        <label className="text-sm font-medium mb-1 block">Subject</label>
                        <Select
                            value={selectedSubjectIndex !== null ? selectedSubjectIndex.toString() : ""}
                            onValueChange={(val) => setSelectedSubjectIndex(val === "" ? null : Number(val))}
                        >
                            <SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger>
                            <SelectContent>
                                {subjects.map((subj, i) => (
                                    <SelectItem key={i} value={i.toString()}>{subj.name || `Subject ${i + 1}`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Marks Entry button */}
                {!showResult && !examReady && (
                    <div className="col-span-2 md:col-span-1 order-8 w-full sm:w-auto">
                        <Button className="w-full sm:w-auto" onClick={handleOpenTable} disabled={!selectedClass || !examName.trim()}>
                            <Save className="w-4 h-4 mr-2" />
                            Marks Entry
                        </Button>
                    </div>
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
                                    variant="default"
                                    className="h-8 py-0 bg-foreground text-background hover:bg-foreground/90"
                                    onClick={handlePrint}
                                >
                                    <Printer className="w-3.5 h-3.5 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Print</span>
                                </Button>
                                {activeRole !== "Teacher" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 py-0"
                                        onClick={() => loadExam(resultExam)}
                                    >
                                        <Edit className="w-3.5 h-3.5 sm:mr-1.5" />
                                        <span className="hidden sm:inline">Edit</span>
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
                                                <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
                                                <span className="hidden sm:inline">Delete</span>
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
                        resultType === "class-wise" ? (
                            <div ref={printRef} className="p-0 sm:p-4 bg-white dark:bg-transparent">
                                {/* PDF/Print Header (Visible only in print) */}
                                <div className="hidden print:block mb-4">
                                    <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-300">
                                        {/* Left: Logo + Name */}
                                        <div className="flex items-center gap-4">
                                            {institutionData?.logo?.url && (
                                                <img src={institutionData.logo.url} alt="Logo" className="w-16 h-16 object-contain" />
                                            )}
                                            <div>
                                                <h1 className="text-xl font-bold text-gray-900">{institutionData?.name || institutionName || "INSTITUTION"}</h1>
                                                {institutionData?.tagline && <p className="text-sm text-gray-600 italic">{institutionData.tagline}</p>}
                                            </div>
                                        </div>
                                        {/* Right: Contact */}
                                        <div className="text-right text-xs text-gray-600 space-y-0.5">
                                            {institutionData?.address && <p>{institutionData.address}</p>}
                                            {institutionData?.contact?.primaryPhone && <p>Phone: {institutionData.contact.primaryPhone}{institutionData?.contact?.secondaryPhone ? `, ${institutionData.contact.secondaryPhone}` : ""}</p>}
                                            {institutionData?.contact?.email && <p>Email: {institutionData.contact.email}</p>}
                                        </div>
                                    </div>
                                    <div className="bg-black text-white text-center py-1.5">
                                        <h2 className="text-base font-semibold">{resultExam.examName} — Result</h2>
                                    </div>
                                    {selectedClassName && (
                                        <div className="bg-gray-100 text-center py-1 border-b border-gray-300">
                                            <p className="text-sm font-medium text-gray-700">{selectedClassName}{batches.find(b => b._id === selectedBatch) ? ` · ${batches.find(b => b._id === selectedBatch).name}${batches.find(b => b._id === selectedBatch).endYear ? ` (${batches.find(b => b._id === selectedBatch).endYear})` : ""}` : ""}</p>
                                        </div>
                                    )}
                                </div>

                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-muted/60 print:bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-center border font-bold" rowSpan={hasAnySubColsResult ? 2 : 1}>Rank</th>
                                            <th className="p-3 text-left border font-bold w-20" rowSpan={hasAnySubColsResult ? 2 : 1}>Adm. No</th>
                                            <th className="p-3 text-left border font-bold" rowSpan={hasAnySubColsResult ? 2 : 1}>Student</th>
                                            {(resultExam.subjects || []).map((s, i) => {
                                                const scs = s.subColumns || [];
                                                if (scs.length > 0) {
                                                    return (
                                                        <th key={i} colSpan={scs.length + 1} className="p-2 text-center border font-bold bg-muted/30">
                                                            {s.name || `Col ${i + 1}`}
                                                        </th>
                                                    );
                                                }
                                                return (
                                                    <th key={i} rowSpan={hasAnySubColsResult ? 2 : 1} className="p-3 text-center border font-bold">
                                                        {typeof s === 'string' ? s : (s.name || `Col ${i + 1}`)}
                                                        {s.maxMark && <div className="text-[10px] font-normal opacity-70">Max: {s.maxMark}</div>}
                                                    </th>
                                                );
                                            })}
                                            <th className="p-3 text-center border font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 print:text-black" rowSpan={hasAnySubColsResult ? 2 : 1}>Total</th>
                                            <th className="p-3 text-center border font-bold bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-200 print:text-black" rowSpan={hasAnySubColsResult ? 2 : 1}>%</th>
                                            <th className="p-3 text-center border font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 print:text-black" rowSpan={hasAnySubColsResult ? 2 : 1}>Remark</th>
                                        </tr>
                                        {hasAnySubColsResult && (
                                            <tr>
                                                {(resultExam.subjects || []).map((s, i) => {
                                                    const scs = s.subColumns || [];
                                                    if (scs.length > 0) {
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {scs.map((sc, j) => (
                                                                    <th key={`${i}-${j}`} className="p-2 text-center border font-bold text-xs">
                                                                        <div>{sc.name}</div>
                                                                        <div className="text-[9px] font-normal opacity-70">({sc.passMark}/{sc.maxMark})</div>
                                                                    </th>
                                                                ))}
                                                                <th key={`${i}-sub`} className="p-2 text-center border font-bold text-xs bg-blue-50/50 dark:bg-blue-950/50">Sub Total</th>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </tr>
                                        )}
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
                                                {(resultExam.subjects || []).map((subj, i) => {
                                                    const subjName = typeof subj === 'string' ? subj : subj.name;
                                                    const scs = subj.subColumns || [];
                                                    const markVal = stat.marksMap[subjName];
                                                    if (scs.length > 0) {
                                                        const subjTotal = scs.reduce((sum, sc) => {
                                                            return sum + ((markVal && typeof markVal === 'object') ? (Number(markVal[sc.name]) || 0) : 0);
                                                        }, 0);
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {scs.map((sc, j) => {
                                                                    const val = (markVal && typeof markVal === 'object') ? markVal[sc.name] : undefined;
                                                                    const isFailed = val !== undefined && val !== "" && Number(val) < (Number(sc.passMark) || 0);
                                                                    return (
                                                                        <td key={`${i}-${j}`} className={`p-2 text-center border ${isFailed ? 'text-red-600 font-bold' : ''}`}>
                                                                            {val ?? "-"}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="p-2 text-center font-semibold text-blue-800 bg-blue-50/30 border">{subjTotal || "-"}</td>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    const isFailed = markVal !== undefined && markVal !== null && typeof markVal !== 'object' && Number(markVal) < (Number(subj.passMark) || 0);
                                                    return (
                                                        <td key={i} className={`p-2 text-center border ${isFailed ? 'text-red-600 font-bold' : ''}`}>
                                                            {typeof markVal === 'object' ? '-' : (markVal ?? "-")}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-2 text-center font-bold border text-blue-700 dark:text-blue-300 print:text-black">
                                                    {stat.total}
                                                </td>
                                                <td className="p-2 text-center font-bold border text-green-700 dark:text-green-300 print:text-black">
                                                    {stat.percentage}%
                                                </td>
                                                <td className={`p-2 text-center font-bold border ${stat.remark === "Pass" ? "text-green-600 print:text-green-700" : stat.remark === "Fail" || stat.remark === "Failed" ? "text-red-600 print:text-red-700" : "text-blue-600 print:text-blue-700"}`}>
                                                    {stat.remark === "Pass" ? "Passed" : stat.remark === "Fail" ? "Failed" : stat.remark}
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
                                            border-collapse: collapse !important;
                                            border-spacing: 0 !important;
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
                            <div ref={printRef} className="p-2 sm:p-8 bg-white dark:bg-transparent flex justify-center">
                                {selectedStudentForIndividual ? (
                                    (() => {
                                        const stat = resultViewStats.find(s => s.studentId === selectedStudentForIndividual);
                                        if (!stat) return <div>Student not found.</div>;
                                        return (
                                            <div className="border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-8 w-full max-w-3xl shadow-lg bg-white dark:bg-slate-950 relative print-poster">
                                                <div className="text-center mb-6 border-b pb-4">
                                                    <div className="flex items-center justify-center gap-3 mb-2">
                                                        {institutionData?.logo?.url && (
                                                            <img
                                                                src={institutionData.logo.url}
                                                                alt="Institution Logo"
                                                                className="w-10 h-10 sm:w-16 sm:h-16 object-contain shrink-0"
                                                            />
                                                        )}
                                                        <div className="text-center min-w-0">
                                                            <h2 className="text-base sm:text-2xl font-bold uppercase tracking-wide text-primary leading-tight break-words">
                                                                {institutionData?.name || institutionName || "INSTITUTION"}
                                                            </h2>
                                                            {institutionData?.tagline && (
                                                                <p className="text-xs sm:text-sm text-muted-foreground italic mt-0.5">{institutionData.tagline}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm sm:text-base">
                                                        {selectedClassName} {batches.find(b => b._id === selectedBatch) ? `${batches.find(b => b._id === selectedBatch).name}${batches.find(b => b._id === selectedBatch).endYear ? ` (${batches.find(b => b._id === selectedBatch).endYear})` : ''}` : ""}
                                                    </p>
                                                    <p className="text-xs sm:text-sm font-semibold mt-2 bg-muted inline-block px-3 py-1 rounded-full">
                                                        {resultExam.examName}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 sm:gap-6 mb-6 bg-slate-50 dark:bg-slate-900 p-3 sm:p-6 rounded-lg border">
                                                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-muted border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                                        {(() => {
                                                            const studentObj = students.find(s => s._id === selectedStudentForIndividual || s.admissionNumber === selectedStudentForIndividual || s.admissionNumber === stat.studentId || s._id === stat.studentId);
                                                            const photoUrl = studentObj?.profilePic?.url || studentObj?.photo?.url;
                                                            if (photoUrl) {
                                                                return <img src={photoUrl} alt="Student" className="w-full h-full object-cover" />;
                                                            }
                                                            return <User className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400" />;
                                                        })()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg sm:text-2xl font-bold break-words">{stat.studentName}</h3>
                                                        <div className="text-muted-foreground flex flex-wrap gap-2 sm:gap-4 mt-1 text-sm">
                                                            <span>ID: <strong>{stat.studentId}</strong></span>
                                                            <span>Rank: <strong>{stat.rank}</strong></span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto -mx-4 sm:mx-0">
                                                <table className="w-full text-left mb-6 border-collapse text-sm">
                                                    <thead>
                                                        <tr className="bg-muted/60">
                                                            <th className="p-3 border font-bold">Subject</th>
                                                            <th className="p-3 border text-center font-bold">Max Mark</th>
                                                            <th className="p-3 border text-center font-bold">Marks Obtained</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(resultExam.subjects || []).map((subj, i) => {
                                                            const subjName = typeof subj === 'string' ? subj : subj.name;
                                                            const scs = subj.subColumns || [];
                                                            const markVal = stat.marksMap[subjName];
                                                            
                                                            if (scs.length > 0) {
                                                                const subjTotal = scs.reduce((sum, sc) => {
                                                                    return sum + ((markVal && typeof markVal === 'object') ? (Number(markVal[sc.name]) || 0) : 0);
                                                                }, 0);
                                                                
                                                                return (
                                                                    <React.Fragment key={i}>
                                                                        <tr className="bg-slate-50 dark:bg-slate-900/50">
                                                                            <td colSpan={3} className="p-2 border font-bold text-sm bg-muted/30">{subjName}</td>
                                                                        </tr>
                                                                        {scs.map((sc, j) => {
                                                                            const val = (markVal && typeof markVal === 'object') ? markVal[sc.name] : undefined;
                                                                            const isFailed = val !== undefined && val !== "" && Number(val) < (Number(sc.passMark) || 0);
                                                                            return (
                                                                                <tr key={`${i}-${j}`}>
                                                                                    <td className="p-3 border pl-6 text-muted-foreground">{sc.name}</td>
                                                                                    <td className="p-3 border text-center">{sc.maxMark}</td>
                                                                                    <td className={`p-3 border text-center font-semibold ${isFailed ? 'text-red-600' : ''}`}>{val ?? "-"}</td>
                                                                                </tr>
                                                                            )
                                                                        })}
                                                                        <tr className="font-semibold bg-blue-50/30 dark:bg-blue-950/30">
                                                                            <td className="p-3 border text-right" colSpan={2}>Sub Total ({subjName})</td>
                                                                            <td className="p-3 border text-center text-blue-700 dark:text-blue-300">{subjTotal || "-"}</td>
                                                                        </tr>
                                                                    </React.Fragment>
                                                                );
                                                            }

                                                            const isFailed = markVal !== undefined && markVal !== null && typeof markVal !== 'object' && Number(markVal) < (Number(subj.passMark) || 0);
                                                            return (
                                                                <tr key={i}>
                                                                    <td className="p-3 border font-medium">{subjName}</td>
                                                                    <td className="p-3 border text-center">{subj.maxMark || 100}</td>
                                                                    <td className={`p-3 border text-center font-bold ${isFailed ? 'text-red-600' : ''}`}>
                                                                        {typeof markVal === 'object' ? '-' : (markVal ?? "-")}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                </div>
                                                <div className="flex flex-wrap justify-between items-center border-t-2 border-slate-200 dark:border-slate-800 pt-4 gap-3 text-sm sm:text-base">
                                                    <div>Total: <strong className="text-lg sm:text-2xl">{stat.total}</strong></div>
                                                    <div>Percentage: <strong className="text-lg sm:text-2xl">{stat.percentage}%</strong></div>
                                                    <div className="flex items-center gap-2">
                                                        Remark:
                                                        <span className={`px-3 py-1 rounded text-white font-bold text-sm ${stat.remark === "Pass" ? "bg-green-600" : stat.remark === "Fail" || stat.remark === "Failed" ? "bg-red-600" : "bg-blue-600"}`}>
                                                            {stat.remark === "Pass" ? "Passed" : stat.remark === "Fail" ? "Failed" : stat.remark}
                                                        </span>
                                                    </div>
                                                </div>

                                                <style jsx global>{`
                                                    @media print {
                                                        @page {
                                                            size: A4 portrait;
                                                            margin: 10mm;
                                                        }
                                                        html, body {
                                                            width: 100%;
                                                            height: 100%;
                                                            margin: 0 !important;
                                                            padding: 0 !important;
                                                        }
                                                        .print-poster {
                                                            width: 100%;
                                                            height: auto;
                                                            page-break-inside: avoid;
                                                            break-inside: avoid;
                                                            page-break-after: avoid;
                                                            page-break-before: avoid;
                                                            box-shadow: none !important;
                                                            border: 2px solid #e2e8f0 !important;
                                                            margin: 0 auto !important;
                                                        }
                                                    }
                                                `}</style>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="py-20 text-center text-muted-foreground w-full">
                                        Please select a student from the dropdown to view their result.
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            Select an exam above to view results.
                        </div>
                    )}
                </div>
            )}

            {/* ── Marks Entry Table */}
            {examReady && !showResult && students.length === 0 && (
                <div className="p-10 text-center border rounded bg-muted/20 text-muted-foreground mt-4">
                    <p className="font-medium">No students found in the selected class.</p>
                </div>
            )}
            {examReady && !showResult && students.length > 0 && (
                activeRole !== "Teacher" || selectedSubjectIndex !== null ? (
                    <div className="space-y-3">
                        <div className="overflow-x-auto rounded border" ref={printRef}>
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-center border w-12" rowSpan={hasAnySubCols ? 2 : 1}>Sl No</th>
                                        <th className="p-1 text-left border w-[50px]" rowSpan={hasAnySubCols ? 2 : 1}>Adm. No</th>
                                        <th className="p-1 text-left border min-w-[80px]" rowSpan={hasAnySubCols ? 2 : 1}>Name</th>
                                        {subjects.map((subj, i) => {
                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                            const scs = subj.subColumns || [];
                                            if (scs.length > 0) {
                                                return (
                                                    <th key={i} colSpan={scs.length + 1} className="p-1 text-center border">
                                                        <div className="flex flex-col items-center gap-1 group">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-semibold truncate max-w-[120px]">{subj.name || `Sub ${i + 1}`}</span>
                                                                {activeRole !== "Teacher" && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Edit className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => openSubjectDialog(i)} />
                                                                        <Trash2 className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors" onClick={(e) => { e.stopPropagation(); if (subjects.length <= 1) { toast.error("At least one subject is required."); return; } setSubjectToDeleteIndex(i); }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            }
                                            return (
                                                <th key={i} rowSpan={hasAnySubCols ? 2 : 1} className="p-1 text-center border w-auto">
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold truncate max-w-[80px]">{subj.name || `Sub ${i + 1}`}</span>
                                                            {activeRole !== "Teacher" && (
                                                                <div className="flex items-center gap-1">
                                                                    <Edit className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => openSubjectDialog(i)} />
                                                                    <Trash2 className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors" onClick={(e) => { e.stopPropagation(); if (subjects.length <= 1) { toast.error("At least one subject is required."); return; } setSubjectToDeleteIndex(i); }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground leading-none">({subj.passMark}/{subj.maxMark})</div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {activeRole !== "Teacher" && (
                                            <th className="p-2 border w-10" rowSpan={hasAnySubCols ? 2 : 1}>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSubjectDialog()} title="Add subject column">
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </Button>
                                            </th>
                                        )}
                                        <th className="p-3 text-center border bg-blue-50 dark:bg-blue-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>Total</th>
                                        <th className="p-3 text-center border bg-green-50 dark:bg-green-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>%</th>
                                        <th className="p-3 text-center border bg-yellow-50 dark:bg-yellow-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>Rank</th>
                                        <th
                                            className={`p-3 text-center border bg-slate-50 dark:bg-slate-900 min-w-[70px] ${activeRole !== "Teacher" ? "cursor-pointer hover:bg-slate-100 transition-colors group" : ""}`}
                                            onClick={() => activeRole !== "Teacher" && setIsGradingDialogOpen(true)}
                                            title={activeRole !== "Teacher" ? "Click to change remark settings" : ""}
                                            rowSpan={hasAnySubCols ? 2 : 1}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Remark
                                                {activeRole !== "Teacher" && <Settings className="w-3 h-3 text-muted-foreground group-hover:text-primary" />}
                                            </div>
                                        </th>
                                    </tr>
                                    {hasAnySubCols && (
                                        <tr>
                                            {subjects.map((subj, i) => {
                                                if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                                const scs = subj.subColumns || [];
                                                if (scs.length > 0) {
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {scs.map((sc, j) => (
                                                                <th key={`${i}-${j}`} className="p-1 text-center border text-xs font-semibold">
                                                                    <div>{sc.name}</div>
                                                                    <div className="text-[9px] text-muted-foreground">({sc.passMark}/{sc.maxMark})</div>
                                                                </th>
                                                            ))}
                                                            <th key={`${i}-sub`} className="p-1 text-center border text-xs font-semibold bg-blue-50/50 dark:bg-blue-950/50 min-w-[50px]">Sub Total</th>
                                                        </React.Fragment>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {students.map((st, idx) => {
                                        const stat = stats.find((s) => s.studentId === st._id);
                                        return (
                                            <tr key={st._id} className="hover:bg-muted/30 border">
                                                <td className="p-2 text-center text-muted-foreground border">{idx + 1}</td>
                                                <td className="p-1 text-muted-foreground truncate max-w-[50px] border">{st._id}</td>
                                                <td className="p-1 font-medium border">{st.name}</td>
                                                {subjects.map((subj, i) => {
                                                    if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                                    const scs = subj.subColumns || [];
                                                    if (scs.length > 0) {
                                                        const markObj = marksData[st._id]?.[i];
                                                        const subjTotal = scs.reduce((sum, _, j) => sum + ((markObj && typeof markObj === 'object') ? (Number(markObj[j]) || 0) : 0), 0);
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {scs.map((sc, j) => {
                                                                    const val = (markObj && typeof markObj === 'object') ? markObj[j] : undefined;
                                                                    const isFailed = val !== undefined && val !== "" && Number(val) < (Number(sc.passMark) || 0);
                                                                    return (
                                                                        <td key={`${i}-${j}`} className="p-1 text-center border">
                                                                            <Input
                                                                                id={`mark-${idx}-${i}-${j}`}
                                                                                type="number" min={0} max={sc.maxMark || 100}
                                                                                className={`w-14 mx-auto text-center h-7 text-xs ${isFailed ? "text-red-600 font-bold" : ""}`}
                                                                                value={val ?? ""}
                                                                                onChange={(e) => handleMarkChange(st._id, i, e.target.value, j)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") {
                                                                                        e.preventDefault();
                                                                                        const nextSub = document.getElementById(`mark-${idx}-${i}-${j + 1}`);
                                                                                        if (nextSub) { nextSub.focus(); return; }
                                                                                        const nextSubj = document.getElementById(`mark-${idx}-${i + 1}-0`);
                                                                                        if (nextSubj) { nextSubj.focus(); return; }
                                                                                        const nextSimple = document.getElementById(`mark-${idx}-${i + 1}`);
                                                                                        if (nextSimple) { nextSimple.focus(); return; }
                                                                                        const nextRow = document.getElementById(`mark-${idx + 1}-${i}-0`);
                                                                                        if (nextRow) nextRow.focus();
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300 border bg-blue-50/30 dark:bg-blue-950/30">
                                                                    {subjTotal || "-"}
                                                                </td>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    return (() => {
                                                        const val = marksData[st._id]?.[i];
                                                        const isFailed = val !== undefined && val !== "" && Number(val) < (Number(subj.passMark) || 0);
                                                        return (
                                                            <td key={i} className="p-1 text-center border">
                                                                <Input
                                                                    id={`mark-${idx}-${i}`}
                                                                    type="number" min={0} max={subj.maxMark || 100}
                                                                    className={`w-14 mx-auto text-center h-7 text-xs ${isFailed ? "text-red-600 font-bold" : ""}`}
                                                                    value={val ?? ""}
                                                                    onChange={(e) => handleMarkChange(st._id, i, e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null) {
                                                                                const nextRow = document.getElementById(`mark-${idx + 1}-${i}`);
                                                                                if (nextRow) nextRow.focus();
                                                                                return;
                                                                            }
                                                                            const nextCol = document.getElementById(`mark-${idx}-${i + 1}`);
                                                                            if (nextCol) { nextCol.focus(); }
                                                                            else { const nextRow = document.getElementById(`mark-${idx + 1}-0`); if (nextRow) nextRow.focus(); }
                                                                        }
                                                                    }}
                                                                />
                                                            </td>
                                                        );
                                                    })();
                                                })}
                                                {activeRole !== "Teacher" && <td className="border" />}
                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300 border">{stat?.total ?? 0}</td>
                                                <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300 border">{stat?.percentage ?? 0}%</td>

                                                <td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300 border">{stat?.rank ?? "-"}</td>
                                                <td className={`p-2 text-center font-bold ${stat?.remark === "Pass" ? "text-green-600" : stat?.remark === "Fail" ? "text-red-600" : "text-blue-600"}`}>{stat?.remark ?? "-"}</td>
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
                <DialogContent className="sm:max-w-[480px]">
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
                        {/* Sub Columns */}
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Sub Columns <span className="text-xs text-muted-foreground font-normal">(e.g. CE, TE)</span></label>
                                <Button
                                    type="button" variant="outline" size="sm" className="h-7 text-xs"
                                    onClick={() => setSubjectForm(prev => ({ ...prev, subColumns: [...(prev.subColumns || []), { name: "", maxMark: 50, passMark: 20 }] }))}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add
                                </Button>
                            </div>
                            {(subjectForm.subColumns || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No sub-columns — single mark input per subject.</p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-[1fr_52px_52px_32px] gap-1 text-[10px] text-muted-foreground font-medium px-1">
                                        <span>Name</span><span className="text-center">Max</span><span className="text-center">Pass</span><span />
                                    </div>
                                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                                        {(subjectForm.subColumns || []).map((sc, j) => (
                                            <div key={j} className="grid grid-cols-[1fr_52px_52px_32px] gap-1 items-center">
                                                <Input placeholder="CE" className="h-8 text-xs" value={sc.name}
                                                    onChange={(e) => { const u = [...(subjectForm.subColumns || [])]; u[j] = { ...u[j], name: e.target.value.toUpperCase() }; setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                />
                                                <Input type="number" placeholder="Max" className="h-8 text-xs text-center" value={sc.maxMark}
                                                    onChange={(e) => { const u = [...(subjectForm.subColumns || [])]; u[j] = { ...u[j], maxMark: Number(e.target.value) }; setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                />
                                                <Input type="number" placeholder="Pass" className="h-8 text-xs text-center" value={sc.passMark}
                                                    onChange={(e) => { const u = [...(subjectForm.subColumns || [])]; u[j] = { ...u[j], passMark: Number(e.target.value) }; setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                />
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                                                    onClick={() => { const u = (subjectForm.subColumns || []).filter((_, k) => k !== j); setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-xs text-muted-foreground border-t pt-1.5 flex gap-4">
                                        <span>Auto Max: <strong>{(subjectForm.subColumns || []).reduce((s, sc) => s + (Number(sc.maxMark) || 0), 0)}</strong></span>
                                        <span>Auto Pass: <strong>{(subjectForm.subColumns || []).reduce((s, sc) => s + (Number(sc.passMark) || 0), 0)}</strong></span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Max/Pass marks — only when no sub-columns */}
                        {(subjectForm.subColumns || []).length === 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Maximum Mark</label>
                                    <Input type="number" value={subjectForm.maxMark} onChange={(e) => setSubjectForm({ ...subjectForm, maxMark: Number(e.target.value) })} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Pass Mark</label>
                                    <Input type="number" value={subjectForm.passMark} onChange={(e) => setSubjectForm({ ...subjectForm, passMark: Number(e.target.value) })} />
                                </div>
                            </div>
                        )}
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
                        {activeRole !== "Teacher" && (selectedExam || resultExam) && (
                            <Button className="w-full" onClick={saveSettings} disabled={savingMarks}>
                                <Save className="w-3.5 h-3.5 mr-2" />
                                {savingMarks ? "Saving..." : "Save Settings"}
                            </Button>
                        )}
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
