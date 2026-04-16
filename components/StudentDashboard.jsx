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
import { Calendar, Printer, BookOpen, Clock, Loader2, Wallet, IndianRupee, FileText, MessageSquare, User, Eye } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";




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
  const [activeTab, setActiveTab] = useState("PROFILE");
  const [rentalHistory, setRentalHistory] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(true);
  const [marks, setMarks] = useState([]);
  const [marksLoading, setMarksLoading] = useState(true);
  const [remarksList, setRemarksList] = useState([]);
  const [remarksLoading, setRemarksLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [couponDetails, setCouponDetails] = useState([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [selectedStandardFund, setSelectedStandardFund] = useState(null);
  const [isStandardModalOpen, setIsStandardModalOpen] = useState(false);


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
          // Filter to only include funds for the student's current batch
          if (fund.batchId !== currentUser?.studentSpecificField?.batchId) return;

          let label = "Students Fund";
          let subLabel = "";
          
          if (fund.fundType === 'Department') {
            label = `${fund.department} Fund`;
            // For Department funds, the "Role Holder" is the one who added/performed the transaction
            const lastTransaction = fund.transactions?.[fund.transactions.length - 1];
            subLabel = lastTransaction?.performedBy?.name || fund.department;
          } else {
            const roles = fund.teacherId?.roles || [];
            subLabel = fund.teacherId?.name || "Class Teacher";
            
            if (roles.includes("Teacher")) {
              label = "Students Fund";
            } else if (roles.includes("Stationary")) {
              label = "Stationary Fund";
            } else if (roles.includes("IT Lab")) {
              label = "IT Lab Fund";
            } else if (roles.length > 0) {
              label = "Staff Fund";
            }
          }

          const key = `Fund-${label}-${subLabel}`;
          const currentBatch = batches.find(b => b._id === fund.batchId)?.name || "Unknown Batch";
          
          if (fundsMap.has(key)) {
            const entry = fundsMap.get(key);
            entry.value += fund.balance; // Use balance as-is (database stores debt as negative)
            entry.records.push({
              year: currentBatch,
              holder: subLabel,
              value: fund.balance
            });
            // Support history: aggregate all transactions from these records
            entry.allTransactions = [...(entry.allTransactions || []), ...(fund.transactions || [])];
          } else {
            fundsMap.set(key, {
              label: label,
              subLabel: fund.fundType === 'Department' ? "" : subLabel,
              value: fund.balance, // Use balance as-is (database stores debt as negative)
              isInteractive: true,
              records: [{
                year: currentBatch,
                holder: subLabel,
                value: fund.balance
              }],
              allTransactions: fund.transactions || []
            });
          }
        });

        // Convert map values to list and calculate running balances
        fundsMap.forEach(item => {
          if (item.allTransactions && item.allTransactions.length > 0) {
            // Sort oldest first for balance calculation
            const sorted = [...item.allTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            let running = 0;
            sorted.forEach(t => {
              if (t.type === 'Withdrawal') {
                running -= t.amount;
              } else {
                running += t.amount;
              }
              t.calculatedBalance = running;
            });
            // Keep the sorted for display (though UI will sort descending)
            item.allTransactions = sorted;
          }
          fundsList.push(item);
        });

        // Process Coupon Fund
        const rawCoupons = couponResult.coupons || [];
        setCouponDetails(rawCoupons);
        
        const couponPendingTotal = (couponResult.stats?.totalPending || 0);
        
        if (couponPendingTotal > 0) {
          fundsList.push({
            label: "Coupon Fund",
            value: -couponPendingTotal, // Negate to show as debt
            isCoupon: true
          });
        }

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

          const details = recordsForMonth.map((r, rIdx) => ({
            id: r._id || `${r.date}-${rIdx}-${r.periodNumber}`,
            date: formatDateForDisplay(r.date),
            present: r.present,
            subject: r.subjectName || "N/A",
            teacher: r.teacherName || "N/A",
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

      {/* Premium Header */}
      <div className="no-print relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 p-8 text-white shadow-xl mb-6">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <Avatar className="h-24 w-24 rounded-2xl border-4 border-white/20 shadow-2xl ring-4 ring-blue-500/20">
              <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} className="object-cover" />
              <AvatarFallback className="bg-white/10 text-2xl font-bold backdrop-blur-md">
                {currentUser?.name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-blue-200 text-sm font-medium tracking-wider uppercase mb-1">Welcome,</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-md">
                {currentUser?.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-blue-100/80">
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10 uppercase">
                  {currentUser?._id}
                </span>
                {currentUser?.studentSpecificField?.status === "Active" ? (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    {className || "No Class"} | {batchName || "No Batch"}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {batchName || "No Batch"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button 
            variant="secondary" 
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all duration-300 group rounded-xl px-6 h-12"
            onClick={() => setActiveTab("PROFILE")}
          >
            <Eye className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
            View Profile
          </Button>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="no-print grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { id: "PROFILE", label: "My Profile", icon: User, color: "blue" },
          { id: "FINANCE", label: "Finance", icon: IndianRupee, color: "emerald" },
          { id: "LIBRARY", label: "Library", icon: BookOpen, color: "amber" },
          { id: "ATTENDANCE", label: "Attendance", icon: Calendar, color: "rose" },
          { id: "MARKS", label: "Marks", icon: FileText, color: "indigo" },
          { id: "REMARKS", label: "Remarks", icon: MessageSquare, color: "orange" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          // Color mapping to avoid dynamic class construction issues with Tailwind JIT
          const colorStyles = {
            blue: {
              activeBorder: "border-blue-500",
              activeBg: "bg-blue-50/50 dark:bg-blue-900/10",
              iconActiveBg: "bg-blue-500",
              iconInactiveBg: "bg-blue-100 dark:bg-blue-900/20",
              iconInactiveText: "text-blue-600",
              labelActive: "text-blue-700 dark:text-blue-300",
              bottomBar: "bg-blue-500"
            },
            emerald: {
              activeBorder: "border-emerald-500",
              activeBg: "bg-emerald-50/50 dark:bg-emerald-900/10",
              iconActiveBg: "bg-emerald-500",
              iconInactiveBg: "bg-emerald-100 dark:bg-emerald-900/20",
              iconInactiveText: "text-emerald-600",
              labelActive: "text-emerald-700 dark:text-emerald-300",
              bottomBar: "bg-emerald-500"
            },
            amber: {
              activeBorder: "border-amber-500",
              activeBg: "bg-amber-50/50 dark:bg-amber-900/10",
              iconActiveBg: "bg-amber-500",
              iconInactiveBg: "bg-amber-100 dark:bg-amber-900/20",
              iconInactiveText: "text-amber-600",
              labelActive: "text-amber-700 dark:text-amber-300",
              bottomBar: "bg-amber-500"
            },
            rose: {
              activeBorder: "border-rose-500",
              activeBg: "bg-rose-50/50 dark:bg-rose-900/10",
              iconActiveBg: "bg-rose-500",
              iconInactiveBg: "bg-rose-100 dark:bg-rose-900/20",
              iconInactiveText: "text-rose-600",
              labelActive: "text-rose-700 dark:text-rose-300",
              bottomBar: "bg-rose-500"
            },
            indigo: {
              activeBorder: "border-indigo-500",
              activeBg: "bg-indigo-50/50 dark:bg-indigo-900/10",
              iconActiveBg: "bg-indigo-500",
              iconInactiveBg: "bg-indigo-100 dark:bg-indigo-900/20",
              iconInactiveText: "text-indigo-600",
              labelActive: "text-indigo-700 dark:text-indigo-300",
              bottomBar: "bg-indigo-500"
            },
            orange: {
              activeBorder: "border-orange-500",
              activeBg: "bg-orange-50/50 dark:bg-orange-900/10",
              iconActiveBg: "bg-orange-500",
              iconInactiveBg: "bg-orange-100 dark:bg-orange-900/20",
              iconInactiveText: "text-orange-600",
              labelActive: "text-orange-700 dark:text-orange-300",
              bottomBar: "bg-orange-500"
            }
          };

          const s = colorStyles[item.color];

          return (
            <Card 
              key={item.id}
              className={`cursor-pointer transition-all duration-300 border-2 hover:shadow-lg group relative overflow-hidden ${
                isActive 
                  ? `${s.activeBorder} ${s.activeBg}` 
                  : "border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-800"
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
                <div className={`p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? `${s.iconActiveBg} text-white shadow-lg scale-110` 
                    : `${s.iconInactiveBg} ${s.iconInactiveText} group-hover:scale-110`
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className={`text-sm font-bold tracking-wide ${
                  isActive ? s.labelActive : "text-slate-600 dark:text-slate-400"
                }`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute bottom-0 left-0 w-full h-1 ${s.bottomBar}`}></div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-6">
        {isLoading && !initialData ? (
          <Card className="min-h-[400px] flex flex-col items-center justify-center p-12 bg-white/50 backdrop-blur-sm border-dashed">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse"></div>
            </div>
            <p className="mt-6 text-base font-medium text-slate-600 animate-pulse tracking-wide italic">
              Loading your personalized dashboard...
            </p>
          </Card>
        ) : (
          <>
            {/* Current inline profile header for Print only */}
            <Card className="hidden print:block bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900 shadow-none card-print-break mb-6">
          <CardContent className="p-5 flex items-center gap-6">
            <Avatar className="h-24 w-24 rounded-lg flex-shrink-0">
              <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-0.5">{currentUser?.name}</h2>
              
              <div className="grid grid-cols-[60px_10px_1fr] items-center text-sm text-muted-foreground">
                <span className="font-medium text-foreground text-sm">ID</span>
                <span className="text-sm">:</span>
                <span className="text-sm">{currentUser?._id}</span>
                
                {currentUser?.studentSpecificField?.status === "Active" && (
                  <>
                    <span className="font-medium text-foreground text-sm">Class</span>
                    <span className="text-sm">:</span>
                    <span className="text-sm">{className || "N/A"}</span>
                  </>
                )}
                
                <span className="font-medium text-foreground text-sm">Batch</span>
                <span className="text-sm">:</span>
                <span className="text-sm">{batchName || "N/A"}</span>
                
                <span className="font-medium text-foreground text-sm">Status</span>
                <span className="text-sm">:</span>
                <div className="flex">
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${getStatusClass(currentUser?.studentSpecificField?.status)}`}>
                    {currentUser?.studentSpecificField?.status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {activeTab === "PROFILE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {/* Personal Information */}
          <Card className="card-print-break h-full shadow-sm">
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
          <Card className="card-print-break h-full shadow-sm">
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
          <Card className="card-print-break h-full shadow-sm">
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
      </div>
      )}

      {activeTab === "FINANCE" && (
        <Card className="bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 card-print-break shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <Clock className="h-5 w-5" />
              Pending Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto pr-2 rounded-md border min-h-[100px]">
              {fundsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading financial records...</span>
                </div>
              ) : pendingFunds && pendingFunds.filter(item => item.value !== 0).length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[60px] py-2">Sl No</TableHead>
                      <TableHead className="py-2">Fund Name</TableHead>
                      <TableHead className="py-2 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingFunds.filter(item => item.value !== 0).map((item, index) => (
                      <TableRow key={index} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-2 text-muted-foreground font-medium">{index + 1}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">{item.label}</span>
                            {item.subLabel && <span className="text-[10px] text-muted-foreground uppercase">{item.subLabel}</span>}
                          </div>
                        </TableCell>
                        <TableCell 
                          className={`py-2 text-right font-bold text-sm cursor-pointer hover:underline decoration-dotted ${item.value < 0 ? 'text-red-600' : 'text-green-600'}`}
                          onClick={() => {
                            if (item.isCoupon) {
                              setIsCouponModalOpen(true);
                            } else if (item.isInteractive) {
                              setSelectedStandardFund(item);
                              setIsStandardModalOpen(true);
                            }
                          }}
                        >
                          {item.value.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Summary Row */}
                    <TableRow className="bg-muted/40 font-bold border-t-2 border-muted hover:bg-muted/40">
                      <TableCell colSpan={2} className="py-3 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-xs">
                        Total Pending Balance
                      </TableCell>
                      <TableCell className={`py-3 text-right text-base ${totalPending < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {totalPending.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                   <Clock className="h-8 w-8 opacity-20" />
                   <p className="text-sm italic">No pending transactions found.</p>
                </div>
              )}
            </div>

              {/* Standard Fund Details Modal */}
              <Dialog open={isStandardModalOpen} onOpenChange={setIsStandardModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedStandardFund?.label} Details</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-8">
                    {/* Collection Breakdown */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Collection Breakdown
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year (Batch)</TableHead>
                            <TableHead>Role Holder</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedStandardFund?.records || []).map((record, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{record.year}</TableCell>
                              <TableCell>{record.holder}</TableCell>
                              <TableCell className="text-right font-bold text-orange-600">
                                {record.value.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Full Transaction History */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fund History
                      </h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="py-2">Date</TableHead>
                              <TableHead className="py-2 text-right">Addition / Deduction</TableHead>
                              <TableHead className="py-2 text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStandardFund?.allTransactions && selectedStandardFund.allTransactions.length > 0 ? (
                              [...selectedStandardFund.allTransactions]
                                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Newest first for display
                                .map((t, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="py-2 text-[10px] leading-tight">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{formatDateShort(t.date)}</span>
                                        <span className="text-muted-foreground">
                                          {new Date(t.date).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className={`py-2 text-xs text-right font-bold ${t.type === 'Withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                                      {t.type === 'Withdrawal' ? '-' : '+'}{t.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className={`py-2 text-xs text-right font-bold ${t.calculatedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {t.calculatedBalance?.toFixed(2) || "0.00"}
                                    </TableCell>
                                  </TableRow>
                                ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs italic">
                                  No transaction history found for this fund.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Coupon Details Modal */}
              <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Coupon Fund Details</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="py-2 w-[60px]">Sl No</TableHead>
                          <TableHead className="py-2">Year</TableHead>
                          <TableHead className="py-2">Coupon No.</TableHead>
                          <TableHead className="py-2 text-right">Fund</TableHead>
                          <TableHead className="py-2 text-right">Total Paid</TableHead>
                          <TableHead className="py-2 text-right">Balance</TableHead>
                          <TableHead className="py-2">Payment History</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {couponDetails.map((coupon, index) => {
                          const paid = (coupon.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                          const balance = (coupon.couponAmount || 0) - paid;
                          return (
                            <TableRow key={coupon._id} className="align-top">
                              <TableCell className="py-3 text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="py-3 font-bold text-sm">
                                {coupon.academicYear}
                              </TableCell>
                              <TableCell className="py-3 text-sm">
                                {coupon.couponNumber || "N/A"}
                              </TableCell>
                              <TableCell className="py-3 text-right text-sm">₹{coupon.couponAmount.toFixed(2)}</TableCell>
                              <TableCell className="py-3 text-right text-sm text-green-600">₹{paid.toFixed(2)}</TableCell>
                              <TableCell className="py-3 text-right font-bold text-orange-600 text-sm">
                                ₹{balance.toFixed(2)}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="space-y-1">
                                  {coupon.payments && coupon.payments.length > 0 ? (
                                    coupon.payments.map((p, pIdx) => (
                                      <div key={pIdx} className="flex items-center justify-between gap-4 text-[10px] bg-muted/30 px-2 py-1 rounded border border-muted/50">
                                        <span className="text-muted-foreground">{formatDateShort(p.date)}</span>
                                        <span className="font-bold text-green-700">₹{p.amount.toFixed(2)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">No payments recorded</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {couponDetails.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                              No coupon records found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>

          </CardContent>
        </Card>
      )}

      {activeTab === "LIBRARY" && (
        <Card className="lg:col-span-2 print:col-span-2 card-print-break shadow-sm">
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
      )}

      {activeTab === "MARKS" && (
        <div className="grid grid-cols-1 gap-5 pt-5 print-stack-vertical">
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
        </div>
      )}

      {activeTab === "ATTENDANCE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 print-stack-vertical">
          {/* Attendance History */}
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
                                        <TableHead className="h-8 py-1">Subject (Teacher)</TableHead>
                                        <TableHead className="h-8 py-1 text-center">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.details.map((detail, dIdx) => (
                                        <TableRow key={`${detail.date}-${dIdx}`} className="h-8">
                                          <TableCell className="py-1 text-xs">{detail.date}</TableCell>
                                          <TableCell className="py-1 text-xs font-medium">
                                            {detail.subject} <span className="text-muted-foreground font-normal">({detail.teacher})</span>
                                          </TableCell>
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

          {/* Attendance Chart */}
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
        </div>
      )}

      {activeTab === "REMARKS" && (
        <Card className="flex flex-col card-print-break mt-5">
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
              ) : (remarksList && remarksList.length > 0) ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[60px] py-3 pl-4 text-xs">Sl No</TableHead>
                        <TableHead className="py-3 text-xs">Date</TableHead>
                        <TableHead className="py-3 text-xs w-[40%]">Remarks</TableHead>
                        <TableHead className="py-3 text-xs">Teacher</TableHead>
                        <TableHead className="py-3 text-xs text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...remarksList]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((remark, index) => (
                        <TableRow key={remark._id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3 pl-4 text-sm text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell className="py-3 text-sm font-medium">
                            {formatDateShort(remark.date)}
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm text-foreground leading-relaxed italic">"{remark.comments}"</p>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground">
                            {remark.teacherName || "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              remark.status === 'very good' || remark.status === 'good' ? 'bg-green-100 text-green-700' :
                              remark.status === 'acceptable' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {remark.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
      )}
          </>
        )}
      <div className="fixed bottom-4 right-4 no-print">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
      </div>
    </div>
  </>
  );
}
