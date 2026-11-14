"use client";

import { memo, useMemo, useState, useEffect, useCallback } from "react";
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
import { Loader } from "lucide-react";

const ChartSkeleton = memo(({ height = "300px" }) => (
  <div
    style={{ height }}
    className="bg-muted/10 rounded-lg flex items-center justify-center w-full"
    role="status"
    aria-label="Loading chart"
  >
    <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";

// ===== BATCH CHART COMPONENT =====
export const BatchChart = memo(({ batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    const calculatedWidth = Math.min(40, Math.max(25, Math.floor(vw * 0.03)));
    setBarWidth(calculatedWidth);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const chartData = useMemo(() => {
    if (!batches?.length || !students?.length) return [];

    return batches
      .map((batch) => {
        const batchIdStr = String(batch._id);
        const count = students.filter((student) => {
          const sBatchId =
            student.studentSpecificField?.batchId?._id ||
            student.studentSpecificField?.batchId ||
            student.batchId?._id ||
            student.batchId;
          return sBatchId && String(sBatchId) === batchIdStr;
        }).length;

        return {
          name: batch.name,
          students: count,
        };
      })
      .filter((item) => item.students > 0);
  }, [batches, students]);

  if (isLoading) return <ChartSkeleton height="290px" />;

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

// ===== CLASS CHART COMPONENT =====
export const ClassChart = memo(({ classes = [], batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    const calculatedWidth = Math.min(40, Math.max(25, Math.floor(vw * 0.03)));
    setBarWidth(calculatedWidth);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
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

  if (isLoading) return <ChartSkeleton height="290px" />;

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
export const StudentStatusChart = memo(({ students, isLoading }) => {
  const statusData = useMemo(() => {
    if (!students?.length) return [];

    const statusCount = students.reduce((acc, student) => {
      const status =
        student.studentSpecificField?.status ||
        student.status ||
        "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
    }));
  }, [students]);

  if (isLoading) return <ChartSkeleton height="300px" />;

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
