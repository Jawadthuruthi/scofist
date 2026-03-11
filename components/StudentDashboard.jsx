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
import { formatDateForDisplay, formatMonthYear, formatDateShort } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "@/components/PrintHeader";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
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
    <>
      <div className="flex flex-col py-1">
        <span className={`text-sm font-medium ${isBold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
        {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
      </div>
      <div className="text-sm px-1 py-1">:</div>
      <div className={`text-sm ${isBold ? 'font-bold' : 'text-foreground'} min-w-0 break-words py-1`}>{value}</div>
    </>
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
  const [marks, setMarks] = useState([]);
  const [marksLoading, setMarksLoading] = useState(true);
  const [remarksList, setRemarksList] = useState([]);
  const [remarksLoading, setRemarksLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState("all");


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

  useEffect(() => {
    const fetchMarks = async () => {
      if (!currentUser?._id || !apiKey) return;
      setMarksLoading(true);
      try {
        const res = await fetch(`/api/marks?studentId=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setMarks(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching marks:", error);
      } finally {
        setMarksLoading(false);
      }
    };
    fetchMarks();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchRemarks = async () => {
      if (!currentUser?._id || !apiKey) return;
      setRemarksLoading(true);
      try {
        const res = await fetch(`/api/remarks?studentId=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.remarks) {
          setRemarksList(result.remarks || []);
        }
      } catch (error) {
        console.error("Error fetching remarks:", error);
      } finally {
        setRemarksLoading(false);
      }
    };
    fetchRemarks();
  }, [currentUser, apiKey]);


  const attendanceHistory = useMemo(() => {
    // Robust extraction of attendance records
    let records = [];
    if (attendanceData) {
      // The API often returns { studentAttendances: [...] } or just [...]
      const dataToProcess = attendanceData.studentAttendances || attendanceData;

      if (Array.isArray(dataToProcess)) {
        // Handle array of student attendance documents
        records = dataToProcess.flatMap(d => d.attendanceRecords || []);
      } else if (dataToProcess.attendanceRecords) {
        // Handle single student attendance document
        records = dataToProcess.attendanceRecords;
      } else if (Array.isArray(dataToProcess.records)) {
        // Handle direct records array
        records = dataToProcess.records;
      }
    }

    // FIXED: Calculate across ALL available years in attendance records, not just selectedYear
    const allYearsInRecords = new Set();
    records.forEach(r => allYearsInRecords.add(new Date(r.date).getFullYear()));

    // Sort years and handle empty case
    const sortedYears = Array.from(allYearsInRecords).sort((a, b) => a - b);
    if (sortedYears.length === 0) sortedYears.push(new Date().getFullYear());

    const history = [];

    // Create entries for each year's months that have data
    sortedYears.forEach(year => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const recordsForMonth = records.filter((r) => {
          const d = new Date(r.date);
          return d.getFullYear() === year && d.getMonth() === monthIndex;
        });

        if (recordsForMonth.length > 0) {
          const monthName = new Date(year, monthIndex, 1).toLocaleString("en-US", { month: "long" });
          const totalPeriods = recordsForMonth.length;
          const presentPeriods = recordsForMonth.filter((r) => r.present).length;

          const details = recordsForMonth.map((r) => ({
            date: formatDateForDisplay(r.date),
            present: r.present,
          }));

          history.push({
            year,
            month: monthName,
            monthYear: `${monthName} ${year}`,
            totalPeriods,
            presentPeriods,
            details,
            percentage: ((presentPeriods / totalPeriods) * 100).toFixed(2),
          });
        }
      }
    });

    return history;
  }, [attendanceData]);

  const academicYears = useMemo(() => {
    const yearsFromRecords = new Set();
    attendanceHistory.forEach(h => yearsFromRecords.add(h.year));

    let yearsFromBatch = [];
    if (batchName) {
      const match = batchName.match(/\d{4}/g);
      if (match) {
        const startYear = parseInt(match[0], 10);
        const endYear = match[1] ? parseInt(match[1], 10) : startYear + 1;
        for (let year = startYear; year <= endYear; year++) {
          yearsFromBatch.push(year);
        }
      }
    }

    const allYears = new Set([...yearsFromRecords, ...yearsFromBatch]);
    if (allYears.size === 0) allYears.add(new Date().getFullYear());

    return Array.from(allYears).sort((a, b) => b - a); // Sort descending (newest first)
  }, [batchName, attendanceHistory]);

  useEffect(() => {
    if (academicYears.length > 0 && !academicYears.includes(selectedYear)) {
      setSelectedYear(academicYears[0]);
    }
  }, [academicYears, selectedYear]);

  // For the chart and history card, filter by selectedYear if needed
  const filteredAttendanceHistory = useMemo(() => {
    return attendanceHistory.filter(h => h.year === selectedYear);
  }, [attendanceHistory, selectedYear]);

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
    <>
      <style>{`
        @media print {
          /* Force exact colors and backgrounds */
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            box-shadow: none !important;
          }
          
          /* Reset root and body layout */
          @page { margin: 1cm !important; size: auto; }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
            width: 100% !important;
          }

          /* Nuke all potentially hidden spacing at the top */
          .no-print, [class*="no-print"] { 
            display: none !important; 
            height: 0 !important; 
            width: 0 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            position: absolute !important;
            pointer-events: none !important;
          }

          /* Force all containers to be visible and expanded */
          [class*="overflow-"], 
          [class*="max-h-"],
          [class*="min-h-"] {
            overflow: visible !important;
            max-height: none !important;
            min-height: 0 !important;
            height: auto !important;
          }

          /* Specific resets for layout wrappers */
          .SidebarProvider, 
          [class*="sidebar-wrapper"], 
          [class*="h-screen"],
          [class*="min-h-svh"],
          main, 
          header,
          section { 
            display: block !important; 
            height: auto !important; 
            min-height: 0 !important; 
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Disable all animations and transitions in print */
          *, *::before, *::after {
            animation-delay: 0s !important;
            animation-duration: 0s !important;
            animation-iteration-count: 1 !important;
            transition-delay: 0s !important;
            transition-duration: 0s !important;
          }

          /* Reset space-y and margins on the main container children */
          .space-y-6, .space-y-4 { gap: 0 !important; }
          .space-y-6 > *, .mt-6, .pt-5, .p-4, .p-8 { 
            margin-top: 0 !important; 
            padding-top: 0 !important; 
          }
          
          /* Prevent cards from breaking across pages */
          .card-print-break { 
            break-inside: avoid !important; 
            page-break-inside: avoid !important; 
            margin-bottom: 2rem !important; 
            display: block !important;
            border: 1px solid #e2e8f0 !important;
          }

          /* Professional Table Styling for Print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1rem !important;
            table-layout: auto !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px 12px !important;
            text-align: left !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          th {
            background-color: #f8fafc !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            color: #1e293b !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          
          /* Specific column tweaks */
          .w-[60px] { width: 50px !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }

          /* Layout specific for reports */
          .print-grid-2 { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 1.5rem !important; 
          }
          .print-stack-vertical { 
            display: block !important; 
            width: 100% !important;
          }
          .print-stack-vertical > * {
            width: 100% !important;
            margin-bottom: 2rem !important;
          }
          
          .print-flex-row { 
            display: flex !important; 
            flex-direction: row !important; 
            align-items: center !important; 
            gap: 2rem !important; 
          }
        }
      `}</style>

      <div className="space-y-6 max-w-7xl mx-auto">

      <div className="no-print mb-4">
        {!hideHeader && (
          <Header
            title="DASHBOARD"
            subTitle={currentDate}
            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          />
        )}
      </div>

      <PrintHeader title="STUDENT PROFILE" apiKey={apiKey} displayOnScreen={false} />

      {/* Profile Header - Visible in Print now */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900 shadow-none card-print-break">
        <CardContent className="p-5 flex items-center gap-6">
          <Avatar className="h-24 w-24 rounded-lg flex-shrink-0">
            <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} />
            <AvatarFallback>{currentUser?.name?.[0]}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-xl font-bold mb-0.5">{currentUser?.name}</h2>
            
            <div className="flex flex-col gap-0 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground uppercase text-[10px] w-14">ID:</span> 
                <span>{currentUser?._id}</span>
              </div>
              
              {currentUser?.studentSpecificField?.status === "Active" && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground uppercase text-[10px] w-14">Class:</span> 
                  <span>{className}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground uppercase text-[10px] w-14">Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${getStatusClass(currentUser?.studentSpecificField?.status)}`}>
                  {currentUser?.studentSpecificField?.status}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="print-grid-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Personal Information */}
        <Card className="card-print-break">
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField
              label="Date of Birth"
              value={formatDateShort(currentUser?.dateOfBirth)}
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
              <>
                <div className="text-sm font-medium text-muted-foreground py-1">
                  Address
                </div>
                <div className="text-sm px-1 py-1">:</div>
                <div className="text-sm text-foreground py-1">
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Academic Info */}
        <Card className="card-print-break">
          <CardHeader>
            <CardTitle>Academic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField label="Batch" value={batchName} />
            <ProfileField
              label="Adm. Class"
              value={admissionClassName}
            />
            <ProfileField
              label="Adm. Date"
              value={formatDateShort(
                currentUser?.studentSpecificField?.admissionDate
              )}
            />
            <ProfileField
              label="Islamic Qual."
              value={currentUser?.studentSpecificField?.islamicQualification}
            />
            <ProfileField
              label="Academic Qual."
              value={currentUser?.studentSpecificField?.academicQualification}
            />
            <ProfileField
              label="Graduated Yr"
              value={currentUser?.studentSpecificField?.graduatedYear}
            />
            {currentUser?.studentSpecificField?.status === "Dropped Out" && (
              <>
                <ProfileField
                  label="Dropout Date"
                  value={formatDateShort(currentUser?.studentSpecificField?.droppedOutDate)}
                />
                <ProfileField
                  label="Dropout Class"
                  value={classes?.find(c => c._id === currentUser?.studentSpecificField?.droppedOutClass)?.name || currentUser?.studentSpecificField?.droppedOutClass}
                />
                <ProfileField
                  label="Dropout Reason"
                  value={currentUser?.studentSpecificField?.droppedOutReason}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="card-print-break">
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField label="Email" value={currentUser?.email} />
            <ProfileField label="Contact No" value={currentUser?.contactNumber} />
            <ProfileField
              label="Alt. Contact"
              value={currentUser?.alternativeNumber}
            />
            <ProfileField
              label="Guardian"
              value={currentUser?.studentSpecificField?.guardianName}
            />
            <ProfileField
              label="G. Contact"
              value={currentUser?.studentSpecificField?.guardianContactNumber}
            />
            <ProfileField
              label="G. Alt. Contact"
              value={currentUser?.studentSpecificField?.guardianAlternativeNumber}
            />
          </CardContent>
        </Card>

        {/* Pending Transactions - Moved here to be 4th in grid */}
        <Card className="bg-yellow-50/30 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900 card-print-break">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-5 w-5" />
              Pending Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto pr-2 grid grid-cols-[max-content_12px_1fr] items-start print-expand">
              {fundsLoading ? (
                <p className="col-span-3">Loading funds...</p>
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
                <p className="col-span-3">No pending transactions.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Read Books / Rental History - 5th in grid, col-span-2 on screen to pair with Pending */}
        <Card className="lg:col-span-2 print:col-span-2 card-print-break">
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

      {/* Row 1: Marks and Attendance History Table */}
      <div className={`grid grid-cols-1 ${currentUser?.studentSpecificField?.status === "Active" ? "md:grid-cols-2" : ""} gap-5 pt-5 print-stack-vertical`}>
        {/* Marks Card */}
        <Card className="flex flex-col card-print-break">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Exam Marks
              </CardTitle>
            </div>
            {marks && marks.length > 0 && (
              <div className="no-print">
                <Select onValueChange={setSelectedExamId} value={selectedExamId}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exams</SelectItem>
                    {marks.map((exam) => (
                      <SelectItem key={exam._id} value={exam._id}>
                        {exam.examName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {marksLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : marks && marks.length > 0 ? (
                <div className="space-y-6">
                  {marks
                    .filter((exam) => selectedExamId === "all" || exam._id === selectedExamId)
                    .map((exam) => {
                      const studentMarks = exam.students.find(s => s.studentId?._id === currentUser._id || s.studentId === currentUser._id);
                      if (!studentMarks) return null;

                      // Calculate totals, percentage, and rank
                      let studentTotal = 0;
                      let maxTotal = 0;
                      exam.subjects.forEach(subject => {
                        const m = studentMarks.marks?.[subject.name] || 0;
                        studentTotal += typeof m === 'number' ? m : 0;
                        maxTotal += subject.maxMark || 100;
                      });
                      const percentage = maxTotal > 0 ? ((studentTotal / maxTotal) * 100).toFixed(2) : 0;

                      // Rank calculation
                      const allStudentTotals = exam.students.map(s => {
                        let total = 0;
                        exam.subjects.forEach(subject => {
                          const m = s.marks?.[subject.name] || 0;
                          total += typeof m === 'number' ? m : 0;
                        });
                        return { studentId: s.studentId?._id || s.studentId, total };
                      });
                      allStudentTotals.sort((a, b) => b.total - a.total);
                      const rank = allStudentTotals.findIndex(s => s.studentId === currentUser._id) + 1;

                      return (
                        <div key={exam._id} className="space-y-1">
                          <div className="rounded-md border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead colSpan={3} className="text-center font-bold text-sm h-10 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                                    {exam.examName}
                                  </TableHead>
                                </TableRow>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="py-2 text-xs">Subject</TableHead>
                                  <TableHead className="py-2 text-xs text-center">Marks</TableHead>
                                  <TableHead className="py-2 text-xs text-center">Result</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exam.subjects.map((subject, sIndex) => {
                                  const mark = studentMarks.marks?.[subject.name] ?? "N/A";
                                  const isPass = typeof mark === 'number' && mark >= (subject.passMark || 40);
                                  return (
                                    <TableRow key={`${subject.name}-${sIndex}`}>
                                      <TableCell className="py-2 text-sm font-medium">{subject.name}</TableCell>
                                      <TableCell className="py-2 text-sm text-center">
                                        {mark} <span className="text-xs text-muted-foreground">/ {subject.maxMark}</span>
                                      </TableCell>
                                      <TableCell className="py-2 text-center">
                                        {typeof mark === 'number' ? (
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {isPass ? 'Pass' : 'Fail'}
                                          </span>
                                        ) : "-"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {/* Summary Row */}
                                <TableRow className="bg-indigo-50/30 dark:bg-indigo-950/20 font-bold border-t-2">
                                  <TableCell className="py-2 text-sm text-indigo-700 dark:text-indigo-300">SUMMARY</TableCell>
                                  <TableCell className="py-2 text-sm text-center">
                                    <div className="flex flex-col">
                                      <span>{studentTotal} / {maxTotal}</span>
                                      <span className="text-[10px] text-muted-foreground">{percentage}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-center">
                                    <div className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300">
                                      <span className="text-[10px] font-bold">RANK</span>
                                      <span className="text-sm">#{rank}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>

                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No exam marks records found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {currentUser?.studentSpecificField?.status === "Active" && (
          <Card className="card-print-break">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Attendance History</CardTitle>
              <div className="no-print">
                <Select
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                  defaultValue={selectedYear.toString()}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="py-2 text-xs">Month</TableHead>
                      <TableHead className="py-2 text-xs">Total</TableHead>
                      <TableHead className="py-2 text-xs">Present</TableHead>
                      <TableHead className="py-2 text-xs text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendanceHistory.length > 0 ? (
                      filteredAttendanceHistory.map((row) => (
                        <React.Fragment key={row.monthYear}>
                          <TableRow
                            onClick={() =>
                              setExpandedMonth(
                                expandedMonth === row.monthYear ? null : row.monthYear
                              )
                            }
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell className="py-2 text-sm font-medium">{row.month}</TableCell>
                            <TableCell className="py-2 text-sm">{row.totalPeriods}</TableCell>
                            <TableCell className="py-2 text-sm">{row.presentPeriods}</TableCell>
                            <TableCell className="py-2 text-sm text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${parseFloat(row.percentage) > 80 ? 'bg-green-100 text-green-700' :
                                parseFloat(row.percentage) >= 50 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                {row.percentage}%
                              </span>
                            </TableCell>
                          </TableRow>
                          {expandedMonth === row.monthYear && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={4} className="p-0">
                                <div className="p-4">
                                  <Table className="border rounded-md bg-background">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="h-8 py-1">Date</TableHead>
                                        <TableHead className="h-8 py-1 text-center">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.details.map((detail) => (
                                        <TableRow key={detail.date} className="h-8">
                                          <TableCell className="py-1 text-xs">{detail.date}</TableCell>
                                          <TableCell className="py-1 text-center">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${detail.present ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                                              }`}>
                                              {detail.present ? "Present" : "Absent"}
                                            </span>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                          No records found for {selectedYear}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 2: Attendance Chart and Remarks */}
      <div className={`grid grid-cols-1 ${currentUser?.studentSpecificField?.status === "Active" ? "md:grid-cols-2" : ""} gap-5 pt-5 print-stack-vertical`}>
        {currentUser?.studentSpecificField?.status === "Active" && (
          <Card className="card-print-break flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Attendance Chart ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex items-center justify-center">
              <div className="w-full h-full min-h-[300px] overflow-x-auto pb-2 flex justify-start">
                <BarChart
                  width={Math.max(300, filteredAttendanceHistory.length * 60 + 60)}
                  height={300}
                  data={filteredAttendanceHistory}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  barCategoryGap={20}
                >
                  <XAxis dataKey="month" tick={false} padding={{ left: 10, right: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" />
                  <Bar
                    dataKey="percentage"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  >
                    {filteredAttendanceHistory.map((entry, index) => {
                      const p = parseFloat(entry.percentage);
                      const color = p > 80 ? "#22c55e" : p >= 50 ? "#ea580c" : "#ef4444";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="flex flex-col card-print-break">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Student Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {remarksLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : remarksList && remarksList.length > 0 ? (
                <div className="space-y-4">
                  {remarksList.map((remark) => (
                    <div key={remark._id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{remark.teacherName || "Teacher"}</span>
                          <span className="text-xs text-muted-foreground">{formatDateShort(remark.date)}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${remark.status === 'very good' || remark.status === 'good' ? 'bg-green-100 text-green-700' :
                          remark.status === 'acceptable' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                          {remark.status}
                        </span>
                      </div>
                      <p className="text-sm italic text-muted-foreground">"{remark.comments}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No remarks records found.</p>
                </div>
              )}
            </div>
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
    </>
  );
}
