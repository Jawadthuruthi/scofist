"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

const STATUS_COLORS = {
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
};

export default function CoursesDashboardCard({
  students = [],
  classes = [],
  batches = [],
  apiKey,
}) {
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "islamic" | "academic"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseForModal, setSelectedCourseForModal] = useState(null);
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

  // Modal filtered students
  const modalFilteredStudents = useMemo(() => {
    if (!selectedCourseForModal?.students) return [];
    if (!modalSearchTerm.trim()) return selectedCourseForModal.students;
    const q = modalSearchTerm.toLowerCase();
    return selectedCourseForModal.students.filter(
      (s) =>
        s.studentName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q)
    );
  }, [selectedCourseForModal, modalSearchTerm]);

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
              <Badge variant="outline" className="text-xs font-semibold">
                {allCourses.length} {allCourses.length === 1 ? "Course" : "Courses"}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              All courses and student enrollment counts across the institution
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link href="/dashboard/students-courses">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs hover:bg-primary/5 hover:text-primary transition-colors"
            >
              <span>Manage Courses</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* ── Metrics Banner ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="text-xs text-muted-foreground font-medium">Total Courses</div>
            <div className="text-xl font-bold mt-1 text-foreground">
              {allCourses.length}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30">
            <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
              <BookMarked className="h-3.5 w-3.5" />
              Islamic Courses
            </div>
            <div className="text-xl font-bold mt-1 text-emerald-900 dark:text-emerald-200">
              {totalIslamic}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/30">
            <div className="text-xs text-blue-800 dark:text-blue-300 font-medium flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" />
              Academic Courses
            </div>
            <div className="text-xl font-bold mt-1 text-blue-900 dark:text-blue-200">
              {totalAcademic}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Total Enrollments
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">
              {totalEnrollments}
            </div>
          </div>
        </div>

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
            <Link href="/dashboard/students-courses" className="inline-block pt-1">
              <Button size="sm" className="gap-1.5 text-xs">
                <GraduationCap className="h-3.5 w-3.5" />
                Add Course Records
              </Button>
            </Link>
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
                  <TableHead className="w-12 text-xs font-semibold text-center">#</TableHead>
                  <TableHead className="text-xs font-semibold">Course Name</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">University / Board</TableHead>
                  <TableHead className="text-xs font-semibold">Status Breakdown</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Students</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course, idx) => (
                  <TableRow
                    key={`${course.type}-${course.name}`}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="text-xs font-medium text-center text-muted-foreground py-3">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-xs sm:text-sm py-3 text-foreground">
                      {course.name}
                    </TableCell>
                    <TableCell className="py-3">
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
                    <TableCell className="text-xs text-muted-foreground py-3">
                      {course.universityBoard || "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {course.completedCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40"
                            title="Completed"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {course.completedCount} Completed
                          </span>
                        )}
                        {course.ongoingCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40"
                            title="Ongoing"
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {course.ongoingCount} Ongoing
                          </span>
                        )}
                        {course.pendingCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                            title="Pending"
                          >
                            <AlertCircle className="h-2.5 w-2.5" />
                            {course.pendingCount} Pending
                          </span>
                        )}
                        {course.studentCount === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
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
                    <TableCell className="text-right py-3">
                      {course.studentCount > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 hover:bg-muted"
                          onClick={() => {
                            setSelectedCourseForModal(course);
                            setModalSearchTerm("");
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground mr-3">—</span>
                      )}
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
        onOpenChange={(open) => !open && setSelectedCourseForModal(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-5 pb-3 border-b">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    {selectedCourseForModal?.name}
                  </DialogTitle>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      selectedCourseForModal?.type === "Islamic"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {selectedCourseForModal?.type} Course
                  </Badge>
                </div>
                <DialogDescription className="text-xs mt-1">
                  Enrolled Students ({selectedCourseForModal?.students?.length || 0})
                  {selectedCourseForModal?.universityBoard
                    ? ` • University / Board: ${selectedCourseForModal.universityBoard}`
                    : ""}
                </DialogDescription>
              </div>
            </div>

            <div className="relative pt-3">
              <Search className="absolute left-2.5 top-5.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search students in this course…"
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 pt-2">
            {modalFilteredStudents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                No students found matching your search.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10 text-xs font-semibold text-center">#</TableHead>
                      <TableHead className="text-xs font-semibold">Student Name</TableHead>
                      <TableHead className="text-xs font-semibold">Class</TableHead>
                      <TableHead className="text-xs font-semibold">Batch</TableHead>
                      <TableHead className="text-xs font-semibold">Year</TableHead>
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
                          <div>{st.studentName}</div>
                          <div className="text-[10px] text-muted-foreground">{st.studentId}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">
                          {st.className}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">
                          {st.batchName}
                        </TableCell>
                        <TableCell className="text-xs py-2.5">
                          {st.year}
                        </TableCell>
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
