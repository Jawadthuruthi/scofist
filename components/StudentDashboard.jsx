"use client";
import React, { useEffect, useState } from 'react';
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Phone, Home, Heart, Calendar, AlertCircle, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";


const ProfileDetail = ({ icon: Icon, label, value }) => (
  <div className="flex items-start text-sm">
    <Icon className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
    <div className="flex flex-col">
      <span className="font-semibold text-gray-700">{label}</span>
      <span className="text-gray-500">{value || "N/A"}</span>
    </div>
  </div>
);

const ChartSkeleton = () => (
    <div className="h-[300px] w-full bg-muted/30 rounded-lg flex items-center justify-center">
        <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
    </div>
);

export default function StudentDashboard({ user, attendanceRecords = [] }) {
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);

  useEffect(() => {
    if (attendanceRecords.length > 0) {
      const monthlyData = attendanceRecords.reduce((acc, record) => {
        const month = new Date(record.date).toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        if (!acc[month]) {
          acc[month] = { total: 0, present: 0, month: month };
        }
        acc[month].total++;
        if (record.present) {
          acc[month].present++;
        }
        return acc;
      }, {});

      const formattedData = Object.values(monthlyData).map(
        (data) => ({
          month: data.month,
          percentage: parseFloat(((data.present / data.total) * 100).toFixed(2)),
        })
      );

       // Ensure consistent month order
      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      formattedData.sort((a, b) => {
          const [aMonth, aYear] = a.month.split(' ');
          const [bMonth, bYear] = b.month.split(' ');
          if (aYear !== bYear) {
              return parseInt(aYear) - parseInt(bYear);
          }
          return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });


      setMonthlyAttendance(formattedData);
    }
  }, [attendanceRecords]);

  const studentDetails = user?.studentSpecificField || {};
  const address = studentDetails.address || {};

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Hi {user?.name}!</h1>
        <p className="text-muted-foreground mb-8">
          Welcome back, let's have a look at your progress.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center text-xl">
                  <User className="h-6 w-6 mr-3 text-primary" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-primary/20 flex-shrink-0">
                    {user?.profilePic?.url ? (
                      <Image
                        src={user.profilePic.url}
                        alt={`${user.name} profile picture`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <User className="h-20 w-20 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {user?.name}
                        </h2>
                        <p className="text-md text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                      <div className="mt-2 md:mt-0 flex space-x-2">
                        <Badge variant="outline">
                          Class: {studentDetails.classId || "N/A"}
                        </Badge>
                        <Badge>
                          Batch: {studentDetails.batchId || "N/A"}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 mt-4 pt-4 border-t">
                      <ProfileDetail
                        icon={Phone}
                        label="Contact Number"
                        value={user?.contactNumber}
                      />
                      <ProfileDetail
                        icon={Home}
                        label="Address"
                        value={address ? `${address.place}, ${address.district}`: 'N/A'}
                      />
                      <ProfileDetail
                        icon={Heart}
                        label="Blood Group"
                        value={studentDetails.bloodGroup}
                      />
                      <ProfileDetail
                        icon={User}
                        label="Guardian"
                        value={studentDetails.guardianName}
                      />
                      <ProfileDetail
                        icon={Phone}
                        label="Guardian's Contact"
                        value={studentDetails.guardianContactNumber}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                   <Calendar className="h-6 w-6 mr-3 text-primary"/>
                  Attendance Summary
                </CardTitle>
                 <CardDescription>
                  Your month-wise attendance percentage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {monthlyAttendance.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyAttendance} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                            <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, "Attendance"]} />
                            <Bar dataKey="percentage" fill="#2563eb" radius={[4, 4, 0, 0]} >
                                <LabelList dataKey="percentage" position="top" formatter={(value) => `${value}%`} fontSize={12} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">No attendance data available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
