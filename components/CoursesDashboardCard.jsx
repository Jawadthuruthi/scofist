"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  GraduationCap,
  BookMarked,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  X,
} from "lucide-react";

const STATUS_COLORS = {
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  Dropped: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

export default function CoursesDashboardCard({
  students = [],
  classes = [],
  batches = [],
  apiKey,
  activeRole,
}) {
  const currentRole =
    activeRole || (typeof window !== "undefined" ? Cookies.get("active-role") : "");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "islamic" | "academic"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseForModal, setSelectedCourseForModal] = useState(null);
  const [selectedYearForModal, setSelectedYearForModal] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [apiCourses, setApiCourses] = useState(null);
  const [loadingApi, setLoadingApi] = useState(false);

  // Fetch from /api/courses to get any master courses and server-aggregated counts
  useEffect(() => {
    let isMounted = true;
    setLoadingApi(true);
    fetch("/api/courses", {
      headers: apiKey ? { "x-api-key": apiKey } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.courses) {
          setApiCourses(data.courses);
        }
      })
      .catch((err) => {
        console.error("Error fetching courses API:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingApi(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Map classes and batches for easy name lookup
  const classMap = useMemo(() => {
    const map = new Map();
    classes.forEach((c) => {
      map.set(String(c._id), c.name || c.shortname || "—");
    });
    return map;
  }, [classes]);

  const batchMap = useMemo(() => {
    const map = new Map();
    batches.forEach((b) => {
      map.set(String(b._id), b.name || "—");
    });
    return map;
  }, [batches]);

  // Aggregate course records from students (client-side real-time fallback/complement)
  const clientAggregatedCourses = useMemo(() => {
    const courseMap = new Map();

    const getOrInitCourse = (name, type, defaultBoard = "") => {
      const cleanName = (name || "").trim();
      const key = `${type.toLowerCase()}:${cleanName.toLowerCase()}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          name: cleanName,
          type, // "Islamic" | "Academic"
          universityBoard: defaultBoard || "",
          studentCount: 0,
          completedCount: 0,
          ongoingCount: 0,
          pendingCount: 0,
          droppedCount: 0,
          students: [],
        });
      }
      return courseMap.get(key);
    };

    students.forEach((student) => {
      const studentId = student._id || student.id;
      const studentName = student.name || "Unknown";
      const classIdStr =
        student.studentSpecificField?.classId?._id ||
        student.studentSpecificField?.classId ||
        student.classId?._id ||
        student.classId ||
        "";
      const batchIdStr =
        student.studentSpecificField?.batchId?._id ||
        student.studentSpecificField?.batchId ||
        student.batchId?._id ||
        student.batchId ||
        "";

      const className = classMap.get(String(classIdStr)) || "—";
      const batchName = batchMap.get(String(batchIdStr)) || "—";

      // Islamic courses
      const islamicList =
        student.studentSpecificField?.islamicCourses ||
        student.islamicCourses ||
        [];
      islamicList.forEach((c) => {
        if (!c.courseName?.trim()) return;
        const entry = getOrInitCourse(c.courseName, "Islamic", c.universityBoard);
        if (!entry.universityBoard && c.universityBoard) {
          entry.universityBoard = c.universityBoard;
        }

        entry.studentCount += 1;
        if (c.status === "Completed") entry.completedCount += 1;
        else if (c.status === "Ongoing") entry.ongoingCount += 1;
        else if (c.status === "Pending") entry.pendingCount += 1;
        else if (c.status === "Dropped") entry.droppedCount = (entry.droppedCount || 0) + 1;

        entry.students.push({
          studentId,
          studentName,
          className,
          batchName,
          year: c.year || "—",
          status: c.status || "—",
          universityBoard: c.universityBoard || "—",
        });
      });

      // Academic courses
      const academicList =
        student.studentSpecificField?.academicCourses ||
        student.academicCourses ||
        [];
      academicList.forEach((c) => {
        if (!c.courseName?.trim()) return;
        const entry = getOrInitCourse(c.courseName, "Academic", c.universityBoard);
        if (!entry.universityBoard && c.universityBoard) {
          entry.universityBoard = c.universityBoard;
        }

        entry.studentCount += 1;
        if (c.status === "Completed") entry.completedCount += 1;
        else if (c.status === "Ongoing") entry.ongoingCount += 1;
        else if (c.status === "Pending") entry.pendingCount += 1;
        else if (c.status === "Dropped") entry.droppedCount = (entry.droppedCount || 0) + 1;

        entry.students.push({
          studentId,
          studentName,
          className,
          batchName,
          year: c.year || "—",
          status: c.status || "—",
          universityBoard: c.universityBoard || "—",
        });
      });
    });

    return Array.from(courseMap.values());
  }, [students, classMap, batchMap]);

  // Combine apiCourses with clientAggregatedCourses to guarantee 100% completeness
  const allCourses = useMemo(() => {
    // If apiCourses is available and has data, use it as primary, but merge student details
    const sourceList = apiCourses && apiCourses.length > 0 ? apiCourses : clientAggregatedCourses;

    // Merge any missing from clientAggregatedCourses
    const map = new Map();
    sourceList.forEach((c) => {
      const key = `${c.type.toLowerCase()}:${c.name.trim().toLowerCase()}`;
      map.set(key, { ...c });
    });

    clientAggregatedCourses.forEach((c) => {
      const key = `${c.type.toLowerCase()}:${c.name.trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, { ...c });
      } else {
        // If client count is higher (e.g. freshly loaded students), take client count & students
        const existing = map.get(key);
        if ((c.studentCount || 0) > (existing.studentCount || 0)) {
          existing.studentCount = c.studentCount;
          existing.completedCount = c.completedCount;
          existing.ongoingCount = c.ongoingCount;
          existing.pendingCount = c.pendingCount;
          existing.students = c.students;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [apiCourses, clientAggregatedCourses]);

  // Counts
  const totalIslamic = useMemo(
    () => allCourses.filter((c) => c.type === "Islamic").length,
    [allCourses]
  );
  const totalAcademic = useMemo(
    () => allCourses.filter((c) => c.type === "Academic").length,
    [allCourses]
  );
  const totalEnrollments = useMemo(
    () => allCourses.reduce((sum, c) => sum + (c.studentCount || 0), 0),
    [allCourses]
  );

  // Filtered list based on active tab and search
  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      // Type filter
      if (activeFilter === "islamic" && course.type !== "Islamic") return false;
      if (activeFilter === "academic" && course.type !== "Academic") return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = course.name.toLowerCase().includes(query);
        const matchesBoard = (course.universityBoard || "")
          .toLowerCase()
          .includes(query);
        if (!matchesName && !matchesBoard) return false;
      }

      return true;
    });
  }, [allCourses, activeFilter, searchTerm]);

  // Enrolled Years for Selected Course Modal
  const courseYearsForModal = useMemo(() => {
    if (!selectedCourseForModal?.students || selectedCourseForModal.students.length === 0) return [];
    const map = new Map();
    selectedCourseForModal.students.forEach((st) => {
      let yr = st.year ? String(st.year).trim() : "1";
      if (!yr || yr === "—") yr = "1";
      if (!map.has(yr)) {
        map.set(yr, {
          year: yr,
          students: [],
          ongoingCount: 0,
          completedCount: 0,
          pendingCount: 0,
          droppedCount: 0,
        });
      }
      const item = map.get(yr);
      item.students.push(st);
      if (st.status === "Completed") item.completedCount += 1;
      else if (st.status === "Pending") item.pendingCount += 1;
      else if (st.status === "Dropped") item.droppedCount += 1;
      else item.ongoingCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.year, 10);
      const numB = parseInt(b.year, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.year.localeCompare(b.year, undefined, { numeric: true });
    });
  }, [selectedCourseForModal]);

  // Modal filtered students
  const modalFilteredStudents = useMemo(() => {
    if (!selectedCourseForModal?.students) return [];
    let list = selectedCourseForModal.students;
    if (selectedYearForModal && selectedYearForModal !== "all") {
      list = list.filter((s) => {
        let yr = s.year ? String(s.year).trim() : "1";
        if (!yr || yr === "—") yr = "1";
        return yr === String(selectedYearForModal).trim();
      });
    }
    if (!modalSearchTerm.trim()) return list;
    const q = modalSearchTerm.toLowerCase();
    return list.filter(
      (s) =>
        s.studentName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.batchName?.toLowerCase().includes(q) ||
        s.year?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q)
    );
  }, [selectedCourseForModal, selectedYearForModal, modalSearchTerm]);

  const getDisplayYear = (year) => {
    if (!year || year === "—") return "Year 1";
    const str = String(year).trim();
    if (/^\d+$/.test(str)) {
      if (parseInt(str, 10) <= 10) return `Year ${str}`;
      return str;
    }
    if (str.toLowerCase().includes("year")) return str;
    return `Year ${str}`;
  };

  return (
    <Card className="border-t-4 border-t-primary shadow-sm overflow-hidden">
      {/* ── Card Header ─────────────────────────────────────────────────── */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b bg-card">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                COURSES
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              All Islamic and Academic Courses
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {currentRole === "College Admin" && (
            <Link href="/dashboard/students-courses">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3 gap-1.5 text-xs hover:bg-primary/5 hover:text-primary transition-colors"
                title="Manage Courses"
              >
                <span className="hidden sm:inline">Manage Courses</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* ── Toolbar: Filter tabs & Search input ────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border text-xs">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({allCourses.length})
            </button>
            <button
              onClick={() => setActiveFilter("islamic")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeFilter === "islamic"
                  ? "bg-background text-emerald-700 dark:text-emerald-300 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookMarked className="h-3 w-3" />
              Islamic ({totalIslamic})
            </button>
            <button
              onClick={() => setActiveFilter("academic")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeFilter === "academic"
                  ? "bg-background text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3 w-3" />
              Academic ({totalAcademic})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search course or board…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* ── Main Courses Table ────────────────────────────────────────── */}
        {allCourses.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl p-6 bg-muted/10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">No Courses Recorded Yet</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No Islamic or Academic courses have been added yet. Manage courses to record qualifications and see counts here.
              </p>
            </div>
            {currentRole === "College Admin" && (
              <Link href="/dashboard/students-courses" className="inline-block pt-1">
                <Button size="sm" className="gap-1.5 text-xs">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Add Course Records
                </Button>
              </Link>
            )}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-muted/10 text-muted-foreground text-xs">
            No courses match your filter or search query.
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-14 sm:w-16 text-xs font-semibold text-center">Sl No</TableHead>
                  <TableHead className="text-xs font-semibold">Course Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold">Type</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold">University / Board</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-24 sm:w-32">Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course, idx) => (
                  <TableRow
                    key={`${course.type}-${course.name}`}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedCourseForModal(course);
                      setSelectedYearForModal(null);
                      setModalSearchTerm("");
                    }}
                  >
                    <TableCell className="text-xs font-medium text-center text-muted-foreground py-3">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {/* In mobile view: type at the top of course name */}
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

                        <span className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                          {course.name}
                        </span>

                        {/* In mobile view: university at the bottom of course name */}
                        {course.universityBoard ? (
                          <span className="sm:hidden text-[11px] text-muted-foreground">
                            {course.universityBoard}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-3">
                      {course.type === "Islamic" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <BookMarked className="h-3 w-3" />
                          Islamic
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          <GraduationCap className="h-3 w-3" />
                          Academic
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground py-3">
                      {course.universityBoard || "—"}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <Badge
                        variant={course.studentCount > 0 ? "secondary" : "outline"}
                        className={`text-xs font-bold gap-1 px-2.5 py-0.5 ${
                          course.studentCount > 0
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Users className="h-3 w-3" />
                        {course.studentCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* ── Students in Course Modal ─────────────────────────────────────── */}
      <Dialog
        open={!!selectedCourseForModal}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCourseForModal(null);
            setSelectedYearForModal(null);
            setModalSearchTerm("");
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:rounded-2xl max-w-4xl max-h-[75vh] sm:max-h-[85vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
          {!selectedYearForModal ? (
            /* ── VIEW 1: Years Table ── */
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
                        setSelectedCourseForModal(null);
                        setSelectedYearForModal(null);
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
                          selectedCourseForModal?.type === "Islamic"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {selectedCourseForModal?.type === "Islamic" ? (
                          <BookMarked className="h-2.5 w-2.5" />
                        ) : (
                          <GraduationCap className="h-2.5 w-2.5" />
                        )}
                        <span>{selectedCourseForModal?.type}</span>
                      </Badge>
                    </div>

                    <DialogTitle className="text-base sm:text-lg font-bold m-0 leading-tight text-center">
                      {selectedCourseForModal?.name}{" "}
                      <span className="font-semibold text-muted-foreground text-xs sm:text-sm">
                        ({selectedCourseForModal?.students?.length ?? selectedCourseForModal?.studentCount ?? 0})
                      </span>
                    </DialogTitle>

                    {selectedCourseForModal?.universityBoard && (
                      <p className="m-0 text-xs text-muted-foreground font-normal text-center">
                        {selectedCourseForModal.universityBoard}
                      </p>
                    )}
                    <DialogDescription className="sr-only">
                      Table showing students count of different years of selected course
                    </DialogDescription>
                  </div>

                  {/* Right: Close button */}
                  <div className="flex items-center justify-end shrink-0 min-w-[70px] sm:min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourseForModal(null);
                        setSelectedYearForModal(null);
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

              <div className="p-4 sm:p-5 pt-3">
                {courseYearsForModal.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-1">
                    <Users className="h-8 w-8 mx-auto opacity-30 mb-2" />
                    <p className="font-medium">No students enrolled in this course yet.</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-12 sm:w-16 text-center text-xs font-semibold">Sl No</TableHead>
                            <TableHead className="text-xs font-semibold">Year</TableHead>
                            <TableHead className="text-xs font-semibold text-center w-28 sm:w-36">Total Students</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {courseYearsForModal.map((yr, idx) => (
                            <TableRow
                              key={yr.year}
                              className="hover:bg-muted/50 transition-colors cursor-pointer group"
                              onClick={() => {
                                setSelectedYearForModal(yr.year);
                                setModalSearchTerm("");
                              }}
                            >
                              <TableCell className="text-center text-xs text-muted-foreground font-medium py-3 sm:py-3.5">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="py-3 sm:py-3.5 font-medium">
                                <span className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                                  {getDisplayYear(yr.year)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-3 sm:py-3.5">
                                <Badge
                                  variant="outline"
                                  className="gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20"
                                >
                                  <Users className="h-3 w-3" />
                                  <span>{yr.students.length}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 sm:py-3.5">
                                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                                  {yr.ongoingCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                      {yr.ongoingCount} Ongoing
                                    </span>
                                  )}
                                  {yr.completedCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                      {yr.completedCount} Completed
                                    </span>
                                  )}
                                  {yr.pendingCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                      {yr.pendingCount} Pending
                                    </span>
                                  )}
                                  {yr.droppedCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                      {yr.droppedCount} Dropped
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}

                          {courseYearsForModal.length > 1 && (
                            <TableRow
                              className="hover:bg-purple-50/60 dark:hover:bg-purple-950/30 transition-colors cursor-pointer group bg-purple-50/20 dark:bg-purple-950/10 border-t-2"
                              onClick={() => {
                                setSelectedYearForModal("all");
                                setModalSearchTerm("");
                              }}
                            >
                              <TableCell className="text-center text-xs text-purple-600 font-bold py-3 sm:py-3.5">
                                ★
                              </TableCell>
                              <TableCell className="py-3 sm:py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-purple-600 transition-colors">
                                    All Years
                                  </span>
                                  <span className="sm:hidden text-[10px] text-muted-foreground">
                                    All {courseYearsForModal.length} years
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-3 sm:py-3.5">
                                <Badge
                                  variant="outline"
                                  className="gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                >
                                  <Users className="h-3 w-3" />
                                  <span>{selectedCourseForModal?.students?.length || 0}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 sm:py-3.5">
                                <span className="hidden sm:inline text-xs text-muted-foreground">
                                  All enrolled students across {courseYearsForModal.length} years
                                </span>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── VIEW 2: Students in Selected Year ── */
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
                        setSelectedYearForModal(null);
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
                          selectedCourseForModal?.type === "Islamic"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {selectedCourseForModal?.type === "Islamic" ? (
                          <BookMarked className="h-2.5 w-2.5" />
                        ) : (
                          <GraduationCap className="h-2.5 w-2.5" />
                        )}
                        <span>{selectedCourseForModal?.type}</span>
                      </Badge>
                    </div>

                    <DialogTitle className="text-base sm:text-lg font-bold m-0 leading-tight text-center">
                      {selectedCourseForModal?.name}{" "}
                      <span className="text-primary font-bold">
                        {selectedYearForModal === "all" ? "(All Years)" : `- ${getDisplayYear(selectedYearForModal)}`}
                      </span>{" "}
                      <span className="font-semibold text-muted-foreground text-xs sm:text-sm">
                        ({modalFilteredStudents.length})
                      </span>
                    </DialogTitle>

                    {selectedCourseForModal?.universityBoard && (
                      <p className="m-0 text-xs text-muted-foreground font-normal text-center">
                        {selectedCourseForModal.universityBoard}
                      </p>
                    )}
                    <DialogDescription className="sr-only">
                      Students in {selectedCourseForModal?.name}
                    </DialogDescription>
                  </div>

                  {/* Right: Close button */}
                  <div className="flex items-center justify-end shrink-0 min-w-[70px] sm:min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourseForModal(null);
                        setSelectedYearForModal(null);
                        setModalSearchTerm("");
                      }}
                      className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="px-4 sm:px-5 pb-3 pt-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search students in this course…"
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background/80"
                    />
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 pt-3">
                {modalFilteredStudents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-xs">
                    {selectedCourseForModal?.students?.length === 0
                      ? "No students enrolled in this course yet."
                      : "No students found matching your search."}
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-14 text-xs font-semibold text-center">Sl No</TableHead>
                          <TableHead className="text-xs font-semibold">Student Name</TableHead>
                          <TableHead className="text-xs font-semibold">Class</TableHead>
                          {selectedYearForModal === "all" && (
                            <TableHead className="text-xs font-semibold text-center">Year</TableHead>
                          )}
                          <TableHead className="text-xs font-semibold text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modalFilteredStudents.map((st, i) => (
                          <TableRow key={`${st.studentId}-${i}`} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-center text-muted-foreground py-2.5">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-medium text-xs py-2.5">
                              <div className="font-semibold text-foreground">{st.studentName}</div>
                              {st.studentId && (
                                <div className="text-[10px] text-muted-foreground">{st.studentId}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-2.5">
                              <div className="font-medium text-foreground">{st.className || "—"}</div>
                              {st.batchName && st.batchName !== "—" && (
                                <div className="text-[10px] text-muted-foreground">{st.batchName}</div>
                              )}
                            </TableCell>
                            {selectedYearForModal === "all" && (
                              <TableCell className="text-xs py-2.5 text-center text-muted-foreground">
                                {getDisplayYear(st.year)}
                              </TableCell>
                            )}
                            <TableCell className="text-xs text-right py-2.5">
                              {st.status ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    STATUS_COLORS[st.status] || ""
                                  }`}
                                >
                                  {st.status}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
