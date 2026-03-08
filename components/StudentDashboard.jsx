"use client";
import React, { useMemo, useState, useEffect } from "react";
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
import { Calendar, Printer, BookOpen, Clock, Loader2 } from "lucide-react";
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
import dynamic from "next/dynamic";




const formatDateWithoutDay = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ProfileField = ({ label, subLabel, value, isBold }) =>
  (value || value === 0 || typeof value === 'string') ? (
    <div className="flex justify-between py-2 border-b border-border">
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${isBold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
        {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
      </div>
      <span className={`text-sm ${isBold ? 'font-bold' : 'text-foreground'}`}>{value}</span>
    </div>
  ) : null;

export default function StudentDashboard({
  user,
  apiKey,
  classes,
  batches,
  attendanceData: initialData,
  hideHeader = false,
}) {
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const { useFetchItems } = useCrud("studentAttendances", apiKey);
  const { data: fetchedData, isLoading, error } = useFetchItems(
    0,
    0,
    {
      studentId: currentUser?._id,
    },
    { enabled: !initialData }
  );

  const attendanceData = initialData || fetchedData;
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [pendingFunds, setPendingFunds] = useState([]); // Array of fund objects
  const [fundsLoading, setFundsLoading] = useState(true);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(true);


  const className = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.classId
  )?.name;

  const admissionClassName = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.admissionClassId
  )?.name;

  const batchName = batches.find(
    (b) => b._id === currentUser?.studentSpecificField?.batchId
  )?.name;

  useEffect(() => {
    const fetchFunds = async () => {
      setFundsLoading(true);
      const fundsList = [];

      try {
        // 1. Fetch All Student Funds (Department + Individual)
        // Removed batchId to fetch all history for aggregation
        const allFundsPromise = fetch(`/api/studentsFund?studentId=${currentUser._id}&getAll=true`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        }).then(res => res.ok ? res.json() : { studentFunds: [] });

        // 2. Fetch Coupon Fund (Search by Student ID)
        const couponPromise = fetch(`/api/student-coupons?search=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        }).then(res => res.ok ? res.json() : { stats: { totalPending: 0 } });

        const [fundsResult, couponResult] = await Promise.all([
          allFundsPromise,
          couponPromise
        ]);

        // Process Standard Funds with Aggregation
        const fundsMap = new Map();

        (fundsResult.studentFunds || []).forEach(fund => {
          if (fund.fundType === 'Department') {
            const key = `Dept-${fund.department}`;
            if (fundsMap.has(key)) {
              fundsMap.get(key).value += fund.balance;
            } else {
              fundsMap.set(key, {
                label: `${fund.department} Fund`,
                value: fund.balance
              });
            }
          } else {
            // Individual Fund
            const teacherName = fund.teacherId?.name || "Class Teacher";
            const key = `Indiv-${teacherName}`;
            if (fundsMap.has(key)) {
              fundsMap.get(key).value += fund.balance;
            } else {
              fundsMap.set(key, {
                label: "Students Fund",
                subLabel: teacherName,
                value: fund.balance
              });
            }
          }
        });

        // Convert map values to list
        fundsMap.forEach(item => fundsList.push(item));

        // Process Coupon Fund
        fundsList.push({
          label: "Coupon Fund",
          value: couponResult.stats?.totalPending || 0
        });

        // Process Coupon Fund
        fundsList.push({
          label: "Coupon Fund",
          value: couponResult.stats?.totalPending || 0
        });

        setPendingFunds(fundsList);
      } catch (error) {
        console.error("Error fetching pending funds:", error);
        setPendingFunds([]);
      } finally {
        setFundsLoading(false);
      }
    };

    if (currentUser?._id && currentUser?.studentSpecificField?.batchId && apiKey) {
      fetchFunds();
    } else {
      setFundsLoading(false);
    }
  }, [currentUser, classes, apiKey]);

  useEffect(() => {
    const fetchRentals = async () => {
      if (!currentUser?._id || !apiKey) return;
      setRentalsLoading(true);
      try {
        const res = await fetch(`/api/rental?studentId=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setRentalHistory(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching rental history:", error);
      } finally {
        setRentalsLoading(false);
      }
    };
    fetchRentals();
  }, [currentUser, apiKey]);


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
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "Dropped Out":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "Graduated":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const totalPending = useMemo(() => {
    if (!pendingFunds) return 0;
    return pendingFunds.reduce((acc, item) => {
      if (typeof item.value === 'number') {
        return acc + item.value;
      }
      return acc;
    }, 0);
  }, [pendingFunds]);


  return (
    <div className="flex flex-col space-y-4">
      {!hideHeader && (
        <Header
          title="DASHBOARD"
          subTitle={currentDate}
          icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
        />
      )}

      {/* Profile Header */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 rounded-lg">
              <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold">{currentUser?.name}</h2>
              <p className="text-muted-foreground">Admission ID: {currentUser?._id}</p>
              {currentUser?.studentSpecificField?.status === "Active" && (
                <p className="text-muted-foreground">Class: {className}</p>
              )}
              <p className="text-muted-foreground">
                Status:{" "}
                <span
                  className={`px-2 py-1 rounded-md ${getStatusClass(
                    currentUser?.studentSpecificField?.status
                  )}`}
                >
                  {currentUser?.studentSpecificField?.status}
                </span>
              </p>

            </div>
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
              value={formatDateForDisplay(currentUser?.dateOfBirth)}
            />
            <ProfileField
              label="Blood Group"
              value={currentUser?.studentSpecificField?.bloodGroup}
            />
            <ProfileField
              label="Aadhar No"
              value={currentUser?.studentSpecificField?.aadharNo}
            />
            {currentUser?.address && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Address
                </span>
                <div className="text-sm text-foreground text-right">
                  {currentUser.address.houseName && (
                    <div>{currentUser.address.houseName}</div>
                  )}
                  {(currentUser.address.place || currentUser.address.postOffice) && (
                    <div>
                      {[currentUser.address.place, currentUser.address.postOffice]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {(currentUser.address.district ||
                    currentUser.address.state ||
                    currentUser.address.pin) && (
                      <div>
                        {[currentUser.address.district, currentUser.address.state]
                          .filter(Boolean)
                          .join(", ")}
                        {currentUser.address.pin && ` - ${currentUser.address.pin}`}
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
                currentUser?.studentSpecificField?.admissionDate
              )}
            />
            <ProfileField
              label="Islamic Qualification"
              value={currentUser?.studentSpecificField?.islamicQualification}
            />
            <ProfileField
              label="Academic Qualification"
              value={currentUser?.studentSpecificField?.academicQualification}
            />
            <ProfileField
              label="Graduated Year"
              value={currentUser?.studentSpecificField?.graduatedYear}
            />
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField label="Email" value={currentUser?.email} />
            <ProfileField label="Contact Number" value={currentUser?.contactNumber} />
            <ProfileField
              label="Alternative Number"
              value={currentUser?.alternativeNumber}
            />
            <ProfileField
              label="Guardian Name"
              value={currentUser?.studentSpecificField?.guardianName}
            />
            <ProfileField
              label="Guardian Contact"
              value={currentUser?.studentSpecificField?.guardianContactNumber}
            />
            <ProfileField
              label="Guardian Alt. Contact"
              value={currentUser?.studentSpecificField?.guardianAlternativeNumber}
            />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pending Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto pr-2">
              {fundsLoading ? (
                <p>Loading funds...</p>
              ) : pendingFunds && pendingFunds.length > 0 ? (
                <>
                  {pendingFunds.map((item, index) => (
                    <ProfileField
                      key={index}
                      label={item.label}
                      subLabel={item.subLabel}
                      value={typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                      isBold={item.isBold}
                    />
                  ))}
                  <ProfileField label="Total Pending" value={totalPending.toFixed(2)} isBold={true} />
                </>
              ) : (
                <p>No pending transactions.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Read Books / Rental History */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Read Books History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto pr-2">
              {rentalsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : rentalHistory && rentalHistory.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[60px]">Sl No</TableHead>
                        <TableHead>Book Name</TableHead>
                        <TableHead>Rented Date</TableHead>
                        <TableHead>Returned Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentalHistory.map((rental, index) => (
                        <TableRow key={rental._id}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {rental.bookId?.name || "Unknown Book"}
                            <div className="text-xs text-muted-foreground">
                              {rental.bookId?.prefix && rental.bookId?.number
                                ? `${rental.bookId.prefix}-${rental.bookId.number}`
                                : rental.bookId?.number || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatDateWithoutDay(rental.rentedDate)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {rental.receivedDate ? (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Clock className="h-3 w-3" />
                                {formatDateWithoutDay(rental.receivedDate)}
                              </div>
                            ) : (
                              <span className="text-orange-600 dark:text-orange-400 font-medium">
                                Currently Reading
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No book rental history found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {currentUser?.studentSpecificField?.status === "Active" && (
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
      )}
      <div className="fixed bottom-4 right-4 no-print">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>


    </div>
  );
}
