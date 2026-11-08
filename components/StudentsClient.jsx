"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions, sortClasses } from "@/lib/utils";
import { useMemo, useState, useCallback, useEffect, useRef, memo } from "react";
import StudentProfileDialog from "@/components/StudentProfileDialog";
import { getStudentFormFields } from "@/lib/studentFormConfig";
import { Button } from "@/components/ui/button";
import { Loader, RefreshCcw, ClipboardList, Users, GraduationCap, BarChart as BarChartIcon, BarChart, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import useCrud from "@/hooks/use-crud";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

import { getStudentColumns } from "@/components/table-configs/studentColumns";
import ProfileComparisonDialog from "./ProfileComparisonDialog";
import PendingRequestsDialog from "@/components/PendingRequestsDialog";

const ChartSkeleton = ({ height = "300px" }) => (
  <div style={{ height }} className="bg-muted/10 rounded-lg flex items-center justify-center">
    <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
  </div>
);

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
    <div className="border rounded-md overflow-x-auto w-full">
      <table className="w-full text-sm text-left">
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

// ===== BATCH STUDENTS TABLE COMPONENT =====
const BatchStudentsTable = memo(({ batches = [], students = [], showStatusColumns = false }) => {
  const tableData = useMemo(() => {
    if (!batches?.length || !students?.length) return [];
    
    return batches
      .map((batch) => {
        const batchStudents = students.filter((student) => {
          const studentBatchId =
            student.studentSpecificField?.batchId?._id ||
            student.studentSpecificField?.batchId ||
            student.batchId?._id ||
            student.batchId;
          return String(studentBatchId) === String(batch._id);
        });
        const count = batchStudents.length;
        
        if (showStatusColumns) {
          const active = batchStudents.filter((s) => (s.studentSpecificField?.status || s.status) === "Active").length;
          const graduated = batchStudents.filter((s) => (s.studentSpecificField?.status || s.status) === "Graduated").length;
          const droppedOut = batchStudents.filter((s) => (s.studentSpecificField?.status || s.status)?.toLowerCase().includes("drop")).length;
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
    <div className="border rounded-md overflow-x-auto w-full">
      <table className="w-full text-sm text-left">
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
      .map((batch) => {
        const batchStudents = students.filter((student) => {
          const studentBatchId =
            student.studentSpecificField?.batchId?._id ||
            student.studentSpecificField?.batchId ||
            student.batchId?._id ||
            student.batchId;
          return String(studentBatchId) === String(batch._id);
        });
        return {
          name: batch.name,
          academicYear: batch.academicYear,
          students: batchStudents.length,
        };
      })
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
              labelFormatter={(label, payload) => {
                const academicYear = payload?.[0]?.payload?.academicYear;
                return `Batch: ${label}${academicYear ? ` (${academicYear})` : ""}`;
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
BatchChart.displayName = "BatchChart";

const StudentDashboardView = ({ apiKey, batches = [], classes = [] }) => {
  const { useFetchItems } = useCrud("users", apiKey);
  const { data, isLoading } = useFetchItems(0, 0, { roles: ["Student"] }, { staleTime: 60000 });
  const [activeStudentsDialogOpen, setActiveStudentsDialogOpen] = useState(false);
  const [graduatedStudentsDialogOpen, setGraduatedStudentsDialogOpen] = useState(false);

  const activeStudentsPopupRef = useRef(null);
  const graduatedStudentsPopupRef = useRef(null);

  const { handleDownload: handleActiveStudentsDownload } = useDownloadPopup(activeStudentsPopupRef, "Active_Students.jpeg");
  const { handleDownload: handleGraduatedStudentsDownload } = useDownloadPopup(graduatedStudentsPopupRef, "Graduated_Students.jpeg");

  const students = useMemo(() => data?.users || [], [data?.users]);
  const activeStudents = useMemo(() => students.filter(s => (s.studentSpecificField?.status || s.status) === "Active"), [students]);
  const graduatedStudents = useMemo(() => students.filter(s => (s.studentSpecificField?.status || s.status) === "Graduated"), [students]);

  const sortedClasses = useMemo(() => {
    if (!classes?.length) return [];
    return [...classes]
      .filter((c) => c?.status !== "Closed")
      .sort((a, b) => sortClasses(a, b));
  }, [classes]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card
          onClick={() => setActiveStudentsDialogOpen(true)}
          className="border-l-4 border-l-primary hover:shadow-md transition-all cursor-pointer hover:bg-muted/10 group overflow-hidden"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
              <div className="text-3xl font-bold tracking-tight">{activeStudents.length}</div>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-3 pb-4">
            <p className="text-xs text-muted-foreground">Currently enrolled students</p>
            <p className="text-xs text-primary font-medium mt-1">Click to view chart →</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setGraduatedStudentsDialogOpen(true)}
          className="border-l-4 border-l-emerald-500 hover:shadow-md transition-all cursor-pointer hover:bg-muted/10 group overflow-hidden"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Graduated Students</CardTitle>
              <div className="text-3xl font-bold tracking-tight">{graduatedStudents.length}</div>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-full">
              <GraduationCap className="h-6 w-6 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-3 pb-4">
            <p className="text-xs text-muted-foreground">Successfully graduated alumni</p>
            <p className="text-xs text-emerald-500 font-medium mt-1">Click to view chart →</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Students Popup */}
      <Dialog open={activeStudentsDialogOpen} onOpenChange={setActiveStudentsDialogOpen}>
        <DialogContent
          ref={activeStudentsPopupRef}
          data-html2canvas-popup="true"
          className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0"
        >
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
                Distribution of active students ({activeStudents.length} students)
              </DialogDescription>
            </div>
            <DialogClose
              className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
              data-html2canvas-ignore="true"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="px-5 pb-5 pt-2 space-y-6">
            <ClassStudentsTable
              classes={sortedClasses}
              batches={batches}
              students={activeStudents}
            />
            <div data-html2canvas-ignore="true">
              <ClassChart
                classes={sortedClasses}
                batches={batches}
                students={activeStudents}
                isLoading={isLoading}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Graduated Students Popup */}
      <Dialog open={graduatedStudentsDialogOpen} onOpenChange={setGraduatedStudentsDialogOpen}>
        <DialogContent
          ref={graduatedStudentsPopupRef}
          data-html2canvas-popup="true"
          className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0"
        >
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
                Distribution of graduated students ({graduatedStudents.length} students)
              </DialogDescription>
            </div>
            <DialogClose
              className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
              data-html2canvas-ignore="true"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="px-5 pb-5 pt-2 space-y-6">
            <BatchStudentsTable
              batches={batches}
              students={graduatedStudents}
            />
            <div data-html2canvas-ignore="true">
              <BatchChart
                batches={batches}
                students={graduatedStudents}
                isLoading={isLoading}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function StudentsClient({ batches, classes, activeRole, apiKey, isReadOnly = false, pageTitle, excludedColumns = [], filterTitle, lastStudentId }) {
  const sortedClasses = useMemo(() => {
    return [...(classes || [])]
      .filter((c) => c?.status !== "Closed")
      .sort((a, b) => {
      const classCompare = sortClasses(a, b);
      if (classCompare !== 0) return classCompare;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [classes]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [comparisonStudent, setComparisonStudent] = useState(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);

  const { useFetchItems } = useCrud("users", apiKey);
  const { data: pendingRequestsData } = useFetchItems(
    0,
    100,
    {
      roles: "Student",
      profileUpdateStatus: "Pending",
    },
    {
      enabled: activeRole === "College Admin" && !isReadOnly && pageTitle !== "ADMISSION REGISTER",
    }
  );

  const pendingRequestsCount = pendingRequestsData?.users?.length || 0;

  // Use shared column configuration
  const columnsConfig = getStudentColumns({
    classes: sortedClasses,
    pageTitle,
    onNameClick: (student) => {
      setSelectedStudent(student);
      setIsProfileOpen(true);
    },
    onProfileRequestClick: (student) => {
      setComparisonStudent(student);
      setIsComparisonOpen(true);
    },
    excludeColumns: ["remarks"]
  });

  const statusMessages = {
    create: "Student added successfully!",
    edit: "Student Updated successfully!",
    delete: "Student deleted successfully!",
  };

  const apiFilters = useMemo(() => ({
    roles: ["Student"],
    populate: "funds",
  }), []);

  const formFields = useMemo(() => getStudentFormFields(batches, sortedClasses, lastStudentId), [batches, sortedClasses, lastStudentId]);

  const filterConfig = pageTitle === "ADMISSION REGISTER" ? [
    { id: "_id", label: "ID" },
    { id: "name", label: "Name" },
    {
      id: "batchId",
      label: "Batch",
      inputType: "select",
      options: formatOptions(batches),
    },
    {
      id: "classId",
      label: "Class",
      inputType: "select",
      options: formatOptions(sortedClasses),
    },
    {
      id: "status",
      label: "Status",
      inputType: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Graduated", value: "Graduated" },
        { label: "Dropped Out", value: "Dropped Out" },
      ],
    },
    {
      id: "profileUpdateStatus",
      label: "Review Status",
      inputType: "select",
      options: [
        { label: "Verified", value: "Verified" },
        { label: "Requested", value: "Pending" },
      ],
    },
  ] : [
    { id: "name", label: "Name" },
    { id: "_id", label: "ID" },
    {
      id: "classId",
      label: "Class",
      inputType: "select",
      options: formatOptions(sortedClasses),
    },
    {
      id: "batchId",
      label: "Batch",
      inputType: "select",
      options: formatOptions(batches),
    },
    {
      id: "status",
      label: "Status",
      inputType: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Graduated", value: "Graduated" },
        { label: "Dropped Out", value: "Dropped Out" },
      ],
    },
    {
      id: "profileUpdateStatus",
      label: "Review Status",
      inputType: "select",
      options: [
        { label: "Verified", value: "Verified" },
        { label: "Requested", value: "Pending" },
      ],
    },
  ];

  const filteredColumnsConfig = columnsConfig.filter((column) => {
    if (excludedColumns.includes(column.accessorKey) || excludedColumns.includes(column.id)) {
      return false;
    }
    if (activeRole === "Teacher" || isReadOnly) {
      return column.header !== "Select";
    }
    if (activeRole === "Student") {
      return [
        "serialNo",
        "profilePic",
        "_id",
        "name",
        "batchName",
        "className",
        "status",
        "updatedAt",
      ].includes(column.accessorKey);
    }
    return true;
  });

  const defaultSorting = useMemo(() => [{ id: "_id", desc: true }], []);

  return (
    <>
      <Header
        title={
          pageTitle || (activeRole !== "College Admin"
            ? "STUDENTS DETAILS"
            : "STUDENTS MANAGEMENT")
        }
        subTitle="Organize and Oversee Students"
      />
      {activeRole === "Student" ? (
        <StudentDashboardView apiKey={apiKey} batches={batches} classes={sortedClasses} />
      ) : (
        <DataTableComponent
          key={refreshKey}
          resource="users"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Student"
          editFormTitle="Edit Student"
          deleteFormTitle="Delete Student"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={50}
          apiFilters={apiFilters}
          filterTitle={filterTitle || "Students"}
          printTitle={pageTitle || "Students"}
          enableSearch={true}
          filterType="api"
          readOnly={activeRole !== "College Admin" || isReadOnly}
          tableHeight="calc(100vh - 340px)"
          enableClickToEdit={true}
          clickToEditExcludeColumns={[
            ...filteredColumnsConfig.map(c => c.accessorKey || c.id).filter(id => id !== "_id"),
            "select", "serialNo", "actions", "updatedAt"
          ]}
          formClassName="sm:max-w-4xl"
          defaultSorting={defaultSorting}
          capitalizeInputs={true}
          customTopRightButtons={
            pageTitle !== "ADMISSION REGISTER" ? (
              <Button 
                variant={pendingRequestsCount > 0 ? "destructive" : "outline"}
                className={`h-9 px-3 shrink-0 print:hidden gap-2 ${pendingRequestsCount > 0 ? "bg-red-500 hover:bg-red-600 text-white" : ""}`} 
                onClick={() => setIsRequestsOpen(true)}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden md:inline">Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                    {pendingRequestsCount}
                  </span>
                )}
              </Button>
            ) : null
          }
        />
      )}

      <StudentProfileDialog
        student={selectedStudent}
        open={isProfileOpen}
        onClose={setIsProfileOpen}
        classes={sortedClasses}
        batches={batches}
        apiKey={apiKey}
      />

      <ProfileComparisonDialog
        student={comparisonStudent}
        open={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onActionComplete={() => setRefreshKey(prev => prev + 1)}
      />

      <PendingRequestsDialog
        open={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        apiKey={apiKey}
        onView={(student) => {
          setIsRequestsOpen(false);
          setComparisonStudent(student);
          setIsComparisonOpen(true);
        }}
      />
    </>
  );
}
