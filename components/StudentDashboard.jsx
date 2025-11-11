"use client";
import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Header from "@/components/Header";
import { Calendar } from "lucide-react";
import { formatDateForDisplay } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';


export default function StudentDashboard({ user, apiKey }) {
  const { useFetchItems } = useCrud("student-attendance", apiKey);
  const { data: attendanceData, isLoading, error } = useFetchItems(0, 0, { studentId: user?._id });

  const attendanceHistory = useMemo(() => {
    if (!attendanceData) return [];
    const history = {};
    attendanceData.forEach((record) => {
      const month = new Date(record.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!history[month]) {
        history[month] = {
          workingDays: 0,
          presentDays: 0,
        };
      }
      history[month].workingDays++;
      if (record.present) {
        history[month].presentDays++;
      }
    });
    return Object.entries(history).map(([month, data]) => ({
      month,
      ...data,
      percentage: ((data.presentDays / data.workingDays) * 100).toFixed(2),
    }));
  }, [attendanceData]);

  const currentDate = formatDateForDisplay(new Date());

  return (
    <div className="flex flex-col space-y-6">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Student Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.profilePic?.url} alt={user?.name} />
              <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <div className="text-sm text-muted-foreground">
              <p>Email: {user?.email}</p>
              <p>Contact: {user?.contactNumber}</p>
              <p>Address: {user?.address?.place}</p>
              <p>DOB: {formatDateForDisplay(user?.dateOfBirth)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Month-wise Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Present Days</TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell>{row.month}</TableCell>
                    <TableCell>{row.workingDays}</TableCell>
                    <TableCell>{row.presentDays}</TableCell>
                    <TableCell>{row.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Attendance Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attendanceHistory}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="percentage" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
