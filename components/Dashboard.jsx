"use client";

import {
  useState,
  useEffect,
  useMemo,
  memo,
  Suspense,
  useCallback,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Users,
  UserCheck,
  X,
  BookOpen,
  GraduationCap,
  BarChart3,
  Calendar,
  AlertCircle,
  BarChart,
  Loader,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  BookMarked,
  Search,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart as RechartsBarChart,
  Bar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import {
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import LiteraryStudentLookup from "./LiteraryStudentLookup";
import LiterarySummaryCard from "./LiterarySummaryCard";
import { formatDateForDisplay, sortClasses, getISTDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription, DialogClose,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ===== CUSTOM HOOKS =====
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

// ===== UTILITY FUNCTIONS =====
/**
 * Calculates attendance percentage from attendance records
 * @param {Array} attendanceRecords - List of attendance records
 * @returns {Object} Object containing attendance statistics
 */
const calculateAttendancePercentage = (attendanceRecords) => {
  if (!attendanceRecords?.length) {
    return { totalMarked: 0, totalPresent: 0, percentage: 0 };
  }

  const { totalMarked, totalPresent } = attendanceRecords.reduce(
    (acc, record) => {
      const students = record.attendanceData || [];
      acc.totalMarked += students.length;
      acc.totalPresent += students.filter((s) => s.present).length;
      return acc;
    },
    { totalMarked: 0, totalPresent: 0 }
  );

  const percentage =
    totalMarked > 0
      ? parseFloat(((totalPresent / totalMarked) * 100).toFixed(2))
      : 0;

  return { totalMarked, totalPresent, percentage };
};

// ===== LOADING COMPONENTS =====
const StatCardSkeleton = memo(() => (
  <Card
    className="overflow-hidden border-l-4 border-l-muted"
    role="status"
    aria-label="Loading statistics"
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full" />
    </CardHeader>
    <CardContent className="pt-3 pb-4">
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
));
StatCardSkeleton.displayName = "StatCardSkeleton";

const StatsOverviewSkeleton = memo(() => (
  <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }, (_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
));
StatsOverviewSkeleton.displayName = "StatsOverviewSkeleton";

const ChartSkeleton = memo(({ height = "300px" }) => (
  <div
    className={`h-[${height}] bg-muted/10 rounded-lg flex items-center justify-center`}
    role="status"
    aria-label="Loading chart"
  >
    <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";

const ClassCardSkeleton = memo(() => (
  <Card
    className="overflow-hidden"
    role="status"
    aria-label="Loading class information"
  >
    <CardHeader className="pb-2 bg-muted/30">
      <Skeleton className="h-5 w-24 mb-1" />
      <Skeleton className="h-3 w-32" />
    </CardHeader>
    <CardContent className="pt-4">
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-6" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-6" />
        </div>
        <div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-2 w-full mt-1" />
        </div>
      </div>
    </CardContent>
  </Card>
));
ClassCardSkeleton.displayName = "ClassCardSkeleton";

const ClassesSkeleton = memo(() => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }, (_, i) => (
      <ClassCardSkeleton key={i} />
    ))}
  </div>
));
ClassesSkeleton.displayName = "ClassesSkeleton";

// ===== MAIN COMPONENTS =====
const StatCard = memo(({ title, value, icon: Icon, description, onClick, clickLabel, subStats }) => (
  <Card
    className={`overflow-hidden transition-all duration-300 ease-out border-l-4 border-l-primary hover:scale-105 hover:shadow-2xl hover:-translate-y-1.5 transform group${onClick ? " cursor-pointer active:scale-95" : ""}`}
    role="region"
    aria-labelledby={`stat-${title}`}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
      <div className="space-y-1">
        <CardTitle id={`stat-${title}`} className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className="text-3xl font-bold tracking-tight"
          aria-describedby={`stat-${title}-desc`}
        >
          {value}
        </div>
        {subStats && (
          <div className="flex items-center gap-3 pt-1">
            {subStats.map((s) => (
              <span key={s.label} className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="font-medium text-foreground">{s.value}</span>
                <span>{s.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 bg-primary/10 rounded-full">
        <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
    </CardHeader>
    <CardContent className="pt-3 pb-4">
      {description && (
        <p
          id={`stat-${title}-desc`}
          className="text-xs text-muted-foreground"
        >
          {description}
        </p>
      )}

    </CardContent>
  </Card>
));
StatCard.displayName = "StatCard";

const ErrorAlert = memo(({ message }) => (
  <Alert variant="destructive" className="mb-6" role="alert">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{message}</AlertDescription>
  </Alert>
));
ErrorAlert.displayName = "ErrorAlert";

// ===== CLASS CARD COMPONENT =====
const ClassCard = memo(
  ({ classData, students, batches, attendances, leaveStudents }) => {
    const [activeOpen, setActiveOpen] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const activePopupRef = useRef(null);
    const { handleDownload: handleActiveDownload } = useDownloadPopup(activePopupRef, `Active_Students_${classData.name.replace(/\s+/g, '_')}.jpeg`);

    const leavePopupRef = useRef(null);
    const { handleDownload: handleLeaveDownload } = useDownloadPopup(leavePopupRef, `Leave_Students_${classData.name.replace(/\s+/g, '_')}.jpeg`);

    const { classStudentsList, classBatch, attendanceStats } = useMemo(() => {
      const filteredStudents =
        students?.filter((student) => {
          const studentClassId =
            student.studentSpecificField?.classId?._id ||
            student.studentSpecificField?.classId ||
            student.classId?._id ||
            student.classId;
          const studentBatchId =
            student.studentSpecificField?.batchId?._id ||
            student.studentSpecificField?.batchId ||
            student.batchId?._id ||
            student.batchId;
          const targetBatchId = classData.batchId?._id || classData.batchId;
          
          const studentStatus = student.studentSpecificField?.status || student.status;

          // If classId is available, it uniquely identifies the class.
          // If not, fallback to matching both className and batchId.
          const isClassMatch = studentClassId 
            ? String(studentClassId) === String(classData._id)
            : (student.className === classData.name && String(studentBatchId) === String(targetBatchId));

          return (
            isClassMatch &&
            studentStatus === "Active"
          );
        }) || [];

      const sortedStudents = [...filteredStudents].sort((a, b) => {
        const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
        const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });

      const foundBatch = batches?.find(
        (batch) => String(batch._id) === String(classData.batchId?._id || classData.batchId)
      );

      const filteredAttendance =
        attendances?.filter(
          (attendance) => attendance.classId?._id === classData._id
        ) || [];

      const stats = calculateAttendancePercentage(filteredAttendance);

      return {
        classStudentsList: sortedStudents,
        classBatch: foundBatch,
        attendanceStats: stats,
      };
    }, [classData, students, batches, attendances]);

    const sortedLeaveStudents = useMemo(() => {
      return [...(leaveStudents || [])].sort((a, b) => {
        const idA = a.studentId?._id || a.studentId || "";
        const idB = b.studentId?._id || b.studentId || "";
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });
    }, [leaveStudents]);

    const presentStudents = classStudentsList.length - (leaveStudents?.length || 0);

    return (
      <>
        <Card
          className="overflow-hidden hover:border-primary/50 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
          role="region"
          aria-labelledby={`class-${classData._id}`}
        >
          <CardHeader 
            className="pb-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors duration-200 group/header"
            onClick={() => setActiveOpen(true)}
          >
            <div className="flex justify-between items-start w-full">
              <div>
                <CardTitle id={`class-${classData._id}`} className="text-lg group-hover/header:text-primary transition-colors">
                  {classData.name}
                </CardTitle>
                <CardDescription className="group-hover/header:text-primary/80 transition-colors">
                  {classBatch
                    ? `${classBatch.name} (${classBatch.academicYear})`
                    : "N/A"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  const header = `${classData.name}${classBatch ? ` - ${classBatch.name}` : ''}`;
                  const studentsText = classStudentsList.map((student, index) => {
                    const admnNo = student.studentSpecificField?.admissionNumber || student.admissionNumber || student._id;
                    return `${index + 1}. ${student.name} (${admnNo})`;
                  });
                  const textToCopy = [header, "", ...studentsText].join('\n');
                  navigator.clipboard.writeText(textToCopy);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                title="Copy active students"
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-sm space-y-3">
              <div 
                className="flex justify-between items-center hover:bg-muted/60 hover:text-primary cursor-pointer p-1.5 rounded-md transition-all group"
                onClick={() => setActiveOpen(true)}
              >
                <span className="text-muted-foreground group-hover:text-primary font-medium">Total Students:</span>
                <span className="font-semibold text-primary underline decoration-dotted group-hover:underline group-hover:scale-105 transition-all">
                  {classStudentsList.length}
                </span>
              </div>
              <div className="flex justify-between items-center p-1.5">
                <span className="text-muted-foreground font-medium">Present:</span>
                <span className="font-semibold">{presentStudents}</span>
              </div>
              <div 
                className="flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 cursor-pointer p-1.5 rounded-md transition-all group"
                onClick={() => setLeaveOpen(true)}
              >
                <span className="text-muted-foreground group-hover:text-red-500 font-medium">On Leave:</span>
                <span className="font-semibold text-red-500 underline decoration-dotted group-hover:underline group-hover:scale-105 transition-all">
                  {leaveStudents.length}
                </span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Today's Attendance:
                  </span>
                  <span className="font-medium">
                    {attendanceStats.percentage}%
                  </span>
                </div>
                <Progress
                  value={attendanceStats.percentage}
                  className="h-1"
                  aria-label={`Attendance: ${attendanceStats.percentage}%`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Students Popup */}
        <Dialog open={activeOpen} onOpenChange={setActiveOpen}>
          <DialogContent ref={activePopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
            <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
              <button 
                type="button"
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
                onClick={handleActiveDownload}
                title="Download Image"
                data-html2canvas-ignore="true"
              >
                <Users className="h-5 w-5 text-primary" />
              </button>
              <div className="flex-1 text-left space-y-0.5">
                <DialogTitle className="text-xl font-bold m-0">
                  Active Students
                </DialogTitle>
                <DialogDescription className="text-sm font-semibold text-muted-foreground m-0">
                  {classData.name} ({classStudentsList.length})
                </DialogDescription>
              </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
            <div className="text-sm border-0 p-4 max-h-80 overflow-y-auto bg-muted/5 space-y-1 flex-1">
              {classStudentsList.length > 0 ? (
                classStudentsList.map((student, index) => (
                  <div key={student._id} className="flex justify-between items-center py-2 px-3 border-b last:border-0 hover:bg-muted/50 rounded transition-colors">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">
                      {index + 1}. {student.name}
                    </div>
                    <div className="text-xs text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm">
                      {student._id}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-center py-6">No active students found</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Leave Students Popup */}
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent ref={leavePopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
            <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-2 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
              <button 
                type="button"
                className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus:outline-none cursor-pointer"
                onClick={handleLeaveDownload}
                title="Download Image"
                data-html2canvas-ignore="true"
              >
                <Users className="h-5 w-5 text-red-500" />
              </button>
              <div className="flex-1 text-left space-y-0.5">
                <DialogTitle className="text-xl font-bold m-0 text-red-600 dark:text-red-400">
                  On Leave Students - {classData.name}
                </DialogTitle>
                <DialogDescription className="m-0">
                Students on leave today in {classData.name} ({sortedLeaveStudents.length} students)
              </DialogDescription>
              </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
            <div className="text-sm border-0 px-4 py-1 max-h-80 overflow-y-auto bg-muted/5 flex-1">
              {sortedLeaveStudents.length > 0 ? (
                sortedLeaveStudents.map((std, index) => {
                  const student = students?.find(s => String(s._id) === String(std.studentId?._id || std.studentId));
                  const admissionNumber = student?.studentSpecificField?.admissionNumber || student?.admissionNumber || "";
                  const leaveReason = std.reason || std.leaveReason || "";
                  const displayId = std.studentId?._id || std.studentId || "";
                  return (
                    <div key={index} className="flex justify-between items-center py-0.5 px-3 border-b last:border-0 hover:bg-muted/50 rounded transition-colors">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                          {index + 1}.
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {std.studentName} {admissionNumber ? `(${admissionNumber})` : ""}
                          </span>
                          {leaveReason && (
                            <span className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">
                              {leaveReason}
                            </span>
                          )}
                        </div>
                      </div>
                      {displayId && (
                        <div className="text-xs text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm h-fit shrink-0 ml-2">
                          {displayId}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-muted-foreground text-center py-6">No students on leave today</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
ClassCard.displayName = "ClassCard";

// ===== COURSE STATUS COLORS =====
const COURSE_STATUS_COLORS = {
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
};
const STATUS_COLORS = COURSE_STATUS_COLORS;

// ===== STATS OVERVIEW COMPONENT =====
const StatsOverview = memo(({
  totalStats,
  isLoading,
  teachers,
  sortedClasses,
  batches = [],
  onClassesClick,
  dashboardData,
  isLoadingCharts,
  activeRole,
  apiKey,
}) => {
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [activeStudentsDialogOpen, setActiveStudentsDialogOpen] = useState(false);
  const [graduatedStudentsDialogOpen, setGraduatedStudentsDialogOpen] = useState(false);
  const [totalStudentsDialogOpen, setTotalStudentsDialogOpen] = useState(false);
  const [onLeaveDialogOpen, setOnLeaveDialogOpen] = useState(false);
  const [classesDialogOpen, setClassesDialogOpen] = useState(false);

  // Courses dialog states
  const [coursesDialogOpen, setCoursesDialogOpen] = useState(false);
  const [selectedCourseForModal, setSelectedCourseForModal] = useState(null);
  const [coursesFilter, setCoursesFilter] = useState("all"); // "all" | "islamic" | "academic"
  const [coursesSearchTerm, setCoursesSearchTerm] = useState("");
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [apiCourses, setApiCourses] = useState(null);

  const facultyPopupRef = useRef(null);
  const { handleDownload: handleFacultyDownload } = useDownloadPopup(facultyPopupRef, "Total_Faculty.jpeg");

  const activeStudentsPopupRef = useRef(null);
  const { handleDownload: handleActiveStudentsDownload } = useDownloadPopup(activeStudentsPopupRef, "Active_Students.jpeg");

  const graduatedStudentsPopupRef = useRef(null);
  const { handleDownload: handleGraduatedStudentsDownload } = useDownloadPopup(graduatedStudentsPopupRef, "Graduated_Students.jpeg");

  const totalStudentsPopupRef = useRef(null);
  const { handleDownload: handleTotalStudentsDownload } = useDownloadPopup(totalStudentsPopupRef, "Total_Students.jpeg");

  const onLeavePopupRef = useRef(null);
  const { handleDownload: handleOnLeaveDownload } = useDownloadPopup(onLeavePopupRef, "Students_On_Leave.jpeg");

  const classesPopupRef = useRef(null);
  const { handleDownload: handleClassesDownload } = useDownloadPopup(classesPopupRef, "Total_Classes.jpeg");

  const coursesPopupRef = useRef(null);
  const { handleDownload: handleCoursesDownload } = useDownloadPopup(coursesPopupRef, "Courses_Overview.jpeg");

  // Fetch courses from backend
  useEffect(() => {
    let isMounted = true;
    fetch("/api/courses", {
      headers: apiKey ? { "x-api-key": apiKey } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.courses) {
          setApiCourses(data.courses);
        }
      })
      .catch((err) => console.error("Error fetching courses API:", err));

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  const classMap = useMemo(() => {
    const map = new Map();
    (sortedClasses || []).forEach((c) => {
      map.set(String(c._id), c.name || c.shortname || "—");
    });
    return map;
  }, [sortedClasses]);

  const batchMap = useMemo(() => {
    const map = new Map();
    (batches || []).forEach((b) => {
      map.set(String(b._id), b.name || "—");
    });
    return map;
  }, [batches]);

  const clientAggregatedCourses = useMemo(() => {
    const courseMap = new Map();

    const getOrInitCourse = (name, type, defaultBoard = "") => {
      const cleanName = (name || "").trim();
      const key = `${type.toLowerCase()}:${cleanName.toLowerCase()}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          name: cleanName,
          type,
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

    (dashboardData?.students || []).forEach((student) => {
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
  }, [dashboardData?.students, classMap, batchMap]);

  const allCourses = useMemo(() => {
    const sourceList = apiCourses && apiCourses.length > 0 ? apiCourses : clientAggregatedCourses;
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

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      if (coursesFilter === "islamic" && course.type !== "Islamic") return false;
      if (coursesFilter === "academic" && course.type !== "Academic") return false;

      if (coursesSearchTerm.trim()) {
        const query = coursesSearchTerm.toLowerCase();
        const matchesName = course.name.toLowerCase().includes(query);
        const matchesBoard = (course.universityBoard || "").toLowerCase().includes(query);
        if (!matchesName && !matchesBoard) return false;
      }

      return true;
    });
  }, [allCourses, coursesFilter, coursesSearchTerm]);

  const modalFilteredStudents = useMemo(() => {
    if (!selectedCourseForModal?.students) return [];
    if (!modalSearchTerm.trim()) return selectedCourseForModal.students;
    const q = modalSearchTerm.toLowerCase();
    return selectedCourseForModal.students.filter(
      (s) =>
        s.studentName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.batchName?.toLowerCase().includes(q)
    );
  }, [selectedCourseForModal, modalSearchTerm]);

  const sortedTeachersLocal = useMemo(() => {
    return [...(teachers || [])].sort(
      (a, b) => new Date(a.dateOfBirth) - new Date(b.dateOfBirth)
    );
  }, [teachers]);

  if (isLoading) return <StatsOverviewSkeleton />;

  const statCards = [
    {
      title: "Total Faculty",
      value: totalStats.teachersCount,
      icon: UserCheck,
      description: "Active teaching staff",
      onClick: () => setFacultyDialogOpen(true),
      clickLabel: "Click to view faculty profiles →",
    },
    {
      title: "Active Classes",
      value: totalStats.activeClasses,
      icon: BarChart3,
      description: "Ongoing academic classes",
      onClick: () => setClassesDialogOpen(true),
      clickLabel: "Click to view classes →",
    },
    {
      title: "Active Students",
      value: totalStats.activeStudents,
      icon: BookOpen,
      description: "Currently attending classes",
      onClick: () => setActiveStudentsDialogOpen(true),
      clickLabel: "Click to view chart →",
      subStats: [
        { label: "Senior", value: totalStats.seniorActiveStudents ?? 0 },
        { label: "Junior", value: totalStats.juniorActiveStudents ?? 0 },
      ],
    },
    {
      title: "Graduated Students",
      value: totalStats.graduatedStudents,
      icon: GraduationCap,
      description: "Successfully completed program",
      onClick: () => setGraduatedStudentsDialogOpen(true),
      clickLabel: "Click to view chart →",
    },
    {
      title: "Total Students",
      value: totalStats.studentCount,
      icon: Users,
      description: "All registered students",
      onClick: () => setTotalStudentsDialogOpen(true),
      clickLabel: "Click to view statistics →",
    },
    {
      title: "On Leave",
      value: totalStats.leaveStudents,
      icon: Users,
      description: "Students currently on leave",
      onClick: () => setOnLeaveDialogOpen(true),
      clickLabel: "Click to view students →",
      subStats: [
        { label: "Senior", value: totalStats.seniorLeaveStudents ?? 0 },
        { label: "Junior", value: totalStats.juniorLeaveStudents ?? 0 },
      ],
    },
    {
      title: "Courses",
      value: allCourses.length,
      icon: BookMarked,
      description: "All Islamic & Academic courses",
      onClick: () => setCoursesDialogOpen(true),
      clickLabel: "Click to view courses →",
      subStats: [
        { label: "Islamic", value: totalIslamic },
        { label: "Academic", value: totalAcademic },
      ],
    },
  ];

  const visibleStatCards = activeRole === "Teacher"
    ? statCards.filter((card) => card.title !== "Total Students" && card.title !== "Graduated Students")
    : statCards;

  return (
    <>
      <div className={`grid gap-4 xs:grid-cols-2 md:grid-cols-3 ${activeRole === "Teacher" ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"}`}>
        {visibleStatCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Faculty Profiles */}
      <Dialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen}>
        <DialogContent ref={facultyPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <button 
              type="button"
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
              onClick={handleFacultyDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <UserCheck className="h-5 w-5 text-primary" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Faculty Profiles
              </DialogTitle>
              <DialogDescription className="m-0">
              View active teaching staff profiles
            </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {sortedTeachersLocal?.map((teacher) => {
              let assignedClass = sortedClasses?.find((c) => (c.teacherId?._id || c.teacherId) === teacher._id)?.name || "No Class Assigned";
              if (teacher.teacherSpecificField?.status === "Principal" || teacher.teacherSpecificField?.status === "Guest") {
                assignedClass = teacher.teacherSpecificField?.status;
              }
              return (
                <FacultyProfileCard
                  key={teacher._id}
                  faculty={teacher}
                  assignedClass={assignedClass}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Students Chart Dialog */}
      <Dialog open={activeStudentsDialogOpen} onOpenChange={setActiveStudentsDialogOpen}>
        <DialogContent ref={activeStudentsPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <button 
              type="button"
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
              onClick={handleActiveStudentsDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <BarChart className="h-5 w-5 text-primary" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Active Students By Class
              </DialogTitle>
              <DialogDescription className="m-0">
              Distribution of active students.
            </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="px-5 pb-5 pt-2 space-y-6">
            <ClassStudentsTable
              classes={dashboardData?.activeClasses}
              batches={dashboardData?.batches}
              students={dashboardData?.activeStudents}
            />
            <div data-html2canvas-ignore="true">
              <ClassChart
                classes={dashboardData?.activeClasses}
                batches={dashboardData?.batches}
                students={dashboardData?.activeStudents}
                isLoading={isLoadingCharts}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Graduated Students Chart Dialog */}
      <Dialog open={graduatedStudentsDialogOpen} onOpenChange={setGraduatedStudentsDialogOpen}>
        <DialogContent ref={graduatedStudentsPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <button 
              type="button"
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
              onClick={handleGraduatedStudentsDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <BarChart className="h-5 w-5 text-primary" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                <span className="sm:hidden">Graduated Students</span>
                <span className="hidden sm:inline">Graduated Students By Batch</span>
              </DialogTitle>
              <DialogDescription className="m-0">
              Distribution of graduated students.
            </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="px-5 pb-5 pt-2 space-y-6">
            <BatchStudentsTable
              batches={dashboardData?.batches}
              students={dashboardData?.graduatedStudents}
            />
            <div data-html2canvas-ignore="true">
              <BatchChart
                batches={dashboardData?.batches}
                students={dashboardData?.graduatedStudents}
                isLoading={isLoadingCharts}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Total Students Charts Dialog */}
      <Dialog open={totalStudentsDialogOpen} onOpenChange={setTotalStudentsDialogOpen}>
        <DialogContent ref={totalStudentsPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <button 
              type="button"
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
              onClick={handleTotalStudentsDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <Users className="h-5 w-5 text-primary" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Total Students
              </DialogTitle>
              <DialogDescription className="m-0">
              Student status distribution.
            </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="space-y-6 px-5 pb-5 pt-2">
            <BatchStudentsTable
              batches={dashboardData?.batches}
              students={dashboardData?.students}
              showStatusColumns={true}
            />
            <div data-html2canvas-ignore="true">
              <p className="text-sm font-medium text-muted-foreground mb-2">Status By Batch</p>
              <StudentStatusByBatchChart
                batches={dashboardData?.batches}
                students={dashboardData?.students}
                isLoading={isLoadingCharts}
              />
            </div>
            <div className="flex justify-start" data-html2canvas-ignore="true">
              <div className="w-full max-w-md">
                <p className="text-sm font-medium text-muted-foreground mb-2">Status Distribution</p>
                <div className="ml-8">
                  <StudentStatusChart
                    students={dashboardData?.students}
                    isLoading={isLoadingCharts}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* On Leave Students Dialog */}
      <Dialog open={onLeaveDialogOpen} onOpenChange={setOnLeaveDialogOpen}>
        <DialogContent ref={onLeavePopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <button 
              type="button"
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
              onClick={handleOnLeaveDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <Users className="h-5 w-5 text-primary" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Students On Leave
              </DialogTitle>
              <DialogDescription className="m-0">
              Students currently on active leave
            </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="space-y-3 p-5">
            {dashboardData?.onLeaveStudentsList?.length > 0 ? (
              Object.entries(
                dashboardData.onLeaveStudentsList.reduce((acc, student) => {
                  const className = student.className || "Unknown Class";
                  if (!acc[className]) acc[className] = [];
                  acc[className].push(student);
                  return acc;
                }, {})
              ).map(([className, students]) => (
                <div key={className} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                  <h4 className="font-semibold text-sm text-primary">{className}</h4>
                  <div className="space-y-0">
                    {students.map((student, index) => (
                      <div
                        key={student.id || index}
                        className="flex items-center justify-between py-1 px-3 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="text-sm font-medium shrink-0">
                            {index + 1}.
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium">
                              {student.name} {student.admissionNumber ? `(${student.admissionNumber})` : ""}
                            </span>
                            {student.leaveReason && (
                              <span className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">
                                {student.leaveReason}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          {student.id && (
                            <span className="text-xs text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm h-fit">
                              {student.id}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No students currently on leave</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Classes Dialog */}
      <Dialog open={classesDialogOpen} onOpenChange={setClassesDialogOpen}>
        <DialogContent ref={classesPopupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl max-w-5xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <button 
              type="button"
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
              onClick={handleClassesDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <BookOpen className="h-5 w-5 text-primary" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Classes Overview
              </DialogTitle>
              <DialogDescription className="m-0">
              informations about active classes
            </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-5">
            {dashboardData.activeClasses.map((classData) => {
              const leaveStudents = dashboardData.leaveRecords?.filter((record) => {
                const student = dashboardData.students.find(
                  (s) => String(s._id) === String(record.studentId?._id || record.studentId)
                );
                if (!student) return false;

                const studentClassId =
                  student.studentSpecificField?.classId?._id ||
                  student.studentSpecificField?.classId ||
                  student.classId?._id ||
                  student.classId;

                return String(studentClassId) === String(classData._id);
              }) || [];

              return (
                <ClassCard
                  key={classData._id}
                  classData={classData}
                  students={dashboardData.students}
                  batches={dashboardData.batches}
                  attendances={dashboardData.attendances}
                  leaveStudents={leaveStudents}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Courses Overview Dialog */}
      <Dialog open={coursesDialogOpen} onOpenChange={setCoursesDialogOpen}>
        <DialogContent
          ref={coursesPopupRef}
          data-html2canvas-popup="true"
          className="rounded-2xl sm:rounded-2xl max-w-4xl max-h-[75vh] sm:max-h-[85vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0"
        >
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <button
              type="button"
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
              onClick={handleCoursesDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <BookMarked className="h-5 w-5 text-primary" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold m-0">Courses Overview</DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold">
                  {allCourses.length} {allCourses.length === 1 ? "Course" : "Courses"}
                </Badge>
              </div>
              <DialogDescription className="m-0 text-xs">
                All courses and student enrollment counts across the institution
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2" data-html2canvas-ignore="true">
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
              <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                <X className="h-5 w-5" />
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Summary metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border bg-muted/30">
                <div className="text-xs text-muted-foreground font-medium">Total Courses</div>
                <div className="text-xl font-bold mt-1 text-foreground">{allCourses.length}</div>
              </div>
              <div className="p-3 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30">
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                  <BookMarked className="h-3.5 w-3.5" />
                  Islamic Courses
                </div>
                <div className="text-xl font-bold mt-1 text-emerald-900 dark:text-emerald-200">{totalIslamic}</div>
              </div>
              <div className="p-3 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/30">
                <div className="text-xs text-blue-800 dark:text-blue-300 font-medium flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Academic Courses
                </div>
                <div className="text-xl font-bold mt-1 text-blue-900 dark:text-blue-200">{totalAcademic}</div>
              </div>
              <div className="p-3 rounded-xl border bg-muted/30">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Total Enrollments
                </div>
                <div className="text-xl font-bold mt-1 text-foreground">{totalEnrollments}</div>
              </div>
            </div>

            {/* Filter buttons & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-html2canvas-ignore="true">
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border text-xs">
                <button
                  type="button"
                  onClick={() => setCoursesFilter("all")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    coursesFilter === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({allCourses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCoursesFilter("islamic")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                    coursesFilter === "islamic"
                      ? "bg-background text-emerald-700 dark:text-emerald-300 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookMarked className="h-3 w-3" />
                  Islamic ({totalIslamic})
                </button>
                <button
                  type="button"
                  onClick={() => setCoursesFilter("academic")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                    coursesFilter === "academic"
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
                  value={coursesSearchTerm}
                  onChange={(e) => setCoursesSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* Courses Table */}
            {allCourses.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-xl p-6 bg-muted/10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">No Courses Recorded Yet</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    No Islamic or Academic courses have been recorded yet. Manage courses to add courses and enroll students.
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
                        className="hover:bg-muted/40 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (course.studentCount > 0) {
                            setSelectedCourseForModal(course);
                            setModalSearchTerm("");
                          }
                        }}
                      >
                        <TableCell className="text-xs font-medium text-center text-muted-foreground py-3">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-xs sm:text-sm py-3 text-foreground group-hover:text-primary transition-colors">
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
                        <TableCell className="text-right py-3" onClick={(e) => e.stopPropagation()}>
                          {course.studentCount > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Students in Selected Course Dialog */}
      <Dialog
        open={!!selectedCourseForModal}
        onOpenChange={(open) => {
          if (!open) setSelectedCourseForModal(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:rounded-2xl max-w-2xl max-h-[75vh] sm:max-h-[85vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {selectedCourseForModal?.type === "Islamic" ? (
                <BookMarked className="h-5 w-5" />
              ) : (
                <GraduationCap className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold m-0 truncate">
                  {selectedCourseForModal?.name}
                </DialogTitle>
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${
                    selectedCourseForModal?.type === "Islamic"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  }`}
                >
                  {selectedCourseForModal?.type} Course
                </Badge>
              </div>
              <DialogDescription className="m-0 text-xs">
                Enrolled Students ({selectedCourseForModal?.students?.length || 0})
                {selectedCourseForModal?.universityBoard
                  ? ` • University / Board: ${selectedCourseForModal.universityBoard}`
                  : ""}
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="p-4 pb-2 border-b bg-background">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search students by name, ID, class, or batch…"
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-2">
            {modalFilteredStudents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                No students found matching your search.
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
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
                          <div className="font-semibold text-foreground">{st.studentName}</div>
                          {st.studentId && (
                            <div className="text-[10px] text-muted-foreground">{st.studentId}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">
                          {st.className}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">
                          {st.batchName}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-muted-foreground">
                          {st.year}
                        </TableCell>
                        <TableCell className="text-xs text-right py-2.5">
                          {st.status && st.status !== "—" ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                STATUS_COLORS[st.status] || "bg-muted text-foreground border-border"
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
    </>
  );
});
StatsOverview.displayName = "StatsOverview";

// ===== BATCH STUDENTS TABLE COMPONENT =====
const BatchStudentsTable = memo(({ batches = [], students = [], showStatusColumns = false }) => {
  const tableData = useMemo(() => {
    if (!batches?.length || !students?.length) return [];
    
    return batches
      .map((batch) => {
        const batchStudents = students.filter((student) => student.batchId === batch._id);
        const count = batchStudents.length;
        
        if (showStatusColumns) {
          const active = batchStudents.filter((s) => s.status === "Active").length;
          const graduated = batchStudents.filter((s) => s.status === "Graduated").length;
          // Match variations like "Dropedout", "Dropped Out", etc.
          const droppedOut = batchStudents.filter((s) => s.status?.toLowerCase().includes("drop")).length;
          return { name: batch.name, academicYear: batch.academicYear, count, active, graduated, droppedOut };
        }
        
        return { name: batch.name, academicYear: batch.academicYear, count };
      })
      .filter((item) => item.count > 0);
  }, [batches, students, showStatusColumns]);

  if (!tableData.length) return null;

  const totalStudents = tableData.reduce((sum, item) => sum + item.count, 0);
  const totalActive = showStatusColumns ? tableData.reduce((sum, item) => sum + item.active, 0) : 0;
  const totalGraduated = showStatusColumns ? tableData.reduce((sum, item) => sum + item.graduated, 0) : 0;
  const totalDroppedOut = showStatusColumns ? tableData.reduce((sum, item) => sum + item.droppedOut, 0) : 0;

  const cellPadding = showStatusColumns ? "px-3.5 py-2 text-xs" : "px-5 py-2.5";

  return (
    <div className={`border rounded-md overflow-x-auto w-full`}>
      <table className={`w-full text-sm text-left`}>
        <thead className="bg-muted text-muted-foreground text-xs uppercase sticky top-0 z-10 shadow-sm bg-muted/95 backdrop-blur">
          <tr>
            <th className={`${cellPadding} font-medium border-b whitespace-nowrap`}>Sl No</th>
            <th className={`${cellPadding} font-medium border-b`}>Batch</th>
            {showStatusColumns ? (
              <>
                <th className={`${cellPadding} font-medium border-b text-center`}>Active</th>
                <th className={`${cellPadding} font-medium border-b text-center`}>Graduated</th>
                <th className={`${cellPadding} font-medium border-b text-center whitespace-nowrap`}>Drop Out</th>
                <th className={`${cellPadding} font-medium border-b text-center`}>Total</th>
              </>
            ) : (
              <th className={`${cellPadding} font-medium border-b text-center`}>Students</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {tableData.map((row, index) => (
            <tr key={index} className="hover:bg-muted/50 transition-colors">
              <td className={cellPadding}>{index + 1}</td>
              <td className={`${cellPadding} font-medium whitespace-nowrap`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                  <span>{row.name}</span>
                  {row.academicYear && (
                    <span className="text-xs text-muted-foreground font-normal">
                      ({row.academicYear})
                    </span>
                  )}
                </div>
              </td>
              {showStatusColumns ? (
                <>
                  <td className={`${cellPadding} text-center`}>{row.active}</td>
                  <td className={`${cellPadding} text-center`}>{row.graduated}</td>
                  <td className={`${cellPadding} text-center`}>{row.droppedOut}</td>
                  <td className={`${cellPadding} text-center font-medium`}>{row.count}</td>
                </>
              ) : (
                <td className={`${cellPadding} text-center`}>{row.count}</td>
              )}
            </tr>
          ))}
          <tr className="bg-muted/30 font-bold">
            <td className={`${cellPadding} border-t`} colSpan={2}>Total</td>
            {showStatusColumns ? (
              <>
                <td className={`${cellPadding} border-t text-center`}>{totalActive}</td>
                <td className={`${cellPadding} border-t text-center`}>{totalGraduated}</td>
                <td className={`${cellPadding} border-t text-center`}>{totalDroppedOut}</td>
                <td className={`${cellPadding} border-t text-center`}>{totalStudents}</td>
              </>
            ) : (
              <td className={`${cellPadding} border-t text-center`}>{totalStudents}</td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
});
BatchStudentsTable.displayName = "BatchStudentsTable";

// ===== BATCH CHART COMPONENT =====
const BatchChart = memo(({ batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    const calculatedWidth = Math.min(40, Math.max(25, Math.floor(vw * 0.03)));
    setBarWidth(calculatedWidth);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const chartData = useMemo(() => {
    if (!batches?.length || !students?.length) return [];

    return batches
      .map((batch) => ({
        name: batch.name,
        students: students.filter((student) => student.batchId === batch._id)
          .length,
      }))
      .filter((item) => item.students > 0);
  }, [batches, students]);

  if (isLoading) return <ChartSkeleton />;

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-gray-500">No batch data available</p>
      </div>
    );
  }

  const BAR_GAP = 20;
  const CHART_PADDING = 70;
  const totalWidth = Math.max(
    300,
    (barWidth + BAR_GAP) * chartData.length + CHART_PADDING
  );

  return (
    <div className="h-64 max-w-full overflow-x-auto overflow-y-hidden rounded-md">
      <div style={{ width: `${totalWidth}px`, height: "290px" }}>
        <ResponsiveContainer width="100%" height={290}>
          <RechartsBarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
            barSize={barWidth}
            barGap={0}
            barCategoryGap={BAR_GAP}
          >
            <XAxis
              dataKey="name"
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [`${value} students`, name]}
              labelFormatter={(label) => `Batch: ${label}`}
            />
            <Legend />
            <Bar
              dataKey="students"
              name="Number of Students"
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="students" position="inside" fill="#ffffff" />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
BatchChart.displayName = "BatchChart";

// ===== CLASS STUDENTS TABLE COMPONENT =====
const ClassStudentsTable = memo(({ classes = [], batches = [], students = [] }) => {
  const tableData = useMemo(() => {
    if (!classes?.length || !students?.length) return [];
    
    return classes
      .map((cls) => {
        const classStudents = students.filter((student) => {
          const studentClassId =
            student.studentSpecificField?.classId?._id ||
            student.studentSpecificField?.classId ||
            student.classId?._id ||
            student.classId;
          const studentBatchId =
            student.studentSpecificField?.batchId?._id ||
            student.studentSpecificField?.batchId ||
            student.batchId?._id ||
            student.batchId;
          const targetBatchId = cls.batchId?._id || cls.batchId;
          
          return studentClassId 
            ? String(studentClassId) === String(cls._id)
            : (student.className === cls.name && String(studentBatchId) === String(targetBatchId));
        });
        
        const count = classStudents.length;
        const classBatch = batches?.find((b) => String(b._id) === String(cls.batchId?._id || cls.batchId));
        const batchName = classBatch ? classBatch.name : "";
        
        return { name: cls.name, batchName, count };
      })
      .filter((item) => item.count > 0);
  }, [classes, batches, students]);

  if (!tableData.length) return null;

  const totalStudents = tableData.reduce((sum, item) => sum + item.count, 0);
  const cellPadding = "px-3.5 py-2 text-xs";

  return (
    <div className={`border rounded-md overflow-x-auto w-full`}>
      <table className={`w-full text-sm text-left`}>
        <thead className="bg-muted text-muted-foreground text-xs uppercase sticky top-0 z-10 shadow-sm bg-muted/95 backdrop-blur">
          <tr>
            <th className={`${cellPadding} font-medium border-b whitespace-nowrap`}>Sl No</th>
            <th className={`${cellPadding} font-medium border-b`}>Class</th>
            <th className={`${cellPadding} font-medium border-b text-center`}>Students</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tableData.map((row, index) => (
            <tr key={index} className="hover:bg-muted/50 transition-colors">
              <td className={cellPadding}>{index + 1}</td>
              <td className={`${cellPadding} font-medium whitespace-nowrap`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                  <span>{row.name}</span>
                  {row.batchName && (
                    <span className="text-xs text-muted-foreground font-normal">
                      ({row.batchName})
                    </span>
                  )}
                </div>
              </td>
              <td className={`${cellPadding} text-center`}>{row.count}</td>
            </tr>
          ))}
          <tr className="bg-muted/30 font-bold">
            <td className={`${cellPadding} border-t`} colSpan={2}>Total</td>
            <td className={`${cellPadding} border-t text-center`}>{totalStudents}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
ClassStudentsTable.displayName = "ClassStudentsTable";

// ===== CLASS CHART COMPONENT =====
const ClassChart = memo(({ classes = [], batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    const calculatedWidth = Math.min(40, Math.max(25, Math.floor(vw * 0.03)));
    setBarWidth(calculatedWidth);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const chartData = useMemo(() => {
    if (!classes?.length || !students?.length) return [];

    return classes
      .map((cls) => {
        const classStudents = students.filter((student) => {
          const studentClassId =
            student.studentSpecificField?.classId?._id ||
            student.studentSpecificField?.classId ||
            student.classId?._id ||
            student.classId;
          const studentBatchId =
            student.studentSpecificField?.batchId?._id ||
            student.studentSpecificField?.batchId ||
            student.batchId?._id ||
            student.batchId;
          const targetBatchId = cls.batchId?._id || cls.batchId;
          
          return studentClassId 
            ? String(studentClassId) === String(cls._id)
            : (student.className === cls.name && String(studentBatchId) === String(targetBatchId));
        });
        
        const classBatch = batches?.find((b) => String(b._id) === String(cls.batchId?._id || cls.batchId));
        const batchName = classBatch ? classBatch.name : "";
        const fullName = `${cls.name} ${batchName ? `(${batchName})` : ''}`;
        
        return {
          name: cls.shortname || cls.name,
          fullName,
          students: classStudents.length,
        };
      })
      .filter((item) => item.students > 0);
  }, [classes, batches, students]);

  if (isLoading) return <ChartSkeleton />;

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-gray-500">No class data available</p>
      </div>
    );
  }

  const BAR_GAP = 20;
  const CHART_PADDING = 70;
  const totalWidth = Math.max(
    300,
    (barWidth + BAR_GAP) * chartData.length + CHART_PADDING
  );

  return (
    <div className="h-64 max-w-full overflow-x-auto overflow-y-hidden rounded-md">
      <div style={{ width: `${totalWidth}px`, height: "290px" }}>
        <ResponsiveContainer width="100%" height={290}>
          <RechartsBarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
            barSize={barWidth}
            barGap={0}
            barCategoryGap={BAR_GAP}
          >
            <XAxis
              dataKey="name"
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [`${value} students`, name]}
              labelFormatter={(label, payload) => {
                const fullName = payload?.[0]?.payload?.fullName || label;
                return `Class: ${fullName}`;
              }}
            />
            <Legend />
            <Bar
              dataKey="students"
              name="Number of Students"
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="students" position="inside" fill="#ffffff" />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
ClassChart.displayName = "ClassChart";

// ===== STUDENT STATUS CHART COMPONENT =====
const StudentStatusChart = memo(({ students, isLoading }) => {
  const statusData = useMemo(() => {
    if (!students?.length) return [];

    const statusCount = students.reduce((acc, student) => {
      const status = student.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
    }));
  }, [students]);

  if (isLoading) return <ChartSkeleton />;

  if (!statusData.length) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-muted-foreground">
          No student status data available
        </p>
      </div>
    );
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {statusData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, "Students"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
StudentStatusChart.displayName = "StudentStatusChart";

import FacultyProfileCard from "./FacultyProfileCard";
import StudentStatusByBatchChart from "./StudentStatusByBatchChart";

// ===== LAZY TIMETABLE COMPONENT =====
const LazyTimeTable = memo(
  ({
    apiKey,
    activeRole,
    timeTable,
    periods,
    attendances,
    classes,
    teachersLeaveRecord,
    useShortName = false,
    hideEmptyClassRows = false,
    settings,
    date,
  }) => (
    <Suspense fallback={<ChartSkeleton height="400px" />}>
      <TimeTableComponent
        apiKey={apiKey}
        hidePrintButton={true}
        role={activeRole}
        timeTable={timeTable}
        periods={periods}
        attendances={attendances}
        classes={classes}
        teachersLeaveRecord={teachersLeaveRecord}
        useShortName={useShortName}
        hideEmptyClassRows={hideEmptyClassRows}
        settings={settings}
        date={date}
      />
    </Suspense>
  )
);
LazyTimeTable.displayName = "LazyTimeTable";

// ===== MAIN DASHBOARD COMPONENT =====
export default function Dashboard({
  apiKey,
  classes = [],
  batches = [],
  teachers = [],
  timeTable = [],
  periods = [],
  attendances = [],
  leaveRecords = [],
  teachersLeaveRecord = [],
  settings = {},
  activeRole,
}) {
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const isClient = useIsClient();


  
  const currentDateObj = useMemo(() => dateParam ? new Date(dateParam) : getISTDate(), [dateParam]);
  const currentDateStr = useMemo(() => formatDateForDisplay(currentDateObj), [currentDateObj]);
  const dateYYYYMMDD = useMemo(() => currentDateObj.toISOString().split("T")[0], [currentDateObj]);

  const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
  const { useFetchItems: useFetchTeachersLeaveRecord } = useCrud("teachers-leave-record", apiKey);
  
  const fetchStudentsQuery = useFetchStudents(
    0,
    0,
    { roles: ["Student"] },
    {
      staleTime: 60000,
      refetchOnWindowFocus: false,
    }
  );
  
  const teachersLeaveRecordQuery = useFetchTeachersLeaveRecord(0, 0, { date: dateYYYYMMDD });
  const liveTeachersLeaveRecord = useMemo(() => {
    return teachersLeaveRecordQuery.data?.teachersLeaveRecord || teachersLeaveRecord;
  }, [teachersLeaveRecordQuery.data?.teachersLeaveRecord, teachersLeaveRecord]);

  // Optimized students data using useMemo
  const students = useMemo(() => {
    return fetchStudentsQuery?.data?.users || [];
  }, [fetchStudentsQuery?.data?.users]);

  // Derive loading states
  const isLoadingStudents =
    fetchStudentsQuery.isLoading || fetchStudentsQuery.isFetching;
  const isLoadingStats = isLoadingStudents;
  const isLoadingCharts = isLoadingStudents;

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => sortClasses(a, b));
  }, [classes]);

  // Memoized dashboard data
  const dashboardData = useMemo(() => {
    const activeStudents = students.filter(
      (student) => (student.studentSpecificField?.status || student.status) === "Active"
    );
    const graduatedStudents = students.filter(
      (student) => (student.studentSpecificField?.status || student.status) === "Graduated"
    );
    const activeBatches =
      batches?.filter((batch) => ["Active", "Activated", "Acivated"].includes(batch.status)) || [];
    const activeBatchIds = new Set(activeBatches.map(b => String(b._id)));
    const activeClasses = sortedClasses
      .filter((cls) => {
        const clsBatchId = cls.batchId?._id || cls.batchId;
        const isBatchActive = activeBatchIds.has(String(clsBatchId));
        const isClassActive = cls.status === "Active" || !cls.status;
        return isBatchActive && isClassActive;
      })
      .sort((a, b) =>
        String(a._id || "").localeCompare(String(b._id || ""), undefined, {
          numeric: true,
        })
      );

    // Build classId -> section map for Senior/Junior Da-awa breakdowns
    const classIdToSection = {};
    sortedClasses.forEach((cls) => {
      if (cls._id && cls.section) {
        classIdToSection[String(cls._id)] = cls.section;
      }
    });

    const getStudentSection = (student) => {
      const classId =
        student.studentSpecificField?.classId?._id ||
        student.studentSpecificField?.classId ||
        student.classId?._id ||
        student.classId ||
        "";
      return classIdToSection[String(classId)] || "";
    };

    const seniorActiveStudents = activeStudents.filter(
      (s) => getStudentSection(s) === "Senior Da-awa"
    ).length;
    const juniorActiveStudents = activeStudents.filter(
      (s) => getStudentSection(s) === "Junior Da-awa"
    ).length;

    const onLeaveFilter = (student) => {
      const studentLeaves = leaveRecords.filter(
        (record) => String(record.studentId?._id || record.studentId) === String(student._id)
      );
      return studentLeaves.some(record => !record.arrivedDate);
    };

    const onLeaveStudentsAll = students.filter(onLeaveFilter);
    const seniorLeaveStudents = onLeaveStudentsAll.filter(
      (s) => getStudentSection(s) === "Senior Da-awa"
    ).length;
    const juniorLeaveStudents = onLeaveStudentsAll.filter(
      (s) => getStudentSection(s) === "Junior Da-awa"
    ).length;

    return {
      students,
      batches,
      classes: sortedClasses,
      activeClasses,
      teachers,
      activeStudents,
      graduatedStudents,
      attendances,
      leaveRecords,
      totalStats: {
        studentCount:
          fetchStudentsQuery.data?.pagination?.total || students.length,
        teachersCount: teachers.length,
        activeStudents: activeStudents.length,
        graduatedStudents: graduatedStudents.length,
        activeClasses: activeClasses.length,
        leaveStudents: onLeaveStudentsAll.length,
        seniorActiveStudents,
        juniorActiveStudents,
        seniorLeaveStudents,
        juniorLeaveStudents,
      },
        onLeaveStudentsList: onLeaveStudentsAll
          .map(student => {
            const studentLeaves = leaveRecords.filter(
              (record) => String(record.studentId?._id || record.studentId) === String(student._id)
            );
            const activeLeave = studentLeaves.find(record => !record.arrivedDate);
            const studentClassId = student.studentSpecificField?.classId?._id || student.studentSpecificField?.classId || student.classId?._id || student.classId || "";
            return {
              id: student._id,
              name: student.studentName || student.name || student.username || "Unknown",
              className: student.className || "N/A",
              classId: studentClassId,
              admissionNumber: student.studentSpecificField?.admissionNumber || student.admissionNumber || "",
              leaveReason: activeLeave?.reason || activeLeave?.leaveReason || "",
            };
          })
          .sort((a, b) => {
            const classIdA = String(a.classId || "");
            const classIdB = String(b.classId || "");
            let classCompare = classIdA.localeCompare(classIdB, undefined, { numeric: true });
            
            if (classCompare !== 0) {
              return classCompare;
            }
            
            const idA = a.admissionNumber || a.id || "";
            const idB = b.admissionNumber || b.id || "";
            return String(idA).localeCompare(String(idB), undefined, { numeric: true });
          }),
    };
  }, [
    students,
    batches,
    sortedClasses,
    teachers,
    attendances,
    leaveRecords,
    fetchStudentsQuery.data,
  ]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  // Error handling
  useEffect(() => {
    if (fetchStudentsQuery.error) {
      console.error("API Error:", fetchStudentsQuery.error);
      setError("An error occurred while fetching data. Please try again.");
    } else {
      setError(null);
    }
  }, [fetchStudentsQuery.error]);

  const hasClasses = classes.length > 0;

  if (activeRole === "Literary Leader") {
    return (
      <div className="flex flex-col space-y-4">
        <Header
          title="DASHBOARD"
          subTitle={currentDateStr}
          icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          className="mb-0 pb-0"
        />
        <LiteraryStudentLookup apiKey={apiKey} />
        <LiterarySummaryCard apiKey={apiKey} />
      </div>
    );
  }
  if (activeRole === "Program Committee" || activeRole === "Program Leader") {
    return (
      <div className="flex flex-col space-y-6">
        <Header
          title="DASHBOARD"
          subTitle={currentDateStr}
          icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
        />
      </div>
    );
  }

  // Check for Org Admin Committee Poster
  // Check for Org Admin Committee Poster
  if (activeRole === "Org Admin") {
    const committeePosters = settings?.org?.committeePosters || [];
    // Sort by year descending
    const sortedPosters = useMemo(() => {
      return [...committeePosters].sort((a, b) => b.year.toString().localeCompare(a.year.toString()));
    }, [committeePosters]);

    const [posterIndex, setPosterIndex] = useState(0);

    const currentPoster = sortedPosters[posterIndex];

    const handleNext = () => {
      if (posterIndex > 0) {
        setPosterIndex(prev => prev - 1);
      }
    };

    const handlePrev = () => {
      if (posterIndex < sortedPosters.length - 1) {
        setPosterIndex(prev => prev + 1);
      }
    };

    if (currentPoster) {
      return (
        <div className="flex flex-col space-y-4">
          <Header
            title="DASHBOARD"
            subTitle={currentDateStr}
            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          />

          <div className="flex items-center justify-center space-x-4">
            <div className="w-[180px]">
              <Select
                value={posterIndex.toString()}
                onValueChange={(value) => setPosterIndex(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {sortedPosters.map((poster, index) => (
                    <SelectItem key={poster.year} value={index.toString()}>
                      Year {poster.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full flex items-center justify-center relative rounded-lg overflow-hidden h-[60vh] md:h-[85vh]">
            <div className="relative w-full h-full">
              <Image
                src={currentPoster.poster.url}
                alt={`Committee Poster ${currentPoster.year}`}
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </div>


        </div>
      );
    } else {
      return (
        <div className="flex flex-col space-y-6">
          <Header
            title="DASHBOARD"
            subTitle={currentDateStr}
            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          />
          <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center p-4 text-center space-y-4">
            <div className="bg-muted p-6 rounded-full">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">No Committee Poster Found</h2>
            <p className="text-muted-foreground max-w-md">
              Please go to Settings to upload a committee poster for the current
              year. The latest poster will be displayed here.
            </p>
          </div>
        </div>
      );
    }
  }

  const showTimeTable =
    isClient &&
    activeRole &&
    ["Teacher", "College Admin", "Org Admin"].includes(activeRole) &&
    settings?.general?.isWorkingDay;

  const sortedTeachers = useMemo(() => {
    return teachers?.sort(
      (a, b) => new Date(a.dateOfBirth) - new Date(b.dateOfBirth)
    );
  }, [teachers]);

  return (
    <div className="flex flex-col">
      <Header
        title="DASHBOARD"
        subTitle={currentDateStr}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      {error && <ErrorAlert message={error} />}

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >

        <TabsContent value="overview" className="space-y-6">
          {/* TimeTable Section */}
          {showTimeTable && (
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 gap-3">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Today's Schedule</span>
                  </CardTitle>
                  <CardDescription>
                    View scheduled classes for Today
                  </CardDescription>
                </div>
                
                {/* Navigation buttons for College Admin */}
                {activeRole === "College Admin" && (
                  <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden shrink-0 self-start md:self-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none hover:bg-muted"
                      onClick={() => {
                        const prevDate = new Date(currentDateObj);
                        prevDate.setDate(prevDate.getDate() - 1);
                        router.push(`/dashboard?date=${prevDate.toISOString().split("T")[0]}`);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="py-1.5 px-3 md:px-6 text-sm md:text-base font-medium whitespace-nowrap text-center min-w-[120px]">
                      {currentDateStr}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none hover:bg-muted"
                      disabled={dateYYYYMMDD === getISTDate().toISOString().split("T")[0]}
                      onClick={() => {
                        const nextDate = new Date(currentDateObj);
                        nextDate.setDate(nextDate.getDate() + 1);
                        router.push(`/dashboard?date=${nextDate.toISOString().split("T")[0]}`);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <LazyTimeTable
                  apiKey={apiKey}
                  activeRole={activeRole}
                  timeTable={timeTable}
                  periods={periods}
                  attendances={attendances}
                  classes={dashboardData.activeClasses}
                  teachersLeaveRecord={liveTeachersLeaveRecord}
                  useShortName={true}
                  hideEmptyClassRows={false}
                  settings={settings}
                  date={dateYYYYMMDD}
                />
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <StatsOverview
            totalStats={dashboardData.totalStats}
            isLoading={isLoadingStats}
            teachers={teachers}
            sortedClasses={sortedClasses}
            batches={batches}
            apiKey={apiKey}
            onClassesClick={() => setActiveTab("classes")}
            dashboardData={dashboardData}
            isLoadingCharts={isLoadingCharts}
            activeRole={activeRole}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
