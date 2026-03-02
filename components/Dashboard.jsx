"use client";

import {
  useState,
  useEffect,
  useMemo,
  memo,
  Suspense,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  BarChart3,
  Calendar,
  AlertCircle,
  BarChart,
  Loader,
  ChevronLeft,
  ChevronRight,
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
import Image from "next/image";
import { useRouter } from "next/navigation";

import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import LiteraryStudentLookup from "./LiteraryStudentLookup";
import LiterarySummaryCard from "./LiterarySummaryCard";
import { formatDateForDisplay } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "@/components/ui/button";
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
    className="overflow-hidden"
    role="status"
    aria-label="Loading statistics"
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </CardHeader>
    <CardContent className="pt-4">
      <Skeleton className="h-7 w-14 mb-1" />
      <Skeleton className="h-3 w-24" />
    </CardContent>
  </Card>
));
StatCardSkeleton.displayName = "StatCardSkeleton";

const StatsOverviewSkeleton = memo(() => (
  <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }, (_, i) => (
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
const StatCard = memo(({ title, value, icon: Icon, description }) => (
  <Card
    className="overflow-hidden"
    role="region"
    aria-labelledby={`stat-${title}`}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
      <CardTitle id={`stat-${title}`} className="text-sm font-medium">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
    </CardHeader>
    <CardContent className="pt-4">
      <div
        className="text-2xl font-bold"
        aria-describedby={`stat-${title}-desc`}
      >
        {value}
      </div>
      {description && (
        <p
          id={`stat-${title}-desc`}
          className="text-xs text-muted-foreground mt-1"
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
    const [open, setOpen] = useState(false);
    const { classStudents, classBatch, attendanceStats } = useMemo(() => {
      const filteredStudents =
        students?.filter(
          (student) =>
            student.className === classData.name && student.status === "Active"
        ).length || 0;

      const foundBatch = batches?.find(
        (batch) => batch._id === classData.batchId
      );

      const filteredAttendance =
        attendances?.filter(
          (attendance) => attendance.classId?._id === classData._id
        ) || [];

      const stats = calculateAttendancePercentage(filteredAttendance);

      return {
        classStudents: filteredStudents,
        classBatch: foundBatch,
        attendanceStats: stats,
      };
    }, [classData, students, batches, attendances]);

    const presentStudents = classStudents - (leaveStudents?.length || 0);

    return (
      <>
        <Card
          className="overflow-hidden hover:border-primary/50 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
          role="region"
          aria-labelledby={`class-${classData._id}`}
          onClick={() => setOpen(true)}
        >
          <CardHeader className="pb-2 bg-muted/30">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle id={`class-${classData._id}`} className="text-lg">
                  {classData.name}
                </CardTitle>
                <CardDescription>
                  {classBatch
                    ? `${classBatch.name} (${classBatch.academicYear})`
                    : "N/A"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Students:</span>
                <span className="font-medium">{classStudents || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Present:</span>
                <span className="font-medium">{presentStudents || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">On Leave:</span>
                <span className="font-medium">{leaveStudents.length}</span>
              </div>
              <div className="space-y-1">
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Absentees</DialogTitle>
              <DialogDescription>
                {classData.name}'s absentees'
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm">
              {leaveStudents.map((std, index) => (
                <div id={`classIndex - ${index}`}>
                  {index + 1}. {std.studentName}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
ClassCard.displayName = "ClassCard";

// ===== STATS OVERVIEW COMPONENT =====
const StatsOverview = memo(({ totalStats, isLoading }) => {
  if (isLoading) return <StatsOverviewSkeleton />;

  const statCards = [
    {
      title: "Total Faculty",
      value: totalStats.teachersCount,
      icon: UserCheck,
      description: "Active teaching staff",
    },
    {
      title: "Active Batches",
      value: totalStats.activeBatches,
      icon: BarChart3,
      description: "Ongoing academic batches",
    },
    {
      title: "Active Students",
      value: totalStats.activeStudents,
      icon: BookOpen,
      description: "Currently attending classes",
    },
    {
      title: "Graduated Students",
      value: totalStats.graduatedStudents,
      icon: GraduationCap,
      description: "Successfully completed program",
    },
    {
      title: "On Leave",
      value: totalStats.leaveStudents,
      icon: Users,
      description: "Students currently on leave",
    },
  ];

  return (
    <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
});
StatsOverview.displayName = "StatsOverview";

// ===== BATCH CHART COMPONENT =====
const BatchChart = memo(({ batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    const calculatedWidth = Math.max(30, Math.floor(vw * 0.05));
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
  const isClient = useIsClient();

  // Data fetching hook
  const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
  const fetchStudentsQuery = useFetchStudents(
    0,
    0,
    { roles: ["Student"] },
    {
      staleTime: 60000,
      refetchOnWindowFocus: false,
    }
  );

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
    const classOrder = [
      "PLUS ONE A",
      "PLUS ONE B",
      "PLUS TWO",
      "DEGREE FIRST YEAR",
      "DEGREE SECOND YEAR",
      "DEGREE THIRD YEAR",
      "PG FIRST YEAR",
      "PG SECOND YEAR",
      "8TH STD",
      "9TH STD",
      "10TH STD",
    ].map((name) => name.replace(/\s/g, ""));

    return [...classes].sort((a, b) => {
      const nameA = a.name.trim().toUpperCase().replace(/\s/g, "");
      const nameB = b.name.trim().toUpperCase().replace(/\s/g, "");
      const indexA = classOrder.indexOf(nameA);
      const indexB = classOrder.indexOf(nameB);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) {
        return -1;
      }
      if (indexB !== -1) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [classes]);

  // Memoized dashboard data
  const dashboardData = useMemo(() => {
    const activeStudents = students.filter(
      (student) => student.status === "Active"
    );
    const graduatedStudents = students.filter(
      (student) => student.status === "Graduated"
    );
    const activeBatches =
      batches?.filter((batch) => batch.status === "Active") || [];

    return {
      students,
      batches,
      classes: sortedClasses,
      teachers,
      activeStudents,
      graduatedStudents,
      attendances,
      totalStats: {
        studentCount:
          fetchStudentsQuery.data?.pagination?.total || students.length,
        teachersCount: teachers.length,
        activeStudents: activeStudents.length,
        graduatedStudents: graduatedStudents.length,
        activeBatches: activeBatches.length,
        leaveStudents: students.filter(student => {
          const studentLeaves = leaveRecords.filter(
            (record) => String(record.studentId?._id || record.studentId) === String(student._id)
          );
          return studentLeaves.some(record => {
            if (record.arrivedDate) return false;
            const arrivalDate = new Date(record.dateOfArrival);
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            arrivalDate.setHours(0, 0, 0, 0);
            // It is active if no arrivedDate (pending) OR if overdue
            // The logic from LeaveRegister: 
            // if arrivedDate -> completed
            // else if currentDate > arrivalDate -> overdue (which is active)
            // else -> pending (which is active)
            // So basicaly if !arrivedDate, it is active.
            return !record.arrivedDate;
          });
        }).length,
      },
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

  const currentDate = formatDateForDisplay(new Date());
  const hasClasses = classes.length > 0;

  if (activeRole === "Literary Leader") {
    return (
      <div className="flex flex-col space-y-4">
        <Header
          title="DASHBOARD"
          subTitle={currentDate}
          icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          className="mb-0 pb-0"
        />
        <LiterarySummaryCard apiKey={apiKey} />
        <LiteraryStudentLookup apiKey={apiKey} />
      </div>
    );
  }
  if (activeRole === "Program Committee" || activeRole === "Program Leader") {
    return (
      <div className="flex flex-col space-y-6">
        <Header
          title="DASHBOARD"
          subTitle={currentDate}
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
            subTitle={currentDate}
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
            subTitle={currentDate}
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
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      {error && <ErrorAlert message={error} />}

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="overview" className="px-6">
            Overview
          </TabsTrigger>
          <TabsTrigger value="classes" className="px-6">
            Classes
          </TabsTrigger>
          <TabsTrigger value="charts" className="px-6">
            Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* TimeTable Section */}
          {showTimeTable && (
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Today's Schedule</span>
                </CardTitle>
                <CardDescription>
                  View Today's scheduled classes
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <LazyTimeTable
                  apiKey={apiKey}
                  activeRole={activeRole}
                  timeTable={timeTable}
                  periods={periods}
                  attendances={attendances}
                  classes={sortedClasses}
                  teachersLeaveRecord={teachersLeaveRecord}
                />
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <StatsOverview
            totalStats={dashboardData.totalStats}
            isLoading={isLoadingStats}
          />

          {/* Faculty Profiles */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5" />
                <span>Faculty Profiles</span>
              </CardTitle>
              <CardDescription>
                View active teaching staff profile and information
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-6 gap-4">
              {sortedTeachers?.map((teacher) => {
                const assignedClass =
                  sortedClasses.find((c) => c.teacherId === teacher._id)?.name ||
                  "No Class Assigned";
                return (
                  <FacultyProfileCard
                    key={teacher._id}
                    faculty={teacher}
                    assignedClass={assignedClass}
                  />
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Classes Overview</span>
              </CardTitle>
              <CardDescription>
                View detailed information about active classes and their
                performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStudents ? (
                <ClassesSkeleton />
              ) : hasClasses ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {sortedClasses.map((classData) => {
                    const leaveStudents = leaveRecords.filter(
                      (record) => record.classId === classData._id
                    );

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
              ) : (
                <div className="flex items-center justify-center h-32 bg-muted/20 rounded-md">
                  <p className="text-muted-foreground">
                    No class data available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid gap-6 grid-cols-1">
            {/* Active Students Chart */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5" />
                  <span>Active Students By Batch ({dashboardData.activeStudents.length})</span>
                </CardTitle>
                <CardDescription>
                  Distribution of students across different batches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BatchChart
                  batches={dashboardData.batches}
                  students={dashboardData.activeStudents}
                  isLoading={isLoadingCharts}
                />
              </CardContent>
            </Card>

            {/* Graduated Students Chart */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5" />
                  <span>Graduated Students By Batch ({dashboardData.graduatedStudents.length})</span>
                </CardTitle>
                <CardDescription>
                  Distribution of graduated students across different batches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BatchChart
                  batches={dashboardData.batches}
                  students={dashboardData.graduatedStudents}
                  isLoading={isLoadingCharts}
                />
              </CardContent>
            </Card>

            {/* Student Status By Batch Chart */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5" />
                  <span>Student Status By Batch ({dashboardData.students.length})</span>
                </CardTitle>
                <CardDescription>
                  Comparison of active/graduated and dropped out students by
                  batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentStatusByBatchChart
                  batches={dashboardData.batches}
                  students={dashboardData.students}
                  isLoading={isLoadingCharts}
                />
              </CardContent>
            </Card>

            {/* Student Status Chart */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Student Status Distribution ({dashboardData.students.length})</span>
                </CardTitle>
                <CardDescription>
                  Distribution of students by enrollment status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentStatusChart
                  students={dashboardData.students}
                  isLoading={isLoadingStudents}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
