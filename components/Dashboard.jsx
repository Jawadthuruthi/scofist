"use client";
import { useState, useEffect, useMemo, memo } from "react";
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
} from "recharts";

/**
 * Calculates attendance percentage from attendance records
 * @param {Array} attendanceRecords - List of attendance records
 * @returns {Object} Object containing attendance statistics
 */
const calculateAttendancePercentage = (attendanceRecords) => {
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

// Dashboard Skeleton component for better loading state
const DashboardSkeleton = memo(() => (
  <div className="space-y-4">
    <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  </div>
));

DashboardSkeleton.displayName = "DashboardSkeleton";

// Stat Card Component for consistent styling
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

// Error display component
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
    const filteredStudents = students.filter(
      (student) => student.className === classData.name
    ).length;

    const foundBatch = batches.find((batch) => batch._id === classData.batchId);

    const filteredAttendance = attendances.filter(
      (attendance) => attendance.classId?._id === classData._id
    );

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
const StatsOverview = memo(({ totalStats }) => (
  <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-5">
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
      title="Total Students"
      value={totalStats.studentCount.toLocaleString()}
      icon={Users}
      description="Currently enrolled students"
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
));

StatsOverview.displayName = "StatsOverview";

/**
 * Chart component to visualize batch data
 */
const BatchChart = memo(({ batches, students }) => {
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
      .filter((item) => item.students > 0)
      .sort((a, b) => b.students - a.students);
  }, [batches, students]);

  // For chart rendering optimization

  // Format x-axis labels for better display
  const formatXAxisTick = (value) => {
    // Truncate long names
    return value.length > 10 ? `${value.substring(0, 10)}...` : value;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-muted-foreground">No batch data available</p>
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData.slice(0, 15)} // Limit to 15 items for performance
          layout="vertical"
          margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
        >
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            width={60}
            tick={{ fontSize: 11 }}
            tickFormatter={formatXAxisTick}
          />
          <Tooltip
            formatter={(value, name) => [`${value} students`, name]}
            labelFormatter={(label) => `Batch: ${label}`}
          />
          <Legend />
          <Bar
            dataKey="students"
            name="Number of Students"
            fill="#8884d8"
            radius={[0, 4, 4, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
});

BatchChart.displayName = "BatchChart";

/**
 * Student Status Chart component
 */
const StudentStatusChart = memo(({ students }) => {
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

/**
 * Dashboard component displays school statistics and class information
 * @param {string} token - Authentication token for API calls
 * @returns {React.ReactElement} Dashboard component
 */
export default function Dashboard({ token }) {
  // States for loading and error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    students: [],
    batches: [],
    classes: [],
    activeStudents: [],
    graduatedStudents: [],
    attendances: [],
    totalStats: {
      studentCount: 0,
      activeStudents: 0,
      graduatedStudents: 0,
      teachersCount: 0,
      activeBatches: 0,
    },
  });

  const currentDate = formatDateForDisplay(new Date());
  const todayISO = new Date().toISOString().split("T")[0];

  // Setup crud hooks
  const { useFetchItems: useFetchStudents } = useCrud("users", token);
  const { useFetchItems: useFetchTeachers } = useCrud("users", token);
  const { useFetchItems: useFetchBatches } = useCrud("batches", token);
  const { useFetchItems: useFetchClasses } = useCrud("classes", token);
  const { useFetchItems: useFetchAttendances } = useCrud("attendances", token);

  // Setup queries with error handling
  const fetchStudentsQuery = useFetchStudents(0, 0, { roles: ["Student"] });
  const fetchTeachersQuery = useFetchTeachers(0, 0, { roles: ["Teacher"] });
  const fetchBatchesQuery = useFetchBatches(0, 0, {});
  const fetchClassesQuery = useFetchClasses();
  const fetchAttendanceQuery = useFetchAttendances(null, null, {
    date: todayISO,
  });

  // Create derived state using useMemo
  const hasClasses = useMemo(
    () => dashboardData.classes.length > 0,
    [dashboardData.classes]
  );

  useEffect(() => {
    // Function to fetch all required data
    const fetchDashboardData = async () => {
      setLoading(true);
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

        if (fetchBatchesQuery.data) {
          newData.batches = fetchBatchesQuery.data.batches || [];
        }

        if (fetchClassesQuery.data) {
          newData.classes = fetchClassesQuery.data.classes || [];
        }

        if (fetchAttendanceQuery.data) {
          newData.attendances = fetchAttendanceQuery.data.attendances || [];
        }

        // Calculate total statistics
        if (
          fetchStudentsQuery.data &&
          fetchTeachersQuery.data &&
          fetchBatchesQuery.data
        ) {
          const students = fetchStudentsQuery.data.users || [];

          newData.totalStats = {
            studentCount:
              fetchStudentsQuery.data.pagination?.total || students.length || 0,
            teachersCount:
              fetchTeachersQuery.data.pagination?.total ||
              fetchTeachersQuery.data.users?.length ||
              0,
            activeStudents:
              students.filter((student) => student.status === "Active")
                .length || 0,
            graduatedStudents:
              students.filter((student) => student.status === "Graduated")
                .length || 0,
            activeBatches:
              fetchBatchesQuery.data.batches?.filter(
                (batch) => batch.status === "Active"
              )?.length || 0,
          };
        }

        setDashboardData(newData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    // Check for errors in queries
    if (
      fetchStudentsQuery.error ||
      fetchTeachersQuery.error ||
      fetchBatchesQuery.error ||
      fetchClassesQuery.error ||
      fetchAttendanceQuery.error
    ) {
      setError("An error occurred while fetching data. Please try again.");
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [
    fetchStudentsQuery.data,
    fetchStudentsQuery.error,
    fetchBatchesQuery.data,
    fetchBatchesQuery.error,
    fetchTeachersQuery.data,
    fetchTeachersQuery.error,
    fetchClassesQuery.data,
    fetchClassesQuery.error,
    fetchAttendanceQuery.data,
    fetchAttendanceQuery.error,
  ]);

  // Display skeleton during loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col space-y-6">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      {error && <ErrorAlert message={error} />}

      <Tabs defaultValue="overview" className="space-y-6">
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
          {/* Time Table Component */}
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
              <TimeTableComponent token={token} hidePrintButton={true} />
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <StatsOverview totalStats={dashboardData.totalStats} />
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
              {hasClasses ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {dashboardData.classes.slice(0, 9).map((classData) => (
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
                <div className="flex items-center justify-center h-32 bg-muted rounded-md">
                  <p className="text-muted-foreground">
                    No class data available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
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
                <StudentStatusChart students={dashboardData.students} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
