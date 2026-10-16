"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  GraduationCap,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  X,
  BookMarked,
  Search,
  Users,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Header from "./Header";

const YEAR_OPTIONS = ["1", "2", "3", "4", "5"];
const STATUS_OPTIONS = ["Completed", "Ongoing", "Pending"];

const STATUS_COLORS = {
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

export default function StudentCourses({
  classes = [],
  batches = [],
  initialCourses = [],
  initialStudents = [],
  apiKey,
}) {
  // ── Master data state ────────────────────────────────────────────────────
  const [students, setStudents] = useState(initialStudents || []);
  const [loadingStudents, setLoadingStudents] = useState(
    (!initialStudents || initialStudents.length === 0) &&
      (!initialCourses || initialCourses.length === 0)
  );
  const [savedCourses, setSavedCourses] = useState(initialCourses || []);
  const [saving, setSaving] = useState(false);

  // ── Main table filter & search ───────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "Islamic" | "Academic"

  // ── Selected course and year for popup drilldown ────────────────────────
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

  // ── Edit Course Dialog for a student ─────────────────────────────────────
  const [editingItem, setEditingItem] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    courseName: "",
    universityBoard: "",
    year: "1",
    status: "Ongoing",
    type: "Islamic",
  });

  // ── Delete Confirmation for a student's course ───────────────────────────
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // ── Delete Master Course Confirmation ────────────────────────────────────
  const [deletingMasterCourse, setDeletingMasterCourse] = useState(null);
  const [isDeleteMasterOpen, setIsDeleteMasterOpen] = useState(false);

  // ── Edit Master Course State ─────────────────────────────────────────────
  const [editingMasterCourse, setEditingMasterCourse] = useState(null);
  const [isEditMasterOpen, setIsEditMasterOpen] = useState(false);
  const [editMasterFormData, setEditMasterFormData] = useState({
    name: "",
    type: "Academic",
    universityBoard: "",
  });

  // ── Edit / Delete Year in Course Popup States ────────────────────────────
  const [editingYearData, setEditingYearData] = useState(null);
  const [isEditYearOpen, setIsEditYearOpen] = useState(false);
  const [newYearValue, setNewYearValue] = useState("1");

  const [deletingYearData, setDeletingYearData] = useState(null);
  const [isDeleteYearOpen, setIsDeleteYearOpen] = useState(false);

  // ── Add Course Popup States (Top Right Button) ───────────────────────────
  const [isAddCoursePopupOpen, setIsAddCoursePopupOpen] = useState(false);
  const [popupCourseType, setPopupCourseType] = useState("Islamic");
  const [popupCourseName, setPopupCourseName] = useState("");
  const [popupUniversityBoard, setPopupUniversityBoard] = useState("");
  const [popupYear, setPopupYear] = useState("1");
  const [popupStatus, setPopupStatus] = useState("Ongoing");
  const [popupBatchId, setPopupBatchId] = useState("");
  const [popupClassId, setPopupClassId] = useState("");
  const [popupStudents, setPopupStudents] = useState([]);
  const [popupSelectedStudentIds, setPopupSelectedStudentIds] = useState([]);
  const [loadingPopupStudents, setLoadingPopupStudents] = useState(false);
  const [isSubmittingPopup, setIsSubmittingPopup] = useState(false);

  // Maps for quick lookup
  const classMap = useMemo(
    () =>
      new Map(
        (classes || []).map((c) => [
          String(c._id),
          c.name || c.shortname || c._id,
        ])
      ),
    [classes]
  );

  const batchMap = useMemo(
    () =>
      new Map(
        (batches || []).map((b) => [String(b._id), b.name || String(b._id)])
      ),
    [batches]
  );

  // ── Fetch all students on mount (non-blocking if initialStudents already provided) ──
  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        roles: "Student",
        limit: "10000",
        projection:
          "name,studentSpecificField.islamicCourses,studentSpecificField.academicCourses,studentSpecificField.classId,studentSpecificField.batchId,studentSpecificField.status",
      });
      const res = await fetch(`/api/users?${params}`, {
        headers: apiKey ? { "x-api-key": apiKey } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.users || data || [];
        if (Array.isArray(list) && list.length > 0) {
          setStudents(list);
        }
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoadingStudents(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ── Fetch master courses for suggestions & enrolled students ─────────────
  const fetchMasterCourses = useCallback(() => {
    fetch("/api/courses", {
      headers: apiKey ? { "x-api-key": apiKey } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setSavedCourses(data.courses);
        }
      })
      .catch((err) => console.error("Error loading master courses:", err));
  }, [apiKey]);

  useEffect(() => {
    fetchMasterCourses();
  }, [fetchMasterCourses]);

  // ── Aggregate Courses with Enrolled Students ─────────────────────────────
  const aggregatedCourses = useMemo(() => {
    const courseMap = new Map();

    const getOrInitCourse = (name, type, defaultBoard = "") => {
      const cleanName = (name || "").trim();
      const cleanType = type === "Islamic" ? "Islamic" : "Academic";
      const key = `${cleanType.toLowerCase()}:${cleanName.toLowerCase()}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          name: cleanName,
          type: cleanType,
          universityBoard: (defaultBoard || "").trim(),
          studentCount: 0,
          students: [],
        });
      }
      return courseMap.get(key);
    };

    // 1. Pre-populate with saved master courses and preserve server/API enrolled students
    (savedCourses || []).forEach((c) => {
      if (c.name?.trim()) {
        const entry = getOrInitCourse(c.name, c.type, c.universityBoard);
        if (!entry.universityBoard && c.universityBoard) {
          entry.universityBoard = c.universityBoard;
        }
        if (Array.isArray(c.students) && c.students.length > 0 && entry.students.length === 0) {
          entry.students = c.students.map((st, sIdx) => ({
            ...st,
            classId: st.classId ? String(st.classId) : "",
            batchId: st.batchId ? String(st.batchId) : "",
            year: st.year && st.year !== "—" ? String(st.year).trim() : "1",
            status: st.status && st.status !== "—" ? st.status : "Ongoing",
            universityBoard: st.universityBoard || entry.universityBoard || "—",
            index: st.index !== undefined ? st.index : sIdx,
            type: st.type || entry.type,
          }));
          entry.studentCount = c.studentCount || entry.students.length;
        }
      }
    });

    // 2. Populate or enrich from student records if available
    (students || []).forEach((student) => {
      const studentId = student._id;
      const studentName = student.name || "—";

      // Robustly extract class and batch info regardless of populated object or ID string
      const rawClassObj =
        student.studentSpecificField?.classId ||
        student.classData ||
        student.classId;
      const rawBatchObj =
        student.studentSpecificField?.batchId ||
        student.batchData ||
        student.batchId;

      const rawClassId =
        rawClassObj && typeof rawClassObj === "object"
          ? rawClassObj._id
          : rawClassObj;
      const rawBatchId =
        rawBatchObj && typeof rawBatchObj === "object"
          ? rawBatchObj._id
          : rawBatchObj;

      const className =
        student.className ||
        (rawClassObj && typeof rawClassObj === "object"
          ? rawClassObj.name
          : null) ||
        (rawClassId ? classMap.get(String(rawClassId)) : null) ||
        "—";

      const batchName =
        student.batchName ||
        (rawBatchObj && typeof rawBatchObj === "object"
          ? rawBatchObj.name
          : null) ||
        (rawBatchId ? batchMap.get(String(rawBatchId)) : null) ||
        "—";

      // Islamic courses
      const islamicList =
        student.studentSpecificField?.islamicCourses ||
        student.islamicCourses ||
        [];
      islamicList.forEach((c, idx) => {
        if (!c.courseName?.trim()) return;
        const entry = getOrInitCourse(c.courseName, "Islamic", c.universityBoard);
        if (!entry.universityBoard && c.universityBoard) {
          entry.universityBoard = c.universityBoard;
        }
        const existingIdx = entry.students.findIndex(
          (s) => String(s.studentId) === String(studentId)
        );
        const studentRecord = {
          studentId,
          studentName,
          classId: String(rawClassId || ""),
          batchId: String(rawBatchId || ""),
          className,
          batchName,
          year: c.year ? String(c.year).trim() : "1",
          status: c.status || "Ongoing",
          universityBoard: c.universityBoard || entry.universityBoard || "—",
          index: idx,
          type: "Islamic",
        };
        if (existingIdx !== -1) {
          entry.students[existingIdx] = studentRecord;
        } else {
          entry.studentCount += 1;
          entry.students.push(studentRecord);
        }
      });

      // Academic courses
      const academicList =
        student.studentSpecificField?.academicCourses ||
        student.academicCourses ||
        [];
      academicList.forEach((c, idx) => {
        if (!c.courseName?.trim()) return;
        const entry = getOrInitCourse(c.courseName, "Academic", c.universityBoard);
        if (!entry.universityBoard && c.universityBoard) {
          entry.universityBoard = c.universityBoard;
        }
        const existingIdx = entry.students.findIndex(
          (s) => String(s.studentId) === String(studentId)
        );
        const studentRecord = {
          studentId,
          studentName,
          classId: String(rawClassId || ""),
          batchId: String(rawBatchId || ""),
          className,
          batchName,
          year: c.year ? String(c.year).trim() : "1",
          status: c.status || "Ongoing",
          universityBoard: c.universityBoard || entry.universityBoard || "—",
          index: idx,
          type: "Academic",
        };
        if (existingIdx !== -1) {
          entry.students[existingIdx] = studentRecord;
        } else {
          entry.studentCount += 1;
          entry.students.push(studentRecord);
        }
      });
    });

    return Array.from(courseMap.values()).sort((a, b) => {
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [students, savedCourses, classMap, batchMap]);

  // Keep selectedCourse in sync with fresh students state
  useEffect(() => {
    if (selectedCourse) {
      const updated = aggregatedCourses.find(
        (c) =>
          c.type === selectedCourse.type &&
          c.name.toLowerCase() === selectedCourse.name.toLowerCase()
      );
      if (updated && updated !== selectedCourse) setSelectedCourse(updated);
    }
  }, [aggregatedCourses, selectedCourse]);

  // ── Filtered Main Courses Table ──────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    return aggregatedCourses.filter((course) => {
      if (filterType !== "all" && course.type !== filterType) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = course.name?.toLowerCase().includes(term);
        const matchBoard = course.universityBoard?.toLowerCase().includes(term);
        if (!matchName && !matchBoard) return false;
      }
      return true;
    });
  }, [aggregatedCourses, filterType, searchTerm]);

  // ── Enrolled Years for Selected Course ───────────────────────────────────
  const courseYears = useMemo(() => {
    if (!selectedCourse?.students || selectedCourse.students.length === 0) return [];
    const map = new Map();
    selectedCourse.students.forEach((st) => {
      let yr = st.year ? String(st.year).trim() : "1";
      if (!yr || yr === "—") yr = "1";
      if (!map.has(yr)) {
        map.set(yr, {
          year: yr,
          students: [],
          ongoingCount: 0,
          completedCount: 0,
          pendingCount: 0,
        });
      }
      const item = map.get(yr);
      item.students.push(st);
      if (st.status === "Completed") item.completedCount += 1;
      else if (st.status === "Pending") item.pendingCount += 1;
      else item.ongoingCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.year, 10);
      const numB = parseInt(b.year, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.year.localeCompare(b.year, undefined, { numeric: true });
    });
  }, [selectedCourse]);

  // ── Filtered Students inside Selected Course Popup ───────────────────────
  const modalFilteredStudents = useMemo(() => {
    if (!selectedCourse?.students) return [];
    let list = selectedCourse.students;
    if (selectedYear && selectedYear !== "all") {
      list = list.filter(
        (s) => String(s.year || "1").trim() === String(selectedYear).trim()
      );
    }
    if (!modalSearchTerm.trim()) return list;
    const term = modalSearchTerm.toLowerCase();
    return list.filter(
      (s) =>
        s.studentName?.toLowerCase().includes(term) ||
        s.studentId?.toLowerCase().includes(term) ||
        s.className?.toLowerCase().includes(term) ||
        s.batchName?.toLowerCase().includes(term) ||
        s.year?.toLowerCase().includes(term) ||
        s.status?.toLowerCase().includes(term)
    );
  }, [selectedCourse, selectedYear, modalSearchTerm]);

  // ── Edit Course Actions for a Student ────────────────────────────────────
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditFormData({
      courseName: selectedCourse ? selectedCourse.name : item.courseName,
      universityBoard: item.universityBoard || "",
      year: item.year || "1",
      status: item.status || "Ongoing",
      type: item.type,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const student = students.find((s) => s._id === editingItem.studentId);
      if (!student) throw new Error("Student not found");

      const currentIslamic = [
        ...(student.studentSpecificField?.islamicCourses || []),
      ];
      const currentAcademic = [
        ...(student.studentSpecificField?.academicCourses || []),
      ];

      const updatedCourse = {
        courseName: (editFormData.courseName || editingItem.courseName).trim(),
        universityBoard: (editFormData.universityBoard || "").trim(),
        year: editFormData.year,
        status: editFormData.status,
      };

      if (editingItem.type === "Islamic") {
        currentIslamic[editingItem.index] = updatedCourse;
      } else {
        currentAcademic[editingItem.index] = updatedCourse;
      }

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          ids: [editingItem.studentId],
          islamicCourses: currentIslamic,
          academicCourses: currentAcademic,
          courseAction: "replace",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update course");
      }

      setStudents((prev) =>
        prev.map((s) =>
          s._id === editingItem.studentId
            ? {
                ...s,
                studentSpecificField: {
                  ...s.studentSpecificField,
                  islamicCourses: currentIslamic,
                  academicCourses: currentAcademic,
                },
              }
            : s
        )
      );

      toast.success("Student course updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Error updating course:", err);
      toast.error(err.message || "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  // ── Remove Course from a Student ─────────────────────────────────────────
  const handleOpenDelete = (item) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setSaving(true);
    try {
      const student = students.find((s) => s._id === deletingItem.studentId);
      if (!student) throw new Error("Student not found");

      const currentIslamic = [
        ...(student.studentSpecificField?.islamicCourses || []),
      ];
      const currentAcademic = [
        ...(student.studentSpecificField?.academicCourses || []),
      ];

      if (deletingItem.type === "Islamic") {
        currentIslamic.splice(deletingItem.index, 1);
      } else {
        currentAcademic.splice(deletingItem.index, 1);
      }

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          ids: [deletingItem.studentId],
          islamicCourses: currentIslamic,
          academicCourses: currentAcademic,
          courseAction: "replace",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to remove course");
      }

      setStudents((prev) =>
        prev.map((s) =>
          s._id === deletingItem.studentId
            ? {
                ...s,
                studentSpecificField: {
                  ...s.studentSpecificField,
                  islamicCourses: currentIslamic,
                  academicCourses: currentAcademic,
                },
              }
            : s
        )
      );

      toast.success(
        `Removed "${selectedCourse?.name || deletingItem.courseName}" for ${
          deletingItem.studentName
        }`
      );
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error(err.message || "Failed to remove course");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Master Course from table ──────────────────────────────────────
  const handleOpenDeleteMaster = (course) => {
    setDeletingMasterCourse(course);
    setIsDeleteMasterOpen(true);
  };

  const handleConfirmDeleteMaster = async () => {
    if (!deletingMasterCourse) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/courses?courseName=${encodeURIComponent(deletingMasterCourse.name)}`,
        {
          method: "DELETE",
          headers: apiKey ? { "x-api-key": apiKey } : {},
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete course");
      }

      // Remove from savedCourses
      setSavedCourses((prev) =>
        prev.filter(
          (c) =>
            c.name.toLowerCase() !== deletingMasterCourse.name.toLowerCase()
        )
      );

      // Remove from loaded students
      const cleanName = deletingMasterCourse.name.toLowerCase();
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          studentSpecificField: {
            ...s.studentSpecificField,
            islamicCourses: (
              s.studentSpecificField?.islamicCourses || []
            ).filter((c) => c.courseName?.trim().toLowerCase() !== cleanName),
            academicCourses: (
              s.studentSpecificField?.academicCourses || []
            ).filter((c) => c.courseName?.trim().toLowerCase() !== cleanName),
          },
        }))
      );

      toast.success(`Course "${deletingMasterCourse.name}" deleted successfully`);
      setIsDeleteMasterOpen(false);
      setDeletingMasterCourse(null);
    } catch (err) {
      console.error("Error deleting master course:", err);
      toast.error(err.message || "Failed to delete course");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Master Course Actions ───────────────────────────────────────────
  const handleOpenEditMaster = (course) => {
    setEditingMasterCourse(course);
    setEditMasterFormData({
      name: course.name || "",
      type: course.type || "Academic",
      universityBoard: course.universityBoard || "",
    });
    setIsEditMasterOpen(true);
  };

  const handleSaveEditMaster = async () => {
    if (!editingMasterCourse) return;
    if (!editMasterFormData.name?.trim()) {
      toast.error("Course name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/courses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          action: "editCourse",
          oldName: editingMasterCourse.name,
          oldType: editingMasterCourse.type,
          name: editMasterFormData.name.trim(),
          type: editMasterFormData.type,
          universityBoard: editMasterFormData.universityBoard.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update course");
      }

      const cleanOldName = editingMasterCourse.name.toLowerCase();
      const cleanNewName = editMasterFormData.name.trim();
      const newType = editMasterFormData.type;
      const newBoard = editMasterFormData.universityBoard.trim();

      // 1. Update savedCourses
      setSavedCourses((prev) =>
        prev.map((c) =>
          c.name.toLowerCase() === cleanOldName
            ? { ...c, name: cleanNewName, type: newType, universityBoard: newBoard }
            : c
        )
      );

      // 2. Update students state
      setStudents((prev) =>
        prev.map((s) => {
          const islamicList = [
            ...(s.studentSpecificField?.islamicCourses || []),
          ];
          const academicList = [
            ...(s.studentSpecificField?.academicCourses || []),
          ];

          let changed = false;

          if (editingMasterCourse.type === "Islamic" && newType === "Academic") {
            const matching = islamicList.filter(
              (c) => c.courseName?.trim().toLowerCase() === cleanOldName
            );
            if (matching.length > 0) {
              changed = true;
              const remaining = islamicList.filter(
                (c) => c.courseName?.trim().toLowerCase() !== cleanOldName
              );
              matching.forEach((c) => {
                academicList.push({
                  ...c,
                  courseName: cleanNewName,
                  universityBoard: newBoard || c.universityBoard,
                });
              });
              return {
                ...s,
                studentSpecificField: {
                  ...s.studentSpecificField,
                  islamicCourses: remaining,
                  academicCourses: academicList,
                },
              };
            }
          } else if (
            editingMasterCourse.type === "Academic" &&
            newType === "Islamic"
          ) {
            const matching = academicList.filter(
              (c) => c.courseName?.trim().toLowerCase() === cleanOldName
            );
            if (matching.length > 0) {
              changed = true;
              const remaining = academicList.filter(
                (c) => c.courseName?.trim().toLowerCase() !== cleanOldName
              );
              matching.forEach((c) => {
                islamicList.push({
                  ...c,
                  courseName: cleanNewName,
                  universityBoard: newBoard || c.universityBoard,
                });
              });
              return {
                ...s,
                studentSpecificField: {
                  ...s.studentSpecificField,
                  islamicCourses: islamicList,
                  academicCourses: remaining,
                },
              };
            }
          } else {
            const updateArray = (arr) =>
              arr.map((c) => {
                if (c.courseName?.trim().toLowerCase() === cleanOldName) {
                  changed = true;
                  return {
                    ...c,
                    courseName: cleanNewName,
                    universityBoard: newBoard || c.universityBoard,
                  };
                }
                return c;
              });

            const newIslamic = updateArray(islamicList);
            const newAcademic = updateArray(academicList);

            if (changed) {
              return {
                ...s,
                studentSpecificField: {
                  ...s.studentSpecificField,
                  islamicCourses: newIslamic,
                  academicCourses: newAcademic,
                },
              };
            }
          }
          return s;
        })
      );

      // If selectedCourse was this course, update it too
      if (
        selectedCourse &&
        selectedCourse.name.toLowerCase() === cleanOldName
      ) {
        setSelectedCourse((prev) =>
          prev
            ? {
                ...prev,
                name: cleanNewName,
                type: newType,
                universityBoard: newBoard,
              }
            : null
        );
      }

      toast.success(`Course "${cleanNewName}" updated successfully`);
      setIsEditMasterOpen(false);
      setEditingMasterCourse(null);
    } catch (err) {
      console.error("Error updating master course:", err);
      toast.error(err.message || "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit / Delete Year Actions ───────────────────────────────────────────
  const handleOpenEditYear = (yr) => {
    setEditingYearData(yr);
    setNewYearValue(yr.year);
    setIsEditYearOpen(true);
  };

  const handleSaveEditYear = async () => {
    if (!editingYearData || !selectedCourse) return;
    if (!newYearValue || !newYearValue.trim()) {
      toast.error("Please select or enter a valid year");
      return;
    }
    const oldYear = String(editingYearData.year).trim();
    const newYear = String(newYearValue).trim();
    if (oldYear === newYear) {
      setIsEditYearOpen(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/courses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          action: "updateYear",
          courseName: selectedCourse.name,
          type: selectedCourse.type,
          oldYear,
          newYear,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update year");
      }

      // Update students state
      const cleanCourseName = selectedCourse.name.toLowerCase();
      setStudents((prev) =>
        prev.map((s) => {
          const updateYearInArr = (arr) =>
            (arr || []).map((c) => {
              if (
                c.courseName?.trim().toLowerCase() === cleanCourseName &&
                String(c.year || "1").trim() === oldYear
              ) {
                return { ...c, year: newYear };
              }
              return c;
            });

          return {
            ...s,
            studentSpecificField: {
              ...s.studentSpecificField,
              islamicCourses: updateYearInArr(
                s.studentSpecificField?.islamicCourses
              ),
              academicCourses: updateYearInArr(
                s.studentSpecificField?.academicCourses
              ),
            },
          };
        })
      );

      toast.success(`Year ${oldYear} updated to Year ${newYear}`);
      setIsEditYearOpen(false);
      setEditingYearData(null);
    } catch (err) {
      console.error("Error updating year:", err);
      toast.error(err.message || "Failed to update year");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteYear = (yr) => {
    setDeletingYearData(yr);
    setIsDeleteYearOpen(true);
  };

  const handleConfirmDeleteYear = async () => {
    if (!deletingYearData || !selectedCourse) return;
    setSaving(true);
    try {
      const targetYear = String(deletingYearData.year).trim();
      const res = await fetch("/api/courses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          action: "deleteYear",
          courseName: selectedCourse.name,
          type: selectedCourse.type,
          year: targetYear,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete year");
      }

      const cleanCourseName = selectedCourse.name.toLowerCase();
      setStudents((prev) =>
        prev.map((s) => {
          const filterArr = (arr) =>
            (arr || []).filter(
              (c) =>
                !(
                  c.courseName?.trim().toLowerCase() === cleanCourseName &&
                  String(c.year || "1").trim() === targetYear
                )
            );

          return {
            ...s,
            studentSpecificField: {
              ...s.studentSpecificField,
              islamicCourses: filterArr(s.studentSpecificField?.islamicCourses),
              academicCourses: filterArr(s.studentSpecificField?.academicCourses),
            },
          };
        })
      );

      toast.success(
        `Year ${targetYear} removed from "${selectedCourse.name}"`
      );
      setIsDeleteYearOpen(false);
      setDeletingYearData(null);
    } catch (err) {
      console.error("Error deleting year:", err);
      toast.error(err.message || "Failed to delete year");
    } finally {
      setSaving(false);
    }
  };

  // ── Add Course Popup Actions ─────────────────────────────────────────────
  const popupStudentOptions = useMemo(
    () =>
      (popupStudents || []).map((s) => {
        const idDisplay =
          s.admissionNumber ||
          s.studentSpecificField?.admissionNumber ||
          s._id;
        return {
          value: s._id,
          label: s.name ? `${s.name} (${idDisplay})` : idDisplay,
        };
      }),
    [popupStudents]
  );

  const fetchPopupStudents = useCallback(
    async (batchId, classId) => {
      if (!batchId && !classId) {
        setPopupStudents([]);
        setPopupSelectedStudentIds([]);
        return;
      }
      setLoadingPopupStudents(true);
      try {
        const params = new URLSearchParams({
          roles: "Student",
          status: "Active",
          limit: "1000",
        });
        if (batchId && batchId !== "all") {
          params.append("batchId", batchId);
        }
        if (classId && classId !== "all") {
          params.append("classId", classId);
        }
        params.append(
          "projection",
          "name,_id,admissionNumber,studentSpecificField.admissionNumber,studentSpecificField.classId,studentSpecificField.batchId,studentSpecificField.status"
        );

        const res = await fetch(`/api/users?${params}`, {
          headers: apiKey ? { "x-api-key": apiKey } : {},
        });
        const data = await res.json();
        const list = data.users || data || [];
        const validList = (Array.isArray(list) ? list : []).filter((s) => {
          const st =
            s.studentSpecificField?.status || s.studentStatus || s.status || "Active";
          return st.toLowerCase() === "active";
        });
        setPopupStudents(validList);
      } catch (err) {
        console.error("Failed to load popup students:", err);
        toast.error("Failed to load active students for selected batch/class");
      } finally {
        setLoadingPopupStudents(false);
      }
    },
    [apiKey]
  );

  const handlePopupCourseNameChange = (name) => {
    setPopupCourseName(name);
    const clean = name?.trim();
    if (!clean) return;

    const matched = savedCourses.find(
      (c) => c.name?.toLowerCase() === clean.toLowerCase()
    );
    if (matched && matched.universityBoard) {
      setPopupUniversityBoard(matched.universityBoard);
    }
  };

  const handleOpenAddPopup = () => {
    setPopupCourseType("Islamic");
    setPopupCourseName("");
    setPopupUniversityBoard("");
    setPopupYear("1");
    setPopupStatus("Ongoing");
    setPopupBatchId("");
    setPopupClassId("");
    setPopupSelectedStudentIds([]);
    setPopupStudents([]);
    setIsAddCoursePopupOpen(true);
  };

  const handleSaveNewCoursePopup = async () => {
    if (!popupCourseName?.trim()) {
      toast.error("Please enter a course name");
      return;
    }
    if (!popupYear) {
      toast.error("Please select a year");
      return;
    }
    if (popupSelectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setIsSubmittingPopup(true);
    const newCourse = {
      courseName: popupCourseName.trim(),
      universityBoard: popupUniversityBoard.trim(),
      year: popupYear,
      status: popupStatus || "Ongoing",
    };
    const isIslamic = popupCourseType === "Islamic";

    try {
      const res = await fetch(`/api/users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          ids: popupSelectedStudentIds,
          islamicCourses: isIslamic ? [newCourse] : [],
          academicCourses: !isIslamic ? [newCourse] : [],
          courseAction: "append",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add course");
      }

      // Auto-save master course to Course collection
      fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          name: newCourse.courseName,
          type: popupCourseType,
          universityBoard: newCourse.universityBoard,
        }),
      }).catch((err) =>
        console.error("Error auto-saving course to master collection:", err)
      );

      // Update local master courses state
      setSavedCourses((prev) => {
        if (
          prev.some(
            (c) =>
              c.name?.toLowerCase() === newCourse.courseName.toLowerCase()
          )
        )
          return prev;
        return [
          ...prev,
          {
            name: newCourse.courseName,
            type: popupCourseType,
            universityBoard: newCourse.universityBoard,
          },
        ];
      });

      // Update local students list
      setStudents((prev) =>
        prev.map((s) => {
          if (!popupSelectedStudentIds.includes(s._id)) return s;
          const currentIslamic = [
            ...(s.studentSpecificField?.islamicCourses || []),
          ];
          const currentAcademic = [
            ...(s.studentSpecificField?.academicCourses || []),
          ];

          if (isIslamic) {
            const idx = currentIslamic.findIndex(
              (c) =>
                c.courseName?.trim().toLowerCase() ===
                newCourse.courseName.toLowerCase()
            );
            if (idx !== -1)
              currentIslamic[idx] = { ...currentIslamic[idx], ...newCourse };
            else currentIslamic.push(newCourse);
          } else {
            const idx = currentAcademic.findIndex(
              (c) =>
                c.courseName?.trim().toLowerCase() ===
                newCourse.courseName.toLowerCase()
            );
            if (idx !== -1)
              currentAcademic[idx] = { ...currentAcademic[idx], ...newCourse };
            else currentAcademic.push(newCourse);
          }

          return {
            ...s,
            studentSpecificField: {
              ...s.studentSpecificField,
              islamicCourses: currentIslamic,
              academicCourses: currentAcademic,
            },
          };
        })
      );

      toast.success(
        `Course "${newCourse.courseName}" added for ${
          popupSelectedStudentIds.length
        } student${popupSelectedStudentIds.length > 1 ? "s" : ""}`
      );
      setIsAddCoursePopupOpen(false);
    } catch (err) {
      console.error("Error saving new course from popup:", err);
      toast.error(err.message || "Failed to add course");
    } finally {
      setIsSubmittingPopup(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <Header
        title="COURSES"
        subTitle="Manage Islamic and Academic course details"
        rightAction={
          <Button
            onClick={handleOpenAddPopup}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 w-9 sm:w-auto sm:px-3 p-0 gap-1.5 flex items-center justify-center shrink-0 shadow-sm"
            title="Add Course"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline text-sm font-medium">Add Course</span>
          </Button>
        }
      />

      {/* ── Main Courses Table ─────────────────────────────────────────── */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-4 border-b bg-card">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search course name or university..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  filterType === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({aggregatedCourses.length})
              </button>
              <button
                onClick={() => setFilterType("Islamic")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                  filterType === "Islamic"
                    ? "bg-background text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookMarked className="h-3 w-3" />
                Islamic (
                {aggregatedCourses.filter((c) => c.type === "Islamic").length}
                )
              </button>
              <button
                onClick={() => setFilterType("Academic")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                  filterType === "Academic"
                    ? "bg-background text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-3 w-3" />
                Academic (
                {aggregatedCourses.filter((c) => c.type === "Academic").length}
                )
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingStudents ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm">Loading courses...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No courses found
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchTerm || filterType !== "all"
                  ? "No courses match your filter or search."
                  : "No courses added yet. Click '+ Add Course' in the top right to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-14 sm:w-16 text-center text-xs font-semibold">
                      Sl No
                    </TableHead>
                    <TableHead className="text-xs font-semibold min-w-[200px]">
                      Course Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden sm:table-cell min-w-[120px]">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell min-w-[180px]">
                      University / Board
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center w-36">
                      Total Students
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right w-24 sm:w-28">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course, idx) => (
                    <TableRow
                      key={`${course.type}-${course.name}`}
                      className="hover:bg-muted/50 transition-colors cursor-pointer group active:bg-muted/70"
                      onClick={() => {
                        setSelectedCourse(course);
                        setSelectedYear(null);
                        setModalSearchTerm("");
                      }}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground font-medium py-3.5 cursor-pointer">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="py-3.5 cursor-pointer">
                        <div className="flex flex-col gap-1 items-start">
                          {/* Mobile type badge */}
                          <div className="sm:hidden">
                            {course.type === "Islamic" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <BookMarked className="h-2.5 w-2.5" />
                                Islamic
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                <GraduationCap className="h-2.5 w-2.5" />
                                Academic
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                            {course.name}
                          </span>
                          {/* Mobile university */}
                          <span className="md:hidden text-xs text-muted-foreground">
                            {course.universityBoard || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-3.5 cursor-pointer">
                        {course.type === "Islamic" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <BookMarked className="h-3 w-3" />
                            Islamic
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            <GraduationCap className="h-3 w-3" />
                            Academic
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm py-3.5 text-muted-foreground cursor-pointer">
                        {course.universityBoard || "—"}
                      </TableCell>
                      <TableCell className="text-center py-3.5 cursor-pointer">
                        <Badge
                          variant="outline"
                          className={`gap-1.5 px-2.5 py-0.5 text-xs font-semibold ${
                            course.studentCount > 0
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Users className="h-3 w-3" />
                          <span>{course.studentCount}</span>
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="sm:hidden h-8 px-2 text-xs text-blue-600 hover:text-blue-700 gap-0.5 font-medium"
                            onClick={() => {
                              setSelectedCourse(course);
                              setSelectedYear(null);
                              setModalSearchTerm("");
                            }}
                          >
                            <span>Years</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            onClick={() => handleOpenEditMaster(course)}
                            title="Edit Course Details"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleOpenDeleteMaster(course)}
                            title="Delete Course"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Students in Course Modal (Years Table & Students Table Drilldown) ── */}
      <Dialog
        open={!!selectedCourse}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCourse(null);
            setSelectedYear(null);
            setModalSearchTerm("");
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[85vh] [&>button.absolute]:hidden overflow-y-auto overflow-x-hidden p-0 gap-0 rounded-2xl min-w-0">
          {!selectedYear ? (
            /* ── VIEW 1: Course Name with Years Table ───────────────────── */
            <>
              <DialogHeader className="flex flex-col mx-0 p-0 border-b space-y-0 bg-muted/80 dark:bg-muted/30 sticky top-0 z-20 backdrop-blur-md">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4">
                  {/* Left: Back to Courses button */}
                  <div className="flex items-center justify-start shrink-0 min-w-[70px] sm:min-w-[130px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCourse(null);
                        setSelectedYear(null);
                        setModalSearchTerm("");
                      }}
                      className="h-8 px-2 sm:px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 border hover:bg-muted shrink-0"
                      title="Back to Courses"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Back to Courses</span>
                      <span className="sm:hidden">Back</span>
                    </Button>
                  </div>

                  {/* Center: Heading in centre alignment */}
                  <div className="flex flex-col items-center justify-center text-center space-y-1 min-w-0">
                    <div className="flex items-center justify-center">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium gap-1 px-2.5 py-0.5 ${
                          selectedCourse?.type === "Islamic"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {selectedCourse?.type === "Islamic" ? (
                          <BookMarked className="h-2.5 w-2.5" />
                        ) : (
                          <GraduationCap className="h-2.5 w-2.5" />
                        )}
                        <span>{selectedCourse?.type}</span>
                      </Badge>
                    </div>

                    <DialogTitle className="text-base sm:text-lg font-bold m-0 leading-tight text-center">
                      {selectedCourse?.name}{" "}
                      <span className="font-semibold text-muted-foreground text-xs sm:text-sm">
                        ({selectedCourse?.students?.length || 0})
                      </span>
                    </DialogTitle>

                    {selectedCourse?.universityBoard && (
                      <p className="m-0 text-xs text-muted-foreground font-normal text-center">
                        {selectedCourse.universityBoard}
                      </p>
                    )}
                    <DialogDescription className="sr-only">
                      Select a year to view enrolled students in this course
                    </DialogDescription>
                  </div>

                  {/* Right: Close button */}
                  <div className="flex items-center justify-end shrink-0 min-w-[70px] sm:min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourse(null);
                        setSelectedYear(null);
                        setModalSearchTerm("");
                      }}
                      className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-3 sm:p-4 pt-2 sm:pt-3 min-w-0 w-full">
                {courseYears.length === 0 ? (
                  <div className="text-center py-10 px-4 text-muted-foreground text-xs space-y-3">
                    <p>No students enrolled in this course yet.</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        handleOpenAddPopup();
                        setPopupCourseName(selectedCourse?.name || "");
                        setPopupCourseType(selectedCourse?.type || "Islamic");
                        setPopupUniversityBoard(selectedCourse?.universityBoard || "");
                      }}
                      className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Enroll Students in this Course</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Mobile View: Touch-Friendly Responsive Year Cards */}
                    <div className="sm:hidden space-y-2.5">
                      {courseYears.map((yr) => (
                        <div
                          key={yr.year}
                          onClick={() => {
                            setSelectedYear(yr.year);
                            setModalSearchTerm("");
                          }}
                          className="p-3.5 rounded-xl border bg-card hover:bg-muted/50 active:bg-muted/80 transition-all cursor-pointer shadow-sm flex items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                                Year {yr.year}
                              </span>
                              <Badge
                                variant="outline"
                                className="gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                              >
                                <Users className="h-3 w-3" />
                                <span>{yr.students.length}</span>
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {yr.ongoingCount > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                  {yr.ongoingCount} Ongoing
                                </span>
                              )}
                              {yr.completedCount > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  {yr.completedCount} Completed
                                </span>
                              )}
                              {yr.pendingCount > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  {yr.pendingCount} Pending
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              onClick={() => handleOpenEditYear(yr)}
                              title={`Edit Year ${yr.year}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleOpenDeleteYear(yr)}
                              title={`Delete Year ${yr.year}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-0.5" />
                          </div>
                        </div>
                      ))}

                      {courseYears.length > 1 && (
                        <div
                          onClick={() => {
                            setSelectedYear("all");
                            setModalSearchTerm("");
                          }}
                          className="p-3.5 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer shadow-sm flex items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground group-hover:text-purple-600 transition-colors">
                                All Years
                              </span>
                              <Badge
                                variant="outline"
                                className="gap-1 px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              >
                                <Users className="h-3 w-3" />
                                <span>{selectedCourse?.students?.length || 0}</span>
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground m-0">
                              All enrolled students across {courseYears.length} years
                            </p>
                          </div>
                          <div className="flex items-center text-purple-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                            <span className="text-xs font-medium mr-1">View All</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Desktop View: Full Table */}
                    <div className="hidden sm:block border rounded-xl overflow-hidden bg-card shadow-sm">
                      <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-14 sm:w-16 text-center text-xs font-semibold">
                              Sl No
                            </TableHead>
                            <TableHead className="text-xs font-semibold min-w-[120px]">
                              Year
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-center w-36">
                              Total Students
                            </TableHead>
                            <TableHead className="text-xs font-semibold min-w-[200px]">
                              Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-right w-24 sm:w-28">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {courseYears.map((yr, idx) => (
                            <TableRow
                              key={yr.year}
                              className="hover:bg-muted/50 transition-colors cursor-pointer group"
                              onClick={() => {
                                setSelectedYear(yr.year);
                                setModalSearchTerm("");
                              }}
                            >
                              <TableCell className="text-center text-xs text-muted-foreground font-medium py-3.5">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="py-3.5">
                                <span className="font-semibold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                                  Year {yr.year}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-3.5">
                                <Badge
                                  variant="outline"
                                  className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                >
                                  <Users className="h-3 w-3" />
                                  <span>{yr.students.length}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {yr.ongoingCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                      {yr.ongoingCount} Ongoing
                                    </span>
                                  )}
                                  {yr.completedCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                      {yr.completedCount} Completed
                                    </span>
                                  )}
                                  {yr.pendingCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                      {yr.pendingCount} Pending
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell
                                className="py-3.5 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                    onClick={() => handleOpenEditYear(yr)}
                                    title={`Edit Year ${yr.year}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleOpenDeleteYear(yr)}
                                    title={`Delete Year ${yr.year}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}

                          {courseYears.length > 1 && (
                            <TableRow
                              className="hover:bg-muted/50 transition-colors cursor-pointer group bg-muted/20 border-t-2"
                              onClick={() => {
                                setSelectedYear("all");
                                setModalSearchTerm("");
                              }}
                            >
                              <TableCell className="text-center text-xs text-muted-foreground font-medium py-3.5">
                                ★
                              </TableCell>
                              <TableCell className="py-3.5">
                                <span className="font-semibold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                                  All Years
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-3.5">
                                <Badge
                                  variant="outline"
                                  className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                >
                                  <Users className="h-3 w-3" />
                                  <span>{selectedCourse?.students?.length || 0}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3.5">
                                <span className="text-xs text-muted-foreground">
                                  All enrolled students across {courseYears.length} years
                                </span>
                              </TableCell>
                              <TableCell className="py-3.5 text-right">
                                <div className="flex items-center justify-end text-purple-600 pr-2">
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* ── VIEW 2: Students in Selected Year Table ─────────────────── */
            <>
              <DialogHeader className="flex flex-col mx-0 p-0 border-b space-y-0 bg-muted/80 dark:bg-muted/30 sticky top-0 z-20 backdrop-blur-md">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 px-4 sm:px-5 pt-3 sm:pt-4 pb-2">
                  {/* Left: Back to Years button */}
                  <div className="flex items-center justify-start shrink-0 min-w-[70px] sm:min-w-[130px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedYear(null);
                        setModalSearchTerm("");
                      }}
                      className="h-8 px-2 sm:px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 border hover:bg-muted shrink-0"
                      title="Back to Years"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Back to Years</span>
                      <span className="sm:hidden">Back</span>
                    </Button>
                  </div>

                  {/* Center: Heading in centre alignment */}
                  <div className="flex flex-col items-center justify-center text-center space-y-1 min-w-0">
                    <div className="flex items-center justify-center">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium gap-1 px-2.5 py-0.5 ${
                          selectedCourse?.type === "Islamic"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {selectedCourse?.type === "Islamic" ? (
                          <BookMarked className="h-2.5 w-2.5" />
                        ) : (
                          <GraduationCap className="h-2.5 w-2.5" />
                        )}
                        <span>{selectedCourse?.type}</span>
                      </Badge>
                    </div>

                    <DialogTitle className="text-base sm:text-lg font-bold m-0 leading-tight text-center">
                      {selectedCourse?.name}{" "}
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {selectedYear === "all" ? "(All Years)" : `- Year ${selectedYear}`}
                      </span>{" "}
                      <span className="font-semibold text-muted-foreground text-xs sm:text-sm">
                        ({modalFilteredStudents.length})
                      </span>
                    </DialogTitle>

                    {selectedCourse?.universityBoard && (
                      <p className="m-0 text-xs text-muted-foreground font-normal text-center">
                        {selectedCourse.universityBoard}
                      </p>
                    )}
                    <DialogDescription className="sr-only">
                      List of students enrolled in this year
                    </DialogDescription>
                  </div>

                  {/* Right: Close button */}
                  <div className="flex items-center justify-end shrink-0 min-w-[70px] sm:min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourse(null);
                        setSelectedYear(null);
                        setModalSearchTerm("");
                      }}
                      className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Search students in this year */}
                <div className="px-4 sm:px-5 pb-3 pt-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={
                        selectedYear === "all"
                          ? "Search all students in this course..."
                          : `Search students in Year ${selectedYear}...`
                      }
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background/80"
                    />
                  </div>
                </div>
              </DialogHeader>

              <div className="p-3 sm:p-4 pt-2 sm:pt-3 min-w-0 w-full">
                {modalFilteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    {modalSearchTerm
                      ? "No students match your search."
                      : selectedYear === "all"
                      ? "No students enrolled in this course yet."
                      : `No students enrolled in Year ${selectedYear}.`}
                  </div>
                ) : (
                  <>
                    {/* Mobile View: Student Cards */}
                    <div className="sm:hidden space-y-2.5">
                      {modalFilteredStudents.map((st, i) => (
                        <div
                          key={`${st.studentId}-${i}`}
                          className="p-3 rounded-xl border bg-card shadow-sm space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm text-foreground truncate">
                                {st.studentName}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                ID: {st.studentId}
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                                STATUS_COLORS[st.status] || ""
                              }`}
                            >
                              {st.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t text-xs">
                            <div className="flex flex-col text-[11px] min-w-0">
                              <span className="font-medium text-foreground truncate">{st.className || "—"}</span>
                              {st.batchName && st.batchName !== "—" && (
                                <span className="text-[10px] text-muted-foreground truncate">{st.batchName}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedYear === "all" && (
                                <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">Yr {st.year}</span>
                              )}
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenEdit(st)}
                                  title="Edit Student's Course"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleOpenDelete(st)}
                                  title="Remove Student from Course"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop View: Full Table */}
                    <div className="hidden sm:block border rounded-xl overflow-hidden bg-card shadow-sm">
                      <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-14 text-xs font-semibold text-center">
                              Sl No
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Student Name
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Class
                            </TableHead>
                            {selectedYear === "all" && (
                              <TableHead className="text-xs font-semibold text-center">
                                Year
                              </TableHead>
                            )}
                            <TableHead className="text-xs font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-right w-20">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {modalFilteredStudents.map((st, i) => (
                            <TableRow
                              key={`${st.studentId}-${i}`}
                              className="hover:bg-muted/30"
                            >
                              <TableCell className="text-xs text-center text-muted-foreground py-2.5">
                                {i + 1}
                              </TableCell>
                              <TableCell className="font-medium text-xs py-2.5">
                                <div className="font-semibold text-foreground">
                                  {st.studentName}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {st.studentId}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs py-2.5">
                                <div className="font-medium text-foreground">
                                  {st.className || "—"}
                                </div>
                                {st.batchName && st.batchName !== "—" && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {st.batchName}
                                  </div>
                                )}
                              </TableCell>
                              {selectedYear === "all" && (
                                <TableCell className="text-xs text-center py-2.5 font-semibold text-foreground">
                                  <span className="inline-block px-2 py-0.5 bg-muted rounded text-xs">
                                    {st.year}
                                  </span>
                                </TableCell>
                              )}
                              <TableCell className="text-xs py-2.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    STATUS_COLORS[st.status] || ""
                                  }`}
                                >
                                  {st.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-right py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleOpenEdit(st)}
                                    title="Edit Student's Course"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleOpenDelete(st)}
                                    title="Remove Student from Course"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Student Course Dialog ─────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl max-h-[85vh] overflow-y-auto flex flex-col [&>button.absolute]:hidden">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0">
              <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-lg font-bold m-0 text-foreground">
                Edit Course Details
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                {editingItem?.studentName} ({editingItem?.studentId})
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsEditDialogOpen(false)}
              className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <div className="p-5 space-y-4 flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Course Name</Label>
              <Input
                value={editFormData.courseName}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                University / Board Name
              </Label>
              <Input
                value={editFormData.universityBoard}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    universityBoard: e.target.value,
                  }))
                }
                placeholder="e.g. Samastha / Calicut University"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Year <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={editFormData.year}
                  onValueChange={(val) =>
                    setEditFormData((prev) => ({ ...prev, year: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val) =>
                    setEditFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-background/95 backdrop-blur-md flex items-center justify-end gap-2 sticky bottom-0 z-30 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={saving}
              className="h-9 px-5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Remove Student from Course Dialog ──────────────────────────── */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student from Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{selectedCourse?.name || deletingItem?.courseName}</strong>{" "}
              from student <strong>{deletingItem?.studentName}</strong> (
              {deletingItem?.studentId})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Master Course Confirmation ───────────────────────────── */}
      <AlertDialog
        open={isDeleteMasterOpen}
        onOpenChange={setIsDeleteMasterOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete course{" "}
              <strong>{deletingMasterCourse?.name}</strong> (
              {deletingMasterCourse?.type})? This will also remove it from all{" "}
              <strong>{deletingMasterCourse?.studentCount} enrolled students</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteMaster}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit Master Course Dialog ──────────────────────────────────── */}
      <Dialog open={isEditMasterOpen} onOpenChange={setIsEditMasterOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl max-h-[85vh] overflow-y-auto flex flex-col [&>button.absolute]:hidden">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0">
              <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-lg font-bold m-0 text-foreground">
                Edit Course
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                Update Course Name, Type, and University / Board
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsEditMasterOpen(false)}
              className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <div className="p-5 space-y-4 flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Course Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editMasterFormData.name}
                onChange={(e) =>
                  setEditMasterFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g. Thanawiyya / B.A English"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={editMasterFormData.type}
                onValueChange={(val) =>
                  setEditMasterFormData((prev) => ({ ...prev, type: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Islamic">Islamic</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                University / Board Name
              </Label>
              <Input
                value={editMasterFormData.universityBoard}
                onChange={(e) =>
                  setEditMasterFormData((prev) => ({
                    ...prev,
                    universityBoard: e.target.value,
                  }))
                }
                placeholder="e.g. Samastha / Calicut University"
              />
            </div>
          </div>

          <div className="p-4 border-t bg-background/95 backdrop-blur-md flex items-center justify-end gap-2 sticky bottom-0 z-30 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditMasterOpen(false)}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditMaster}
              disabled={saving}
              className="h-9 px-5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Course Year Dialog ────────────────────────────────────── */}
      <Dialog open={isEditYearOpen} onOpenChange={setIsEditYearOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 gap-0 rounded-2xl max-h-[85vh] overflow-y-auto flex flex-col [&>button.absolute]:hidden">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0">
              <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-lg font-bold m-0 text-foreground">
                Edit Course Year
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                {selectedCourse?.name}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsEditYearOpen(false)}
              className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <div className="p-5 space-y-4 flex-1">
            <p className="text-xs text-muted-foreground">
              Update year for all{" "}
              <strong>{editingYearData?.students?.length || 0} students</strong>{" "}
              currently enrolled in Year <strong>{editingYearData?.year}</strong>.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                New Year <span className="text-destructive">*</span>
              </Label>
              <Select value={newYearValue} onValueChange={setNewYearValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y}>
                      Year {y}
                    </SelectItem>
                  ))}
                  <SelectItem value="6">Year 6</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 border-t bg-background/95 backdrop-blur-md flex items-center justify-end gap-2 sticky bottom-0 z-30 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditYearOpen(false)}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditYear}
              disabled={saving}
              className="h-9 px-5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Update Year</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Course Year Confirmation ────────────────────────────── */}
      <AlertDialog
        open={isDeleteYearOpen}
        onOpenChange={setIsDeleteYearOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Year {deletingYearData?.year}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>Year {deletingYearData?.year}</strong> of{" "}
              <strong>{selectedCourse?.name}</strong>? This will remove this course enrollment from all{" "}
              <strong>{deletingYearData?.students?.length || 0} enrolled students</strong> in this year.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteYear}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add Course Popup (Top Right Button) ─────────────────────────── */}
      <Dialog open={isAddCoursePopupOpen} onOpenChange={setIsAddCoursePopupOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 gap-0 rounded-2xl max-h-[85vh] sm:max-h-[85vh] overflow-y-auto flex flex-col [&>button.absolute]:hidden">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0 text-foreground">
                Add Course
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground m-0">
                Add Islamic or Academic course details and assign to students
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsAddCoursePopupOpen(false)}
                className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 !shrink">
            {/* 1. Type Dropdown & Course Name Input (Side by Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="popupCourseType" className="text-xs font-semibold">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={popupCourseType}
                  onValueChange={setPopupCourseType}
                >
                  <SelectTrigger id="popupCourseType">
                    <SelectValue placeholder="Select course type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Islamic">Islamic</SelectItem>
                    <SelectItem value="Academic">Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="popupCourseName" className="text-xs font-semibold">
                  Course Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="popupCourseName"
                  list="popup-course-names-list"
                  placeholder="e.g. Thanawiyya / B.A English"
                  value={popupCourseName}
                  onChange={(e) => handlePopupCourseNameChange(e.target.value)}
                />
                <datalist id="popup-course-names-list">
                  {savedCourses
                    .filter(
                      (c) =>
                        !popupCourseType ||
                        c.type?.toLowerCase() === popupCourseType?.toLowerCase()
                    )
                    .map((c) => (
                      <option key={c._id || c.name} value={c.name} />
                    ))}
                </datalist>
              </div>
            </div>

            {/* 2. University / Board Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="popupUniversityBoard" className="text-xs font-semibold">
                University / Board Name
              </Label>
              <Input
                id="popupUniversityBoard"
                placeholder="e.g. Samastha / Calicut University"
                value={popupUniversityBoard}
                onChange={(e) => setPopupUniversityBoard(e.target.value)}
              />
            </div>

            {/* 3. Year Dropdown & Status (Side by Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="popupYear" className="text-xs font-semibold">
                  Year <span className="text-destructive">*</span>
                </Label>
                <Select value={popupYear} onValueChange={setPopupYear}>
                  <SelectTrigger id="popupYear">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="popupStatus" className="text-xs font-semibold">
                  Status
                </Label>
                <Select value={popupStatus} onValueChange={setPopupStatus}>
                  <SelectTrigger id="popupStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 4. Batch Dropdown & Class Dropdown (Side by Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="popupBatch" className="text-xs font-semibold">
                  Batch
                </Label>
                <Select
                  value={popupBatchId}
                  onValueChange={(val) => {
                    setPopupBatchId(val);
                    setPopupSelectedStudentIds([]);
                    fetchPopupStudents(val, popupClassId);
                  }}
                >
                  <SelectTrigger id="popupBatch">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">All Batches</SelectItem>
                    {(batches || []).map((b) => (
                      <SelectItem key={b._id} value={String(b._id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="popupClass" className="text-xs font-semibold">
                  Class
                </Label>
                <Select
                  value={popupClassId}
                  onValueChange={(val) => {
                    setPopupClassId(val);
                    setPopupSelectedStudentIds([]);
                    fetchPopupStudents(popupBatchId, val);
                  }}
                >
                  <SelectTrigger id="popupClass">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">All Classes</SelectItem>
                    {(classes || []).map((c) => (
                      <SelectItem key={c._id} value={String(c._id)}>
                        {c.name || c.shortname || c._id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 5. Students Dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="popupStudents" className="text-xs font-semibold">
                  Students <span className="text-destructive">*</span>
                  {popupSelectedStudentIds.length > 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({popupSelectedStudentIds.length} selected)
                    </span>
                  )}
                </Label>
                {popupStudents.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => {
                      if (
                        popupSelectedStudentIds.length === popupStudents.length
                      ) {
                        setPopupSelectedStudentIds([]);
                      } else {
                        setPopupSelectedStudentIds(
                          popupStudents.map((s) => s._id)
                        );
                      }
                    }}
                  >
                    {popupSelectedStudentIds.length === popupStudents.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>

              {loadingPopupStudents ? (
                <div className="flex items-center justify-center p-3 border rounded-md bg-muted/10 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading students...
                </div>
              ) : popupStudents.length === 0 ? (
                <div className="p-3 border rounded-md bg-muted/10 text-xs text-muted-foreground text-center">
                  {!popupBatchId && !popupClassId
                    ? "Please select a Batch or Class to load students"
                    : "No students found for the selected Batch / Class"}
                </div>
              ) : (
                <MultiSelect
                  options={popupStudentOptions}
                  value={popupSelectedStudentIds}
                  onValueChange={setPopupSelectedStudentIds}
                  placeholder="Select students..."
                  maxCount={2}
                />
              )}
            </div>
          </div>

          {/* Footer with Save button */}
          <div className="p-4 border-t bg-background/95 backdrop-blur-md flex items-center justify-end gap-2 sticky bottom-0 z-30 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCoursePopupOpen(false)}
              className="h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveNewCoursePopup}
              disabled={isSubmittingPopup}
              className="h-10 px-6 font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingPopup ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save</span>
                  <span className="hidden sm:inline">&nbsp;changes</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
