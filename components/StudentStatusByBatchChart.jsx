"use client";

import { memo, useMemo, useState, useEffect } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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

const StudentStatusByBatchChart = memo(
  ({ batches = [], students = [], isLoading }) => {
    const isMobile = useIsMobile();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    const chartData = useMemo(() => {
      if (!batches?.length || !students?.length) return [];

      return batches
        .map((batch) => {
          const batchStudents = students.filter(
            (student) => student.batchId === batch._id
          );

          const droppedOut = batchStudents.filter(
            (student) => student.status === "Dropped Out"
          ).length;

          const activeOrGraduated = batchStudents.filter(
            (student) =>
              student.status === "Active" || student.status === "Graduated"
          ).length;

          if (batchStudents.length === 0) {
            return null;
          }

          return {
            name: batch.name,
            droppedOut,
            activeOrGraduated,
          };
        })
        .filter(Boolean);
    }, [batches, students]);

    if (isLoading) return <ChartSkeleton />;

    if (!chartData.length) {
      return (
        <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md">
          <p className="text-gray-500">No batch data available</p>
        </div>
      );
    }

    const chartContent = (
      <RechartsBarChart
        width={isClient && isMobile ? chartData.length * 90 : undefined}
        height={isClient && isMobile ? 250 : undefined}
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barCategoryGap={10}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="droppedOut"
          fill="#FF8042"
          name="Dropped Out"
          barSize={isClient && isMobile ? 25 : undefined}
        >
          <LabelList dataKey="droppedOut" position="top" />
        </Bar>
        <Bar
          dataKey="activeOrGraduated"
          fill="#8884d8"
          name="Active/Graduated"
          barSize={isClient && isMobile ? 25 : undefined}
        >
          <LabelList dataKey="activeOrGraduated" position="top" />
        </Bar>
      </RechartsBarChart>
    );

    return (
      <div className="h-64">
        {isClient && isMobile ? (
          <div className="overflow-x-auto">{chartContent}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartContent}
          </ResponsiveContainer>
        )}
      </div>
    );
  }
);

StudentStatusByBatchChart.displayName = "StudentStatusByBatchChart";

export default StudentStatusByBatchChart;
