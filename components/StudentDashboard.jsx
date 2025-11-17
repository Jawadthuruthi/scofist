"use client";
import React, { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import { Calendar } from "lucide-react";
import { formatDateForDisplay } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "./ui/button";
import { Printer } from "lucide-react";

const ProfileField = ({ label, value }) =>
  value ? (
    <div className="flex justify-between py-2 border-b">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  ) : null;

export default function StudentDashboard({
  user,
  apiKey,
  classes,
  batches,
  attendanceData: initialData,
}) {
  const { useFetchItems } = useCrud("studentAttendances", apiKey);
  const { data: fetchedData, isLoading, error } = useFetchItems(
    0,
    0,
    {
      studentId: user?._id,
    },
    { enabled: !initialData }
  );

  const attendanceData = initialData || fetchedData;
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const className = classes.find(
    (c) => c._id === user?.studentSpecificField?.classId
  )?.name;

  const admissionClassName = classes.find(
    (c) => c._id === user?.studentSpecificField?.admissionClassId
  )?.name;

  const batchName = batches.find(
    (b) => b._id === user?.studentSpecificField?.batchId
  )?.name;

  const academicYears = useMemo(() => {
    if (!batchName) return [new Date().getFullYear()];
    const years = batchName.match(/\d{4}/g);
    if (!years) return [new Date().getFullYear()];
    const startYear = parseInt(years[0], 10);
    const endYear = years[1] ? parseInt(years[1], 10) : startYear + 1;
    const allYears = [];
    for (let year = startYear; year <= endYear; year++) {
      allYears.push(year);
    }
    return allYears;
  }, [batchName]);

  const attendanceHistory = useMemo(() => {
    const records = attendanceData?.[0]?.attendanceRecords || [];

    const allMonthsMeta = [];
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const date = new Date(selectedYear, monthIndex, 1);
      const monthName = date.toLocaleString("en-US", { month: "long" });
      allMonthsMeta.push({ year: selectedYear, monthIndex, monthName });
    }

    return allMonthsMeta.map(({ year, monthIndex, monthName }) => {
      const recordsForMonth = records
        ? records.filter((r) => {
            const d = new Date(r.date);
            return d.getFullYear() === year && d.getMonth() === monthIndex;
          })
        : [];

      const totalPeriods = recordsForMonth.length;
      const presentPeriods = recordsForMonth.filter((r) => r.present).length;

      const details = recordsForMonth.map((r) => ({
        date: formatDateForDisplay(r.date),
        present: r.present,
      }));

      return {
        month: monthName,
        totalPeriods,
        presentPeriods,
        details,
        percentage:
          totalPeriods > 0
            ? ((presentPeriods / totalPeriods) * 100).toFixed(2)
            : 0,
      };
    });
  }, [attendanceData, batchName, selectedYear]);

  const currentDate = formatDateForDisplay(new Date());

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-200 text-green-800";
      case "Dropped Out":
        return "bg-red-200 text-red-800";
      case "Graduated":
        return "bg-blue-200 text-blue-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      {/* Profile Header */}
      <Card className="bg-blue-100">
        <CardContent className="flex items-center space-x-6 p-6">
          <Avatar className="h-24 w-24 rounded-lg">
            <AvatarImage src={user?.profilePic?.url} alt={user?.name} />
            <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-muted-foreground">Admission ID: {user?._id}</p>
            <p className="text-muted-foreground">Class: {className}</p>
            <p className="text-muted-foreground">
              Status:{" "}
              <span
                className={`px-2 py-1 rounded-md ${getStatusClass(
                  user?.studentSpecificField?.status
                )}`}
              >
                {user?.studentSpecificField?.status}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField
              label="Date of Birth"
              value={formatDateForDisplay(user?.dateOfBirth)}
            />
            <ProfileField
              label="Blood Group"
              value={user?.studentSpecificField?.bloodGroup}
            />
            <ProfileField
              label="Aadhar No"
              value={user?.studentSpecificField?.aadharNo}
            />
            {user?.address && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm font-medium text-gray-500">
                  Address
                </span>
                <div className="text-sm text-gray-900 text-right">
                  {user.address.houseName && (
                    <div>{user.address.houseName}</div>
                  )}
                  {(user.address.place || user.address.postOffice) && (
                    <div>
                      {[user.address.place, user.address.postOffice]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {(user.address.district ||
                    user.address.state ||
                    user.address.pin) && (
                    <div>
                      {[user.address.district, user.address.state]
                        .filter(Boolean)
                        .join(", ")}
                      {user.address.pin && ` - ${user.address.pin}`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Info</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField label="Batch" value={batchName} />
            <ProfileField
              label="Admission Class"
              value={admissionClassName}
            />
            <ProfileField
              label="Admission Date"
              value={formatDateForDisplay(
                user?.studentSpecificField?.admissionDate
              )}
            />
            <ProfileField
              label="Islamic Qualification"
              value={user?.studentSpecificField?.islamicQualification}
            />
            <ProfileField
              label="Academic Qualification"
              value={user?.studentSpecificField?.academicQualification}
            />
            <ProfileField
              label="Graduated Year"
              value={user?.studentSpecificField?.graduatedYear}
            />
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField label="Email" value={user?.email} />
            <ProfileField label="Contact Number" value={user?.contactNumber} />
            <ProfileField
              label="Alternative Number"
              value={user?.alternativeNumber}
            />
            <ProfileField
              label="Guardian Name"
              value={user?.studentSpecificField?.guardianName}
            />
            <ProfileField
              label="Guardian Contact"
              value={user?.studentSpecificField?.guardianContactNumber}
            />
            <ProfileField
              label="Guardian Alt. Contact"
              value={user?.studentSpecificField?.guardianAlternativeNumber}
            />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Month-wise Attendance History</CardTitle>
            <Select
              onValueChange={(value) => setSelectedYear(parseInt(value))}
              defaultValue={selectedYear.toString()}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Total Periods</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.map((row) => (
                  <React.Fragment key={row.month}>
                    <TableRow
                      onClick={() =>
                        setExpandedMonth(
                          expandedMonth === row.month ? null : row.month
                        )
                      }
                      className="cursor-pointer"
                    >
                      <TableCell>{row.month}</TableCell>
                      <TableCell>{row.totalPeriods}</TableCell>
                      <TableCell>{row.presentPeriods}</TableCell>
                      <TableCell>{row.percentage}%</TableCell>
                    </TableRow>
                    {expandedMonth === row.month && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.details.map((detail) => (
                                <TableRow key={detail.date}>
                                  <TableCell>{detail.date}</TableCell>
                                  <TableCell>
                                    {detail.present ? "Present" : "Absent"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
      <div className="fixed bottom-4 right-4 no-print">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
