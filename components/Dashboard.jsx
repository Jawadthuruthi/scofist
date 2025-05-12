"use client";
import { useState, useEffect, useMemo, memo, Suspense } from "react";
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
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import { formatDateForDisplay } from "@/lib/utils";
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
import Cookies from "js-cookie";

const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};
/**
 * Calculates attendance percentage from attendance records
 * @param {Array} attendanceRecords - List of attendance records
 * @returns {Object} Object containing attendance statistics
 */
const calculateAttendancePercentage = (attendanceRecords) => {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return { totalMarked: 0, totalPresent: 0, percentage: 0 };
  }

  let totalMarked = 0;
  let totalPresent = 0;

  for (const record of attendanceRecords) {
    const students = record.attendanceData || [];
    totalMarked += students.length;
    totalPresent += students.filter((s) => s.present).length;
  }

  const percentage =
    totalMarked > 0 ? ((totalPresent / totalMarked) * 100).toFixed(2) : 0;

  return {
    totalMarked,
    totalPresent,
    percentage: parseFloat(percentage),
  };
};

// Dashboard Loading Skeleton Components
const StatCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </CardHeader>
    <CardContent className="pt-4">
      <Skeleton className="h-7 w-14 mb-1" />
      <Skeleton className="h-3 w-24" />
    </CardContent>
  </Card>
);

const StatsOverviewSkeleton = () => (
  <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-5">
    {Array(4)
      .fill(0)
      .map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
  </div>
);

const ChartSkeleton = ({ height = "300px" }) => (
  <div
    className={`h-[${height}] bg-muted/10 rounded-lg flex items-center justify-center`}
  >
    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
  </div>
);

const ClassCardSkeleton = () => (
  <Card className="overflow-hidden">
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
);

const ClassesSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array(6)
      .fill(0)
      .map((_, i) => (
        <ClassCardSkeleton key={i} />
      ))}
  </div>
);

// Memoized Components
const StatCard = memo(({ title, value, icon: Icon, description }) => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-primary" />
    </CardHeader>
    <CardContent className="pt-4">
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
));

StatCard.displayName = "StatCard";

const ErrorAlert = memo(({ message }) => (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{message}</AlertDescription>
  </Alert>
));

ErrorAlert.displayName = "ErrorAlert";

