"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  BookOpen,
  GraduationCap,
  Plus,
  Trash2,
  Save,
  Loader2,
  Pencil,
  X,
  BookMarked,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import Header from "./Header";

const EMPTY_COURSE = {
  courseName: "",
  universityBoard: "",
  year: "",
  status: "",
};

const STATUS_OPTIONS = ["Completed", "Ongoing", "Pending"];

const STATUS_COLORS = {
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

export default function StudentCourses({ classes = [], batches = [], apiKey }) {
  // Multi-select filters: Batch first, then Class
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Options for MultiSelect
  const batchOptions = useMemo(
    () =>
      (batches || []).map((b) => ({
        value: String(b._id),
        label: b.name,
      })),
    [batches]
  );

  const classOptions = useMemo(
    () =>
      (classes || []).map((c) => ({
        value: String(c._id),
        label: c.name || c.shortname || c._id,
      })),
    [classes]
  );

  const classMap = useMemo(
    () => new Map((classes || []).map((c) => [String(c._id), c.name || c.shortname])),
    [classes]
  );

  // Data
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Multi-selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Single mode state
  const [islamicCourses, setIslamicCourses] = useState([]);
  const [academicCourses, setAcademicCourses] = useState([]);

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState("append"); // "append" | "replace"
  const [bulkIslamicCourses, setBulkIslamicCourses] = useState([]);
  const [bulkAcademicCourses, setBulkAcademicCourses] = useState([]);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Form dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState("single"); // "single" | "bulk"
  const [dialogType, setDialogType] = useState("islamic"); // "islamic" | "academic"
  const [editIndex, setEditIndex] = useState(null); // null = add new
  const [formData, setFormData] = useState(EMPTY_COURSE);

  // Delete dialog state
  const [deleteInfo, setDeleteInfo] = useState(null); // { type, index, context }
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Master saved courses for input + dropdown suggestions
  const [savedCourses, setSavedCourses] = useState([]);
  const [deletedCourseNames, setDeletedCourseNames] = useState(new Set());
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  const hasLoadedRef = useRef({});

  // Fetch saved master courses from backend
  useEffect(() => {
    fetch("/api/courses", {
      headers: apiKey ? { "x-api-key": apiKey } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.courses) {
          setSavedCourses(data.courses);
        }
      })
      .catch((err) => console.error("Error loading master courses:", err));
  }, [apiKey]);

  // Merge any distinct courses found on loaded students into savedCourses, excluding deleted ones
  useEffect(() => {
    if (!students.length) return;
    const existingNames = new Set(
      savedCourses.map((c) => c.name?.toLowerCase().trim())
    );
    const newFound = [];
    students.forEach((s) => {
      const ic =
        s.studentSpecificField?.islamicCourses || s.islamicCourses || [];
      ic.forEach((c) => {
        const clean = c.courseName?.trim();
        if (
          clean &&
          !existingNames.has(clean.toLowerCase()) &&
          !deletedCourseNames.has(clean.toLowerCase())
        ) {
          existingNames.add(clean.toLowerCase());
          newFound.push({
            name: clean,
            type: "Islamic",
            universityBoard: c.universityBoard || "",
          });
        }
      });
      const ac =
        s.studentSpecificField?.academicCourses || s.academicCourses || [];
      ac.forEach((c) => {
        const clean = c.courseName?.trim();
        if (
          clean &&
          !existingNames.has(clean.toLowerCase()) &&
          !deletedCourseNames.has(clean.toLowerCase())
        ) {
          existingNames.add(clean.toLowerCase());
          newFound.push({
            name: clean,
            type: "Academic",
            universityBoard: c.universityBoard || "",
          });
        }
      });
    });
    if (newFound.length > 0) {
      setSavedCourses((prev) => [...prev, ...newFound]);
    }
  }, [students, deletedCourseNames, savedCourses]);

  // Delete a saved course from dropdown & backend
  const handleDeleteSavedCourse = async (courseNameToRemove) => {
    if (!courseNameToRemove) return;
    const clean = courseNameToRemove.trim();

    // Optimistically remove from state
    setSavedCourses((prev) =>
      prev.filter((c) => c.name?.toLowerCase().trim() !== clean.toLowerCase())
    );
    setDeletedCourseNames((prev) => new Set([...prev, clean.toLowerCase()]));

    try {
      const res = await fetch(`/api/courses?name=${encodeURIComponent(clean)}`, {
        method: "DELETE",
        headers: apiKey ? { "x-api-key": apiKey } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete course");
      }

      toast.success(`Removed "${clean}" from dropdown`);
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error(err.message || "Could not delete course from database");
    }
  };

  // Compute course suggestions for current dialogType (Islamic vs Academic)
  const courseSuggestions = useMemo(() => {
    const list = savedCourses.filter((c) => {
      if (dialogType === "islamic")
        return c.type === "Islamic" || c.type === "Both";
      return c.type === "Academic" || c.type === "Both";
    });
    const displayList = list.length > 0 ? list : savedCourses;
    return [...displayList].sort((a, b) => a.name.localeCompare(b.name));
  }, [savedCourses, dialogType]);

  // ── Fetch students when class/batch changes ──────────────────────────────
  useEffect(() => {
    if (selectedClasses.length === 0 && selectedBatches.length === 0) {
      setStudents([]);
      setSelectedStudentIds([]);
      return;
    }

    const key = `${[...selectedClasses].sort().join(",")}|${[...selectedBatches].sort().join(",")}`;
    if (hasLoadedRef.current[key]) return;
    hasLoadedRef.current[key] = true;

    setLoadingStudents(true);
    setSelectedStudentIds([]);
    setStudents([]);

    const params = new URLSearchParams({ roles: "Student" });
    if (selectedClasses.length > 0) {
      params.append("classId", selectedClasses.join(","));
    }
    if (selectedBatches.length > 0) {
      params.append("batchId", selectedBatches.join(","));
    }
    params.append(
      "projection",
      "name,studentSpecificField.islamicCourses,studentSpecificField.academicCourses,studentSpecificField.classId,studentSpecificField.batchId"
    );

    fetch(`/api/users?${params}`, {
      headers: apiKey ? { "x-api-key": apiKey } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        const list = data.users || data || [];
        setStudents(Array.isArray(list) ? list : []);
      })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoadingStudents(false));
  }, [selectedClasses, selectedBatches, apiKey]);

  // Reset loader cache when filters change
  useEffect(() => {
    hasLoadedRef.current = {};
    setStudents([]);
    setSelectedStudentIds([]);
    setIslamicCourses([]);
    setAcademicCourses([]);
  }, [selectedClasses, selectedBatches]);

  // ── Filtered students based on search ────────────────────────────────────
  const filteredStudents = students.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s._id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Active student when exactly 1 student is selected
  const activeStudent =
    selectedStudentIds.length === 1
      ? students.find((s) => s._id === selectedStudentIds[0])
      : null;

  // Selected student objects for bulk display
  const selectedStudents = students.filter((s) =>
    selectedStudentIds.includes(s._id)
  );

  // When activeStudent changes, update single mode course lists
  useEffect(() => {
    if (activeStudent) {
      setIslamicCourses(activeStudent.studentSpecificField?.islamicCourses || []);
      setAcademicCourses(activeStudent.studentSpecificField?.academicCourses || []);
    }
  }, [activeStudent]);

  // When transitioning to bulk mode, if bulk staging is empty, prefill with active student's courses if available
  useEffect(() => {
    if (selectedStudentIds.length > 1) {
      if (
        bulkIslamicCourses.length === 0 &&
        bulkAcademicCourses.length === 0 &&
        (islamicCourses.length > 0 || academicCourses.length > 0)
      ) {
        setBulkIslamicCourses(islamicCourses.map((c) => ({ ...c })));
        setBulkAcademicCourses(academicCourses.map((c) => ({ ...c })));
      }
    }
  }, [selectedStudentIds.length]);

  // ── Selection handlers ───────────────────────────────────────────────────
  const handleToggleStudent = (studentId, e) => {
    if (e) e.stopPropagation();
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleRowClick = (student) => {
    if (selectedStudentIds.length > 1) {
      // In bulk mode, clicking a row toggles it
      handleToggleStudent(student._id);
    } else {
      // In single mode or no selection, clicking selects this student
      setSelectedStudentIds([student._id]);
      setIslamicCourses(student.studentSpecificField?.islamicCourses || []);
      setAcademicCourses(student.studentSpecificField?.academicCourses || []);
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredStudents.map((s) => s._id);
    const areAllSelected =
      allFilteredIds.length > 0 &&
      allFilteredIds.every((id) => selectedStudentIds.includes(id));

    if (areAllSelected) {
      // Unselect all filtered
      setSelectedStudentIds((prev) =>
        prev.filter((id) => !allFilteredIds.includes(id))
      );
    } else {
      // Select all filtered
      const combined = Array.from(new Set([...selectedStudentIds, ...allFilteredIds]));
      setSelectedStudentIds(combined);
    }
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  // ── Open Add/Edit Dialog ─────────────────────────────────────────────────
  const openAddDialog = (type, context = "single") => {
    setDialogContext(context);
    setDialogType(type);
    setEditIndex(null);
    setFormData(EMPTY_COURSE);
    setIsDialogOpen(true);
  };

  const openEditDialog = (type, index, context = "single") => {
    setDialogContext(context);
    setDialogType(type);
    setEditIndex(index);

    let course;
    if (context === "single") {
      course = type === "islamic" ? islamicCourses[index] : academicCourses[index];
    } else {
      course =
        type === "islamic"
          ? bulkIslamicCourses[index]
          : bulkAcademicCourses[index];
    }

    setFormData({ ...course });
    setIsDialogOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCourse = () => {
    if (!formData.courseName.trim()) {
      toast.error("Course name is required");
      return;
    }

    const cleanName = formData.courseName.trim();

    // Auto-save new course name to master list and backend for next time
    const exists = savedCourses.some(
      (c) => c.name?.toLowerCase() === cleanName.toLowerCase()
    );
    if (!exists) {
      const newEntry = {
        name: cleanName,
        type: dialogType === "islamic" ? "Islamic" : "Academic",
        universityBoard: formData.universityBoard?.trim() || "",
      };
      setSavedCourses((prev) => [...prev, newEntry]);
      fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify(newEntry),
      }).catch((err) => console.error("Error auto-saving new course name:", err));
    }

    if (dialogContext === "single") {
      if (dialogType === "islamic") {
        setIslamicCourses((prev) => {
          const updated = [...prev];
          if (editIndex !== null) updated[editIndex] = formData;
          else updated.push(formData);
          return updated;
        });
      } else {
        setAcademicCourses((prev) => {
          const updated = [...prev];
          if (editIndex !== null) updated[editIndex] = formData;
          else updated.push(formData);
          return updated;
        });
      }
    } else {
      // Bulk context
      if (dialogType === "islamic") {
        setBulkIslamicCourses((prev) => {
          const updated = [...prev];
          if (editIndex !== null) updated[editIndex] = formData;
          else updated.push(formData);
          return updated;
        });
      } else {
        setBulkAcademicCourses((prev) => {
          const updated = [...prev];
          if (editIndex !== null) updated[editIndex] = formData;
          else updated.push(formData);
          return updated;
        });
      }
    }

    setIsDialogOpen(false);
  };

  // ── Delete Confirmation ──────────────────────────────────────────────────
  const confirmDelete = (type, index, context = "single") => {
    setDeleteInfo({ type, index, context });
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deleteInfo) return;
    const { type, index, context } = deleteInfo;

    if (context === "single") {
      if (type === "islamic") {
        setIslamicCourses((prev) => prev.filter((_, i) => i !== index));
      } else {
        setAcademicCourses((prev) => prev.filter((_, i) => i !== index));
      }
    } else {
      if (type === "islamic") {
        setBulkIslamicCourses((prev) => prev.filter((_, i) => i !== index));
      } else {
        setBulkAcademicCourses((prev) => prev.filter((_, i) => i !== index));
      }
    }

    setIsDeleteDialogOpen(false);
    setDeleteInfo(null);
  };

  // ── Save Single Student ──────────────────────────────────────────────────
  const handleSaveSingle = async () => {
    if (!activeStudent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          ids: [activeStudent._id],
          islamicCourses,
          academicCourses,
          courseAction: "replace",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save courses");
      }

      // Update local student list
      setStudents((prev) =>
        prev.map((s) =>
          s._id === activeStudent._id
            ? {
                ...s,
                studentSpecificField: {
                  ...s.studentSpecificField,
                  islamicCourses,
                  academicCourses,
                },
              }
            : s
        )
      );

      toast.success(`Courses saved successfully for ${activeStudent.name}`);
    } catch (err) {
      toast.error(err.message || "Failed to save courses");
    } finally {
      setSaving(false);
    }
  };

  // ── Save Bulk Update ─────────────────────────────────────────────────────
  const handleSaveBulk = async () => {
    if (selectedStudentIds.length <= 1) return;
    if (
      bulkMode === "append" &&
      bulkIslamicCourses.length === 0 &&
      bulkAcademicCourses.length === 0
    ) {
      toast.error("Please add at least one course to append.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          ids: selectedStudentIds,
          islamicCourses: bulkIslamicCourses,
          academicCourses: bulkAcademicCourses,
          courseAction: bulkMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save bulk courses");
      }

      // Update local state for all affected students
      setStudents((prev) =>
        prev.map((s) => {
          if (!selectedStudentIds.includes(s._id)) return s;

          let newIslamic = [];
          let newAcademic = [];

          if (bulkMode === "append") {
            const existingIslamic = [
              ...(s.studentSpecificField?.islamicCourses || []),
            ];
            bulkIslamicCourses.forEach((newC) => {
              const idx = existingIslamic.findIndex(
                (c) =>
                  c.courseName?.trim().toLowerCase() ===
                  newC.courseName?.trim().toLowerCase()
              );
              if (idx !== -1) existingIslamic[idx] = { ...existingIslamic[idx], ...newC };
              else existingIslamic.push(newC);
            });
            newIslamic = existingIslamic;

            const existingAcademic = [
              ...(s.studentSpecificField?.academicCourses || []),
            ];
            bulkAcademicCourses.forEach((newC) => {
              const idx = existingAcademic.findIndex(
                (c) =>
                  c.courseName?.trim().toLowerCase() ===
                  newC.courseName?.trim().toLowerCase()
              );
              if (idx !== -1) existingAcademic[idx] = { ...existingAcademic[idx], ...newC };
              else existingAcademic.push(newC);
            });
            newAcademic = existingAcademic;
          } else {
            newIslamic = [...bulkIslamicCourses];
            newAcademic = [...bulkAcademicCourses];
          }

          return {
            ...s,
            studentSpecificField: {
              ...s.studentSpecificField,
              islamicCourses: newIslamic,
              academicCourses: newAcademic,
            },
          };
        })
      );

      setIsBulkConfirmOpen(false);
      toast.success(
        `Courses updated successfully for ${selectedStudentIds.length} students!`
      );
    } catch (err) {
      toast.error(err.message || "Failed to save bulk courses");
    } finally {
      setSaving(false);
    }
  };



  // Helper: check if all filtered students are selected
  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s._id));
  const someFilteredSelected =
    filteredStudents.some((s) => selectedStudentIds.includes(s._id)) &&
    !allFilteredSelected;

  // ── Course table sub-component ───────────────────────────────────────────
  const CourseTable = ({ type, courses, context = "single" }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === "islamic" ? (
            <BookMarked className="h-4 w-4 text-emerald-600" />
          ) : (
            <GraduationCap className="h-4 w-4 text-blue-600" />
          )}
          <h3 className="font-semibold text-sm">
            {type === "islamic" ? "Islamic Courses" : "Academic Courses"}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {courses.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => openAddDialog(type, context)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Course
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-xs sm:text-sm border-2 border-dashed rounded-lg bg-muted/20">
          No {type === "islamic" ? "Islamic" : "Academic"} courses recorded yet.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Course Name</TableHead>
                <TableHead className="text-xs font-semibold">University / Board</TableHead>
                <TableHead className="text-xs font-semibold">Year</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs w-20 text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-xs sm:text-sm py-2.5">
                    {course.courseName || "—"}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm py-2.5 text-muted-foreground">
                    {course.universityBoard || "—"}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm py-2.5">
                    {course.year || "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    {course.status ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[course.status] || ""
                        }`}
                      >
                        {course.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(type, idx, context)}
                        title="Edit Course"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDelete(type, idx, context)}
                        title="Remove Course"
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
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <Header
        title="COURSES"
        subTitle="Manage Islamic and Academic course details"
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Filter Students</CardTitle>
              <CardDescription className="text-xs">
                Select one or more batches and classes to load students
              </CardDescription>
            </div>
            {(selectedBatches.length > 0 || selectedClasses.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedBatches([]);
                  setSelectedClasses([]);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Batch</Label>
              <MultiSelect
                options={batchOptions}
                value={selectedBatches}
                onValueChange={setSelectedBatches}
                placeholder="Select batches..."
                maxCount={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Class</Label>
              <MultiSelect
                options={classOptions}
                value={selectedClasses}
                onValueChange={setSelectedClasses}
                placeholder="Select classes..."
                maxCount={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Layout ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Student List (Col 1-5) ───────────────────────────────────────── */}
        <Card className="lg:col-span-5 xl:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Students</CardTitle>
              </div>
              {students.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  {selectedStudentIds.length > 0
                    ? `${selectedStudentIds.length} of ${students.length} selected`
                    : `${students.length} total`}
                </Badge>
              )}
            </div>
            {selectedStudentIds.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  {selectedStudentIds.length === 1
                    ? "1 student selected"
                    : `${selectedStudentIds.length} students selected (Bulk Mode)`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-destructive hover:text-destructive px-1.5"
                  onClick={handleDeselectAll}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {(selectedClasses.length > 0 || selectedBatches.length > 0) && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or ID…"
                    className="pl-8 h-8 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {filteredStudents.length > 0 && (
                  <div className="flex items-center justify-between px-1 py-1 bg-muted/40 rounded-md text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="font-medium">
                        Select All ({filteredStudents.length})
                      </span>
                    </label>
                    {selectedStudentIds.length > 0 && (
                      <span className="text-primary font-medium">
                        {selectedStudentIds.length} chosen
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedClasses.length === 0 && selectedBatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Select a batch or class above to load students.
              </div>
            ) : loadingStudents ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading students…
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No students found.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
                {filteredStudents.map((student) => {
                  const isChecked = selectedStudentIds.includes(student._id);
                  const isSoleSelection =
                    selectedStudentIds.length === 1 && isChecked;
                  const islamicCount =
                    student.studentSpecificField?.islamicCourses?.length || 0;
                  const academicCount =
                    student.studentSpecificField?.academicCourses?.length || 0;

                  return (
                    <div
                      key={student._id}
                      onClick={() => handleRowClick(student)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-sm cursor-pointer select-none ${
                        isSoleSelection
                          ? "border-primary bg-primary/10 shadow-sm"
                          : isChecked
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/60 hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleToggleStudent(student._id)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-foreground text-sm">
                          {student.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="truncate">{student._id}</span>
                          {(selectedClasses.length > 1 || selectedBatches.length > 1) && (
                            <span className="text-[11px] text-muted-foreground/80 truncate">
                              {classMap.get(student.studentSpecificField?.classId) || ""}
                            </span>
                          )}
                          {(islamicCount > 0 || academicCount > 0) && (
                            <span className="flex items-center gap-1 shrink-0 ml-auto">
                              {islamicCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-medium"
                                  title={`${islamicCount} Islamic course(s)`}
                                >
                                  <BookMarked className="h-2.5 w-2.5" />
                                  {islamicCount}
                                </span>
                              )}
                              {academicCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-medium"
                                  title={`${academicCount} Academic course(s)`}
                                >
                                  <GraduationCap className="h-2.5 w-2.5" />
                                  {academicCount}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right Panel: Single Student OR Bulk Mode (Col 6-12) ─────────── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {selectedStudentIds.length === 0 ? (
            /* ── Case 0: Empty Selection ──────────────────────────────────── */
            <Card className="flex flex-col items-center justify-center min-h-[380px] text-center p-8 border-dashed">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">No Student Selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Select one student to view and update their individual courses, or select multiple students to update courses in bulk.
              </p>
            </Card>
          ) : selectedStudentIds.length === 1 && activeStudent ? (
            /* ── Case 1: Single Student Mode ─────────────────────────────── */
            <>
              {/* Header card for single student */}
              <Card className="bg-card">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        {activeStudent.name}
                      </h2>
                      <Badge variant="outline" className="text-xs">
                        ID: {activeStudent._id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Individual student course management. Changes will only apply to this student.
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveSingle}
                    disabled={saving}
                    className="gap-2 shrink-0 w-full sm:w-auto"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              {/* Islamic Courses Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-emerald-600" />
                    Islamic Courses
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Details of Islamic courses such as Dars-e-Nizami, Hifz, Mukhtasar, etc.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CourseTable
                    type="islamic"
                    courses={islamicCourses}
                    context="single"
                  />
                </CardContent>
              </Card>

              {/* Academic Courses Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    Academic Courses
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Details of formal academic courses such as SSLC, Plus Two, Degree, etc.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CourseTable
                    type="academic"
                    courses={academicCourses}
                    context="single"
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            /* ── Case 2: Bulk Update Mode (Multiple Students) ─────────────── */
            <>
              {/* Bulk Header & Controls */}
              <Card className="border-primary/40 bg-gradient-to-r from-primary/5 via-background to-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold">
                            Bulk Course Update
                          </CardTitle>
                          <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                            {selectedStudentIds.length} Students Selected
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          Apply course details across multiple students at once.
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Selected students count indicator (names not needed, only count) */}
                  <div className="flex items-center justify-between p-3 bg-muted/40 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-foreground">
                        Selected Students:
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {selectedStudentIds.length} Students Selected
                    </Badge>
                  </div>

                  {/* Bulk Update Mode Option */}
                  <div className="p-3.5 bg-background border rounded-lg space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      Update Method:
                    </Label>
                    <RadioGroup
                      value={bulkMode}
                      onValueChange={setBulkMode}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <div
                        className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${
                          bulkMode === "append"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                        onClick={() => setBulkMode("append")}
                      >
                        <RadioGroupItem value="append" id="append-mode" className="mt-0.5" />
                        <div className="space-y-0.5">
                          <label
                            htmlFor="append-mode"
                            className="text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5"
                          >
                            Append / Add (Recommended)
                          </label>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Add these courses to students. Keeps their existing courses; updates courses with the same name.
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${
                          bulkMode === "replace"
                            ? "border-destructive/60 bg-destructive/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                        onClick={() => setBulkMode("replace")}
                      >
                        <RadioGroupItem value="replace" id="replace-mode" className="mt-0.5" />
                        <div className="space-y-0.5">
                          <label
                            htmlFor="replace-mode"
                            className="text-xs font-semibold cursor-pointer text-destructive flex items-center gap-1.5"
                          >
                            Replace All
                          </label>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Overwrite all courses. Each selected student will only have the courses listed below.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Islamic Courses */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-emerald-600" />
                    Islamic Courses to Apply in Bulk
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Courses defined here will be applied to all {selectedStudentIds.length} selected students.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CourseTable
                    type="islamic"
                    courses={bulkIslamicCourses}
                    context="bulk"
                  />
                </CardContent>
              </Card>

              {/* Bulk Academic Courses */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    Academic Courses to Apply in Bulk
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Courses defined here will be applied to all {selectedStudentIds.length} selected students.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CourseTable
                    type="academic"
                    courses={bulkAcademicCourses}
                    context="bulk"
                  />
                </CardContent>
              </Card>

              {/* Bulk Save Action Bar */}
              <Card className="bg-card shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Ready to <strong>{bulkMode}</strong>{" "}
                      {bulkIslamicCourses.length} Islamic and{" "}
                      {bulkAcademicCourses.length} Academic course(s) for{" "}
                      <strong>{selectedStudentIds.length} students</strong>.
                    </span>
                  </div>

                  <Button
                    onClick={() => setIsBulkConfirmOpen(true)}
                    disabled={
                      saving ||
                      (bulkMode === "append" &&
                        bulkIslamicCourses.length === 0 &&
                        bulkAcademicCourses.length === 0)
                    }
                    className="gap-2 w-full sm:w-auto"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Courses to {selectedStudentIds.length} Students
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit Course Dialog ─────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {dialogType === "islamic" ? (
                <BookMarked className="h-4 w-4 text-emerald-600" />
              ) : (
                <GraduationCap className="h-4 w-4 text-blue-600" />
              )}
              {editIndex !== null ? "Edit" : "Add"}{" "}
              {dialogType === "islamic" ? "Islamic" : "Academic"} Course
            </DialogTitle>
            <DialogDescription className="text-xs">
              {dialogContext === "single"
                ? `Enter course details for ${activeStudent?.name || "the student"}.`
                : `Enter course details to apply across ${selectedStudentIds.length} selected students.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="courseName" className="text-xs font-medium">
                  Course Name <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  Type or select from dropdown
                </span>
              </div>
              <div className="relative flex items-center">
                <Input
                  id="courseName"
                  list={`datalist-courses-${dialogType}`}
                  placeholder="Type or select course name…"
                  value={formData.courseName}
                  onChange={(e) => handleFormChange("courseName", e.target.value)}
                  className="pr-9"
                />
                <div className="absolute right-1 flex items-center">
                  <Popover
                    open={isCourseDropdownOpen}
                    onOpenChange={setIsCourseDropdownOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Browse saved courses"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2 shadow-lg" align="end">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground border-b pb-1.5">
                          <span>Saved Courses ({courseSuggestions.length})</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {dialogType}
                          </Badge>
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                          {courseSuggestions.length === 0 ? (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              No saved courses yet.
                            </div>
                          ) : (
                            courseSuggestions.map((item) => (
                              <div
                                key={item.name}
                                className={`w-full group px-2 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                                  formData.courseName.toLowerCase() === item.name.toLowerCase()
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted text-foreground"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleFormChange("courseName", item.name);
                                    if (item.universityBoard) {
                                      handleFormChange("universityBoard", item.universityBoard);
                                    }
                                    setIsCourseDropdownOpen(false);
                                  }}
                                  className="flex-1 text-left flex flex-col min-w-0 pr-2"
                                >
                                  <span className="font-medium truncate">{item.name}</span>
                                  {item.universityBoard && (
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      {item.universityBoard}
                                    </span>
                                  )}
                                </button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSavedCourse(item.name);
                                  }}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  title={`Remove "${item.name}" from dropdown`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Native datalist for browser autocomplete suggestions */}
              <datalist id={`datalist-courses-${dialogType}`}>
                {courseSuggestions.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.universityBoard ? `(${item.universityBoard})` : ""}
                  </option>
                ))}
              </datalist>

              {/* Quick-select pills */}
              {courseSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-muted-foreground mr-1">
                    Saved:
                  </span>
                  {courseSuggestions.slice(0, 6).map((item) => (
                    <div
                      key={item.name}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
                        formData.courseName.toLowerCase() === item.name.toLowerCase()
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "bg-muted/40 hover:bg-muted border-border text-foreground"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleFormChange("courseName", item.name);
                          if (item.universityBoard) {
                            handleFormChange("universityBoard", item.universityBoard);
                          }
                        }}
                        className="truncate max-w-[120px]"
                      >
                        {item.name}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSavedCourse(item.name);
                        }}
                        className="hover:text-destructive transition-colors ml-0.5"
                        title={`Remove "${item.name}" from dropdown`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="universityBoard" className="text-xs font-medium">
                University / Board Name
              </Label>
              <Input
                id="universityBoard"
                placeholder="e.g. CBSE / Kerala State Board / Calicut University"
                value={formData.universityBoard}
                onChange={(e) =>
                  handleFormChange("universityBoard", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-xs font-medium">
                  Year
                </Label>
                <Input
                  id="year"
                  placeholder="e.g. 2024"
                  value={formData.year}
                  onChange={(e) => handleFormChange("year", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleFormChange("status", v)}
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

            <div className="flex gap-2 justify-end pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="gap-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCourse}
                className="gap-1.5 text-xs"
              >
                <Save className="h-3.5 w-3.5" />
                {editIndex !== null ? "Update" : "Add"} Course
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Course Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteInfo?.context === "single"
                ? "This course will be removed from this student. Remember to click 'Save Changes' to commit."
                : "This course will be removed from the bulk update list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Confirmation Dialog ─────────────────────────────────────── */}
      <AlertDialog
        open={isBulkConfirmOpen}
        onOpenChange={setIsBulkConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Confirm Bulk Course Update
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  You are about to <strong>{bulkMode}</strong> courses for{" "}
                  <strong>{selectedStudentIds.length} students</strong>:
                </div>
                <ul className="list-disc pl-5 text-xs space-y-1">
                  <li>
                    <strong>Islamic Courses ({bulkIslamicCourses.length}):</strong>{" "}
                    {bulkIslamicCourses.length > 0
                      ? bulkIslamicCourses.map((c) => c.courseName).join(", ")
                      : "None"}
                  </li>
                  <li>
                    <strong>Academic Courses ({bulkAcademicCourses.length}):</strong>{" "}
                    {bulkAcademicCourses.length > 0
                      ? bulkAcademicCourses.map((c) => c.courseName).join(", ")
                      : "None"}
                  </li>
                  <li>
                    <strong>Mode:</strong>{" "}
                    {bulkMode === "append"
                      ? "Append (existing courses will be kept)"
                      : "Replace (all existing courses for these students will be replaced)"}
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveBulk}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
