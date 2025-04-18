"use client";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import { formatDateForDisplay } from "@/lib/utils";

// Moved to a separate utility function for reusability
const calculateAttendancePercentage = (attendanceRecords) => {
  let totalMarked = 0;
  let totalPresent = 0;

  for (const record of attendanceRecords) {
    const students = record.attendanceData;
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
const DashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-4">
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
);

// Stat Card Component for consistent styling
const StatCard = ({ title, value, icon: Icon, description }) => (
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
);

// Class Card Component
const ClassCard = ({ classData, students, batches, attendances }) => {
  // Find associated data
  const classStudents = students.filter(
    (student) => student.className === classData.name
  ).length;

  const classBatch = batches.find((batch) => batch._id === classData.batchId);

  const classAttendance = attendances.filter(
    (attendance) => attendance.classId._id === classData._id
  );

  const attendanceStats = calculateAttendancePercentage(classAttendance);

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
              {7 + Math.floor(Math.random() * 3)}
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
};

export default function Dashboard({ token }) {
  // Consolidated state
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    students: [],
    batches: [],
    classes: [],
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

  // Setup crud hooks
  const { useFetchItems: useFetchStudents } = useCrud("users", token);
  const { useFetchItems: useFetchTeachers } = useCrud("users", token);
  const { useFetchItems: useFetchBatches } = useCrud("batches", token);
  const { useFetchItems: useFetchClasses } = useCrud("classes", token);
  const { useFetchItems: useFetchAttendances } = useCrud("attendances", token);

  // Setup queries
  const fetchStudentsQuery = useFetchStudents(0, 0, { roles: ["Student"] });
  const fetchTeachersQuery = useFetchTeachers(0, 0, { roles: ["Teacher"] });
  const fetchBatchesQuery = useFetchBatches(0, 0, { status: "Active" });
  const fetchClassesQuery = useFetchClasses();
  const fetchAttendanceQuery = useFetchAttendances(null, null, {
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    // Function to fetch all required data
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Consolidated state update to reduce re-renders
        const newData = { ...dashboardData };

        if (fetchStudentsQuery.data) {
          newData.students = fetchStudentsQuery.data.users || [];
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
          newData.totalStats = {
            studentCount:
              fetchStudentsQuery.data.pagination?.total ||
              fetchStudentsQuery.data.users?.length ||
              0,
            teachersCount:
              fetchTeachersQuery.data.pagination?.total ||
              fetchTeachersQuery.data.users?.length ||
              0,
            activeStudents:
              fetchStudentsQuery.data.users?.filter(
                (student) => student.status === "Active"
              )?.length || 0,
            graduatedStudents:
              fetchStudentsQuery.data.users?.filter(
                (student) => student.status === "Graduated"
              )?.length || 0,
            activeBatches:
              fetchBatchesQuery.data.pagination?.total ||
              fetchBatchesQuery.data.batches?.length ||
              0,
          };
        }

        setDashboardData(newData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [
    fetchStudentsQuery.data,
    fetchBatchesQuery.data,
    fetchTeachersQuery.data,
    fetchClassesQuery.data,
    fetchAttendanceQuery.data,
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-auto">
          <TabsTrigger value="overview" className="px-6">
            Overview
          </TabsTrigger>
          <TabsTrigger value="classes" className="px-6">
            Classes
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
          <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Faculty"
              value={dashboardData.totalStats.teachersCount}
              icon={UserCheck}
              description="Active teaching staff"
            />
            <StatCard
              title="Active Batches"
              value={dashboardData.totalStats.activeBatches}
              icon={BarChart3}
              description="Ongoing academic batches"
            />
            <StatCard
              title="Total Students"
              value={dashboardData.totalStats.studentCount.toLocaleString()}
              icon={Users}
              description="Currently enrolled students"
            />

            <StatCard
              title="Active Students"
              value={dashboardData.totalStats.activeStudents}
              icon={BookOpen}
              description="Currently attending classes"
            />

            <StatCard
              title="Graduated Students"
              value={dashboardData.totalStats.graduatedStudents}
              icon={GraduationCap}
              description="Successfully completed program"
            />
          </div>
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
              {dashboardData.classes.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {dashboardData.classes.slice(0, 9).map((classData, index) => (
                    <ClassCard
                      key={index}
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
      </Tabs>
    </div>
  );
}
