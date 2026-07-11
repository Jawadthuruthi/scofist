"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";
import Cookies from "js-cookie";
import {
  BookOpen,
  Users,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Loader,
  Save,
  CalendarDays,
  GraduationCap,
  UserCheck,
  X,
  BookOpenCheck,
  Edit,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "./Header";

// ─────────────────────────────────────────────────────────────────────────────
// Helper — single API request
// ─────────────────────────────────────────────────────────────────────────────
const apiFetch = async (method, url, data, apiKey) => {
  const activeRole = Cookies.get("active-role");
  const activeYear = Cookies.get("active-year");
  const config = {
    headers: { "api-key": apiKey, "active-role": activeRole, "active-year": activeYear },
    withCredentials: true,
  };
  if (method === "get") {
    const res = await axios.get(url, config);
    return res.data;
  }
  if (method === "post") {
    const res = await axios.post(url, data, config);
    return res.data;
  }
  if (method === "delete") {
    const res = await axios.delete(url, { ...config, data });
    return res.data;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Enroll Students Dialog
// ─────────────────────────────────────────────────────────────────────────────
const EnrollDialog = ({ open, setOpen, classes, teachers, apiKey, onSuccess, activeYear }) => {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherPopOpen, setTeacherPopOpen] = useState(false);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentIds([]);
      return;
    }
    const load = async () => {
      setLoadingStudents(true);
      try {
        const activeYear = Cookies.get("active-year");
        const res = await apiFetch(
          "get",
          `/api/users?roles=Student&status=Active&classId=${selectedClassId}&projection=_id,name,profilePic&limit=0&year=${activeYear || ""}`,
          null,
          apiKey
        );
        setStudents(res?.users || []);
      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, [selectedClassId, apiKey]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter((s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s._id));
    }
  };

  const handleEnroll = async () => {
    if (!selectedStudentIds.length) {
      toast.error("Please select at least one student");
      return;
    }
    if (!selectedTeacherId) {
      toast.error("Please assign a designated teacher");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(
        "post",
        "/api/hifz-doura-class",
        {
          studentIds: selectedStudentIds,
          classId: selectedClassId,
          teacherId: selectedTeacherId,
        },
        apiKey
      );
      toast.success("Students enrolled successfully!");
      setOpen(false);
      setSelectedStudentIds([]);
      setSelectedClassId("");
      setSelectedTeacherId("");
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to enroll students");
    } finally {
      setSaving(false);
    }
  };

  const selectedTeacherName = useMemo(
    () => teachers.find((t) => t._id === selectedTeacherId)?.name || "",
    [teachers, selectedTeacherId]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-primary" />
            Enroll Students in Hifz & Doura
          </DialogTitle>
          <DialogDescription>
            Select a class, assign a designated teacher, then choose students to enroll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Class selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Select Class</label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name}
                    {cls.shortname ? ` (${cls.shortname})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teacher selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Designated Teacher</label>
            <Popover open={teacherPopOpen} onOpenChange={setTeacherPopOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedTeacherName || "Choose a teacher..."}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                <Command>
                  <CommandInput placeholder="Search teachers..." />
                  <CommandList onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                    <CommandEmpty>No teachers found.</CommandEmpty>
                    <CommandGroup>
                      {teachers.map((t) => (
                        <CommandItem
                          key={t._id}
                          value={t.name}
                          onSelect={() => {
                            setSelectedTeacherId(t._id);
                            setTeacherPopOpen(false);
                          }}
                        >
                          <UserCheck
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTeacherId === t._id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {t.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Students list */}
          {selectedClassId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Students
                  {students.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({selectedStudentIds.length}/{filteredStudents.length} selected)
                    </span>
                  )}
                </label>
                {filteredStudents.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedStudentIds.length === filteredStudents.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {loadingStudents ? (
                <div className="flex justify-center py-8">
                  <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  No students found in this class.
                </p>
              ) : (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student._id);
                    return (
                      <div
                        key={student._id}
                        onClick={() => toggleStudent(student._id)}
                        className={cn(
                          "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0",
                          isSelected
                            ? "bg-primary/10"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          )}
                        >
                          {isSelected && (
                            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M10.28 2.28L4.5 8.06 1.72 5.28 0.28 6.72 4.5 10.94 11.72 3.72z" />
                            </svg>
                          )}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.profilePic?.url} />
                          <AvatarFallback className="text-xs">
                            {student.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{student.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={saving || !selectedStudentIds.length || !selectedTeacherId}
            >
              {saving ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Enroll {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ""} Students
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const HifzDoura = ({ apiKey, classes, teachers, currentUser }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [removingIds, setRemovingIds] = useState([]);
  const [filterDate, setFilterDate] = useState(formatDate(new Date()));
  const [searchEnroll, setSearchEnroll] = useState("");
  const [activeTab, setActiveTab] = useState("records");
  const [activeYear, setActiveYear] = useState(Cookies.get("active-year") || "");
  const [selectedEnrollments, setSelectedEnrollments] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState([]);
  const [editDialogClassId, setEditDialogClassId] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentsToDelete, setStudentsToDelete] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [deleteRecordsDialogOpen, setDeleteRecordsDialogOpen] = useState(false);
  const [recordsToDelete, setRecordsToDelete] = useState([]);

  // ── Handle Delete Selected Records ─────────────────────────────────────
  const promptDeleteRecords = (classRecords) => {
    const idsToDelete = classRecords.filter((r) => selectedRecords.includes(r._id)).map((r) => r._id);
    if (!idsToDelete.length) return;
    setRecordsToDelete(idsToDelete);
    setDeleteRecordsDialogOpen(true);
  };

  const confirmDeleteRecords = async () => {
    if (!recordsToDelete.length) return;
    setRemovingIds((prev) => [...prev, ...recordsToDelete]);
    try {
      await apiFetch("delete", "/api/hifz-doura", { ids: recordsToDelete }, apiKey);
      toast.success("Record(s) deleted successfully");
      setSelectedRecords((prev) => prev.filter((id) => !recordsToDelete.includes(id)));
      fetchRecords();
    } catch {
      toast.error("Failed to delete records");
    } finally {
      setRemovingIds((prev) => prev.filter((id) => !recordsToDelete.includes(id)));
      setDeleteRecordsDialogOpen(false);
      setRecordsToDelete([]);
    }
  };

  // ── Handle Delete Selected ─────────────────────────────────────────────
  const promptDelete = (classStudents) => {
    const idsToDelete = classStudents.filter((s) => selectedEnrollments.includes(s._id)).map((s) => s._id);
    if (!idsToDelete.length) return;
    setStudentsToDelete(idsToDelete);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!studentsToDelete.length) return;
    setRemovingIds((prev) => [...prev, ...studentsToDelete]);
    try {
      await apiFetch("delete", "/api/hifz-doura-class", { ids: studentsToDelete }, apiKey);
      toast.success("Student(s) removed successfully");
      setSelectedEnrollments((prev) => prev.filter((id) => !studentsToDelete.includes(id)));
      fetchEnrollments();
    } catch {
      toast.error("Failed to remove students");
    } finally {
      setRemovingIds((prev) => prev.filter((id) => !studentsToDelete.includes(id)));
      setDeleteDialogOpen(false);
      setStudentsToDelete([]);
    }
  };

  useEffect(() => {
    if (!activeYear) {
      axios.get("/api/settings").then((res) => {
        const settings = res.data?.settings;
        const year = settings?.activeYear || settings?.years?.[settings.years.length - 1];
        if (year) {
          Cookies.set("active-year", year, { expires: 365, path: "/" });
          setActiveYear(year);
        }
      }).catch(console.error);
    }
  }, [activeYear]);

  // ── Fetch enrollments ──────────────────────────────────────────────────
  const fetchEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const data = await apiFetch(
        "get",
        `/api/hifz-doura-class`,
        null,
        apiKey
      );
      setEnrollments(data?.enrollments || []);
    } catch {
      toast.error("Failed to load enrollments");
    } finally {
      setLoadingEnrollments(false);
    }
  }, [apiKey]);

  // ── Fetch records ──────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    if (!activeYear) return;
    setLoadingRecords(true);
    try {
      const data = await apiFetch(
        "get",
        `/api/hifz-doura?year=${activeYear}&date=${filterDate}`,
        null,
        apiKey
      );
      setRecords(data?.records || []);
    } catch {
      toast.error("Failed to load records");
    } finally {
      setLoadingRecords(false);
    }
  }, [apiKey, activeYear, filterDate]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── Remove enrollment ──────────────────────────────────────────────────
  const handleRemove = async (enrollmentId) => {
    setRemovingIds((prev) => [...prev, enrollmentId]);
    try {
      await apiFetch(
        "delete",
        "/api/hifz-doura-class",
        { ids: [enrollmentId] },
        apiKey
      );
      toast.success("Student removed from Hifz & Doura");
      setEnrollments((prev) => prev.filter((e) => e._id !== enrollmentId));
    } catch {
      toast.error("Failed to remove student");
    } finally {
      setRemovingIds((prev) => prev.filter((id) => id !== enrollmentId));
    }
  };

  // ── Group enrollments by class ─────────────────────────────────────────
  const enrollmentsByClass = useMemo(() => {
    const filtered = searchEnroll.trim()
      ? enrollments.filter((e) =>
          e.studentId?.name?.toLowerCase().includes(searchEnroll.toLowerCase())
        )
      : enrollments;

    const grouped = {};
    filtered.forEach((enrollment) => {
      const classId = enrollment.classId?._id || "unknown";
      const className = enrollment.classId?.name || "Unknown Class";
      if (!grouped[classId]) {
        grouped[classId] = {
          classId,
          className,
          teacher: enrollment.teacherId,
          students: [],
        };
      }
      grouped[classId].students.push(enrollment);
    });
    return Object.values(grouped);
  }, [enrollments, searchEnroll]);

  // ── Group records by class ─────────────────────────────────────────────
  const recordsByClass = useMemo(() => {
    const grouped = {};
    records.forEach((r) => {
      const classId = r.classId?._id || "unknown";
      const className = r.classId?.name || "Unknown Class";
      if (!grouped[classId]) {
        grouped[classId] = { classId, className, records: [] };
      }
      grouped[classId].records.push(r);
    });
    return Object.values(grouped);
  }, [records]);

  const totalEnrolled = enrollments.length;

  return (
    <div className="space-y-4 pb-8">
      <Header
        title="HIFZ & DOURA"
        subTitle="Quran memorization and revision tracking"
      />

      {/* Summary cards acting as tabs */}
      <div className="grid grid-cols-2 gap-3">
        {/* Daily Records Card */}
        <div 
          onClick={() => setActiveTab("records")}
          className={cn("rounded-xl border p-4 cursor-pointer transition-colors flex items-center gap-3", activeTab === "records" ? "bg-primary/5 border-primary" : "bg-card hover:bg-muted/50")}
        >
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Daily Records</p>
            <p className="text-2xl font-bold leading-none">{records.length}</p>
          </div>
        </div>

        {/* Enrolled Students Card */}
        <div 
          onClick={() => setActiveTab("enrollments")}
          className={cn("rounded-xl border p-4 cursor-pointer transition-colors", activeTab === "enrollments" ? "bg-primary/5 border-primary" : "bg-card hover:bg-muted/50")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Enrolled Students</p>
                <p className="text-2xl font-bold leading-none">{totalEnrolled}</p>
              </div>
            </div>
            {activeTab === "enrollments" && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); setEnrollDialogOpen(true); }} className="px-2 sm:px-3">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Enroll Students</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* ── Enrollments Tab ──────────────────────────────────── */}
        <TabsContent value="enrollments" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search enrolled students..."
                className="pl-9"
                value={searchEnroll}
                onChange={(e) => setSearchEnroll(e.target.value)}
              />
            </div>
          </div>

          {loadingEnrollments ? (
            <div className="flex justify-center py-16">
              <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : enrollmentsByClass.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed">
              <BookOpenCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No students enrolled yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Enroll Students" to add students to Hifz & Doura.
              </p>
              <Button className="mt-4" onClick={() => setEnrollDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Enroll Students
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollmentsByClass.map(({ classId, className, teacher, students }) => {
                const classSelectedIds = students.filter(s => selectedEnrollments.includes(s._id)).map(s => s._id);
                const classSelectedStudents = students.filter(s => selectedEnrollments.includes(s._id)).map(s => ({ id: s.studentId?._id, name: s.studentId?.name || "Unknown" }));
                const allSelected = classSelectedIds.length > 0 && classSelectedIds.length === students.length;

                return (
                <div key={classId} className="rounded-xl border bg-card overflow-hidden">
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{className}</p>
                        {teacher && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            Teacher: {teacher.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {classSelectedIds.length > 0 && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedForEdit(classSelectedStudents);
                          setEditDialogClassId(classId);
                          setEditDialogOpen(true);
                        }} className="px-2 sm:px-3">
                          <Edit className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => promptDelete(students)} className="px-2 sm:px-3">
                          <Trash2 className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto w-full">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox 
                            checked={allSelected} 
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedEnrollments(prev => [...new Set([...prev, ...students.map(s => s._id)])]);
                              } else {
                                setSelectedEnrollments(prev => prev.filter(id => !students.some(s => s._id === id)));
                              }
                            }} 
                          />
                        </TableHead>
                        <TableHead>Sl.No</TableHead>
                        <TableHead>Admn No</TableHead>
                        <TableHead>Student</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((enrollment, idx) => (
                        <TableRow key={enrollment._id}>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={selectedEnrollments.includes(enrollment._id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEnrollments(prev => [...prev, enrollment._id]);
                                } else {
                                  setSelectedEnrollments(prev => prev.filter(id => id !== enrollment._id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium text-sm">
                            {enrollment.studentId?.studentSpecificField?.admissionNumber || enrollment.studentId?.admissionNumber || enrollment.studentId?._id || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 shrink-0 hidden sm:flex">
                                <AvatarImage src={enrollment.studentId?.profilePic?.url} />
                                <AvatarFallback className="text-xs">
                                  {enrollment.studentId?.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">
                                {enrollment.studentId?.name || "Unknown"}
                              </span>
                            </div>
                          </TableCell>

                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Records Tab ──────────────────────────────────────── */}
        <TabsContent value="records" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {records.length} record(s) found
            </span>
          </div>

          {loadingRecords ? (
            <div className="flex justify-center py-16">
              <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recordsByClass.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No records for this date</p>
              <p className="text-sm text-muted-foreground mt-1">
                Teachers record pages from the My Periods page.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordsByClass.map(({ classId, className, records: classRecords }) => {
                const classSelectedIds = classRecords.filter(r => selectedRecords.includes(r._id)).map(r => r._id);
                const allSelected = classSelectedIds.length > 0 && classSelectedIds.length === classRecords.length;

                return (
                <div key={classId} className="rounded-xl border bg-card overflow-hidden">
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">{className}</p>
                    </div>
                    {classSelectedIds.length > 0 && (
                      <Button size="sm" variant="destructive" onClick={() => promptDeleteRecords(classRecords)} className="px-2 sm:px-3">
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto w-full">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox 
                            checked={allSelected} 
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRecords(prev => [...new Set([...prev, ...classRecords.map(r => r._id)])]);
                              } else {
                                setSelectedRecords(prev => prev.filter(id => !classRecords.some(r => r._id === id)));
                              }
                            }} 
                          />
                        </TableHead>
                        <TableHead>Sl.No</TableHead>
                        <TableHead>Admn No</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Pages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classRecords.map((record, idx) => (
                        <TableRow key={record._id}>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={selectedRecords.includes(record._id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRecords(prev => [...prev, record._id]);
                                } else {
                                  setSelectedRecords(prev => prev.filter(id => id !== record._id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium text-sm">
                            {record.studentId?.studentSpecificField?.admissionNumber || record.studentId?.admissionNumber || record.studentId?._id || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 shrink-0 hidden sm:flex">
                                <AvatarImage src={record.studentId?.profilePic?.url} />
                                <AvatarFallback className="text-xs">
                                  {record.studentId?.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">
                                {record.studentId?.name || "Unknown"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={record.pagesCount >= 1 ? "default" : "secondary"}
                              className="text-sm font-bold"
                            >
                              {record.pagesCount}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EnrollDialog
        open={enrollDialogOpen}
        setOpen={setEnrollDialogOpen}
        classes={classes}
        teachers={teachers}
        apiKey={apiKey}
        onSuccess={fetchEnrollments}
      />
      <EditEnrollmentDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        teachers={teachers}
        apiKey={apiKey}
        selectedStudents={selectedForEdit}
        classId={editDialogClassId}
        onSuccess={() => {
          setSelectedEnrollments([]);
          fetchEnrollments();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {studentsToDelete.length} student(s) from Hifz & Doura. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingIds.length > 0}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => {
              e.preventDefault();
              confirmDelete();
            }} disabled={removingIds.length > 0} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removingIds.length > 0 ? <Loader className="h-4 w-4 animate-spin sm:mr-2" /> : <Trash2 className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">Delete</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRecordsDialogOpen} onOpenChange={setDeleteRecordsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {recordsToDelete.length} record(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingIds.length > 0}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => {
              e.preventDefault();
              confirmDeleteRecords();
            }} disabled={removingIds.length > 0} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removingIds.length > 0 ? <Loader className="h-4 w-4 animate-spin sm:mr-2" /> : <Trash2 className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">Delete</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Edit Enrollment Dialog
// ─────────────────────────────────────────────────────────────────────────────
const EditEnrollmentDialog = ({ open, setOpen, teachers, apiKey, selectedStudents, classId, onSuccess }) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await apiFetch(
        "post",
        "/api/hifz-doura-class",
        {
          studentIds: selectedStudents.map(s => s.id),
          classId: classId,
          teacherId: selectedTeacherId === "none" ? "" : selectedTeacherId,
        },
        apiKey
      );
      toast.success("Teacher updated successfully");
      setOpen(false);
      onSuccess();
    } catch (e) {
      toast.error("Failed to update teacher");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Teacher</DialogTitle>
          <DialogDescription>
            Assign a new teacher for {selectedStudents.length} student(s).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selected Students</label>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md max-h-32 overflow-y-auto">
              {selectedStudents.map(s => s.name).join(", ")}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign Teacher</label>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teachers.map(t => (
                  <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleUpdate} disabled={saving}>
            {saving ? <Loader className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HifzDoura;