// Class Card Component
const ClassCard = memo(({ classData, students, batches, attendances }) => {
  // Using useMemo to optimize expensive calculations
  const { classStudents, classBatch, attendanceStats } = useMemo(() => {
    // Find associated data
    const filteredStudents = students
      ? students.filter(
          (student) =>
            student.className === classData.name && student.status === "Active"
        ).length
      : 0;

    const foundBatch = batches
      ? batches.find((batch) => batch._id === classData.batchId)
      : null;

    const filteredAttendance = attendances
      ? attendances.filter(
          (attendance) => attendance.classId?._id === classData._id
        )
      : [];

    const stats = calculateAttendancePercentage(filteredAttendance);

    return {
      classStudents: filteredStudents,
      classBatch: foundBatch,
      attendanceStats: stats,
    };
  }, [classData, students, batches, attendances]);

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-all">
      <CardHeader className="pb-2 bg-muted/30">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{classData.name}</CardTitle>
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
            <span className="text-muted-foreground">Subjects:</span>
            <span className="font-medium">
              {classData.subjects?.length || "N/A"}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Today's Attendance:</span>
              <span className="font-medium">{attendanceStats.percentage}%</span>
            </div>
            <Progress value={attendanceStats.percentage} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ClassCard.displayName = "ClassCard";

// Stats Overview component
const StatsOverview = memo(({ totalStats, isLoading }) => {
  if (isLoading) return <StatsOverviewSkeleton />;

  return (
    <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Faculty"
        value={totalStats.teachersCount}
        icon={UserCheck}
        description="Active teaching staff"
      />
      <StatCard
        title="Active Batches"
        value={totalStats.activeBatches}
        icon={BarChart3}
        description="Ongoing academic batches"
      />
      <StatCard
        title="Active Students"
        value={totalStats.activeStudents}
        icon={BookOpen}
        description="Currently attending classes"
      />
      <StatCard
        title="Graduated Students"
        value={totalStats.graduatedStudents}
        icon={GraduationCap}
        description="Successfully completed program"
      />
    </div>
  );
});

StatsOverview.displayName = "StatsOverview";

/**
 * Batch Chart component with lazy loading
 */

const BatchChart = memo(({ batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const calculatedWidth = Math.max(30, Math.floor(vw * 0.05));
      setBarWidth(calculatedWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Move useMemo before any conditional returns
  const chartData = useMemo(() => {
    if (!batches || !students) return [];

    return batches
      .map((batch) => {
        // Count students in this batch
        const batchStudents = students.filter(
          (student) => student.batchId === batch._id
        ).length;
        return {
          name: batch.name,
          students: batchStudents,
        };
      })
      .filter((item) => item.students > 0);
  }, [batches, students]);

  if (isLoading) return <ChartSkeleton />;

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-gray-500">No batch data available</p>
      </div>
    );
  }

  // Fixed dimensions
  const BAR_WIDTH = barWidth;
  const BAR_GAP = 20;
  const CHART_PADDING = 70;

  // Calculate total width needed for the chart
  const totalWidth = Math.max(
    300,
    (BAR_WIDTH + BAR_GAP) * chartData.length + CHART_PADDING
  );

  return (
    <div className="h-64 max-w-full overflow-x-auto overflow-y-hidden rounded-md">
      <div
        className="mx-auto"
        style={{ width: `${totalWidth}px`, height: "290px" }}
      >
        <ResponsiveContainer width="100%" height={290}>
          <RechartsBarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
            barSize={BAR_WIDTH}
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

/**
 * Student Status Chart component
 */
const StudentStatusChart = memo(({ students, isLoading }) => {
  if (isLoading) return <ChartSkeleton />;

  // Prepare pie chart data for student status
  const statusData = useMemo(() => {
    if (!students || students.length === 0) return [];

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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (statusData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-muted-foreground">
          No student status data available
        </p>
      </div>
    );
  }

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

// Lazy-loaded TimeTable Component
const LazyTimeTable = memo(
  ({ apiKey, activeRole, timeTable, periods, attendances, classes }) => (
    <Suspense fallback={<ChartSkeleton height="400px" />}>
      <TimeTableComponent
        apiKey={apiKey}
        hidePrintButton={true}
        role={activeRole}
        timeTable={timeTable}
        periods={periods}
        attendances={attendances}
        classes={classes}
      />
    </Suspense>
  )
);

LazyTimeTable.displayName = "LazyTimeTable";

// Faculty Profile Component

const FacultyProfileCard = memo(({ faculty }) => {
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-all col-span-6 md:col-span-3 lg:col-span-2">
      <div className="flex">
        <div className="w-20 xs:w-32 h-20 xs:h-32 relative bg-muted/30">
          {faculty.profilePic?.url ? (
            <Image
              src={faculty.profilePic.url}
              alt={faculty.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <UserCheck className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-2 md:p-4">
          <div className="flex justify-between mb-1 md:mb-2">
            <div>
              <h3 className="font-semibold text-sm">{faculty.name}</h3>
              <p className="text-muted-foreground text-xs">{faculty.place}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 md:gap-2 text-xs">
            <div className="whitespace-nowrap">
              <span className="text-muted-foreground">Contact: </span>
              <span>{faculty.contactNumber || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

FacultyProfileCard.displayName = "FacultyProfileCard";

/**
 * Dashboard component displays school statistics and class information
 * @param {string} apiKey - Authentication api-key for API calls
 * @returns {React.ReactElement} Dashboard component
 */
export default function Dashboard({
  apiKey,
  classes = [],
  batches = [],
  teachers = [],
  timeTable = [],
  periods = [],
  attendances = [],
}) {
  // States for loading and error handling
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const activeRole = Cookies.get("active-role");

  const router = useRouter();

  const isClient = useIsClient();

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  const [dashboardData, setDashboardData] = useState({
    students: [],
    batches,
    classes,
    teachers,
    activeStudents: [],
    graduatedStudents: [],
    attendances,
    totalStats: {
      studentCount: 0,
      activeStudents: 0,
      graduatedStudents: 0,
      teachersCount: 0,
      activeBatches: 0,
    },
  });

  const currentDate = formatDateForDisplay(new Date());

  // Setup crud hooks with stale time and caching options
  const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
  const { useFetchItems: useFetchAttendances } = useCrud("attendances", apiKey);

  // Setup queries with error handling and optimized fetch strategy
  const fetchStudentsQuery = useFetchStudents(
    0,
    0,
    { roles: ["Student"] },
    {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
    }
  );

  // Track loading states individually
  const isLoadingStudents =
    fetchStudentsQuery.isLoading || fetchStudentsQuery.isFetching;

  // Derived loading states for specific sections
  const isLoadingStats = isLoadingStudents;
  const isLoadingCharts = isLoadingStudents;

  // Create derived state using useMemo
  const hasClasses = useMemo(
    () => dashboardData.classes.length > 0,
    [dashboardData.classes]
  );

  useEffect(() => {
    // Function to fetch all required data
    const processDashboardData = () => {
      setError(null);
      try {
        // Consolidated state update to reduce re-renders
        const newData = { ...dashboardData };

        if (fetchStudentsQuery.data) {
          newData.students = fetchStudentsQuery.data.users || [];
          newData.activeStudents =
            newData.students.filter((student) => student.status === "Active") ||
            [];
          newData.graduatedStudents =
            newData.students.filter(
              (student) => student.status === "Graduated"
            ) || [];
        }

        // Calculate total statistics

        if (fetchStudentsQuery.data) {
          const students = fetchStudentsQuery.data.users || [];

          newData.totalStats = {
            studentCount:
              fetchStudentsQuery.data.pagination?.total || students.length || 0,
            teachersCount: teachers.length || 0,
            activeStudents:
              students.filter((student) => student.status === "Active")
                .length || 0,
            graduatedStudents:
              students.filter((student) => student.status === "Graduated")
                .length || 0,
            activeBatches:
              batches?.filter((batch) => batch.status === "Active")?.length ||
              0,
          };
        }

        setDashboardData(newData);
      } catch (err) {
        console.error("Error processing dashboard data:", err);
        setError("Failed to process dashboard data. Please try again later.");
      }
    };

    // Check for errors in queries
    if (fetchStudentsQuery.error) {
      const errorMessage =
        "An error occurred while fetching data. Please try again.";
      console.error("API Error:", fetchStudentsQuery.error);
      setError(errorMessage);
      return;
    }

    processDashboardData();
  }, [fetchStudentsQuery.data, fetchStudentsQuery.error]);
  return (
    <div className="flex flex-col space-y-6">
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
          {/* Time Table Component with lazy loading */}
          {isClient &&
            !!activeRole &&
            ["Teacher", "College Admin", "Org Admin"].includes(activeRole) && (
              <Card className="border-t-4 border-t-primary">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Today's Schedule</span>
                  </CardTitle>
                  <CardDescription>
                    View your scheduled classes and attendance for today
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <LazyTimeTable
                    apiKey={apiKey}
                    role={activeRole}
                    timeTable={timeTable}
                    periods={periods}
                    attendances={attendances}
                    classes={classes}
                  />
                </CardContent>
              </Card>
            )}

          {/* Stats Overview with loading state */}
          <StatsOverview
            totalStats={dashboardData.totalStats}
            isLoading={isLoadingStats}
          />

          {/* Faculty Profiles */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Faculty Profiles</span>
              </CardTitle>
              <CardDescription>
                View active teaching staff profile and information
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-6 gap-4">
              {dashboardData.teachers?.length > 0 &&
                dashboardData.teachers
                  ?.sort(
                    (a, b) => new Date(a.dateOfBirth) - new Date(b.dateOfBirth)
                  )
                  ?.map((teacher) => (
                    <FacultyProfileCard key={teacher._id} faculty={teacher} />
                  ))}
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
                  {dashboardData.classes.map((classData) => (
                    <ClassCard
                      key={classData._id}
                      classData={classData}
                      students={dashboardData.students}
                      batches={dashboardData.batches}
                      attendances={dashboardData.attendances}
                    />
                  ))}
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
            {/* Batch Active Students Chart */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5" />
                  <span>Active Students By Batch</span>
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

            {/* Batch Graduated Students Chart */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5" />
                  <span>Graduated Students By Batch</span>
                </CardTitle>
                <CardDescription>
                  Distribution of students across different batches
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

            {/* Student Status Chart */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Student Status</span>
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
