"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Calendar,
  User,
  Search,
  Printer,
  ChevronDown,
  Building,
  GraduationCap,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDateForDisplay } from "@/lib/utils";

export default function StudentFundClientView({
  student,
  institution = {},
  className = "",
  batchName = "",
  funds = [],
  transactions = [],
  summary = { totalBalance: 0, totalDeposits: 0, totalWithdrawals: 0, count: 0 },
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedFundFilter, setSelectedFundFilter] = useState("all");
  const [sortDirection, setSortDirection] = useState("desc");

  const admissionNo =
    student?.studentSpecificField?.admissionNumber ||
    student?.admissionNumber ||
    student?._id?.substring(0, 8).toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  const fundNames = useMemo(() => {
    const set = new Set();
    funds.forEach((f) => {
      if (f.label) set.add(f.label);
    });
    return Array.from(set);
  }, [funds]);

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (typeFilter !== "all") {
      list = list.filter(
        (t) => t.type?.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    if (selectedFundFilter !== "all") {
      list = list.filter((t) => t.fundName === selectedFundFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          (t.note && t.note.toLowerCase().includes(q)) ||
          (t.performedByName && t.performedByName.toLowerCase().includes(q)) ||
          (t.fundName && t.fundName.toLowerCase().includes(q)) ||
          String(t.amount).includes(q)
      );
    }

    if (sortDirection === "asc") {
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return list;
  }, [transactions, typeFilter, selectedFundFilter, searchQuery, sortDirection]);

  const isDebt = summary.totalBalance < 0;
  const isSurplus = summary.totalBalance > 0;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#070e0a]/40 text-slate-900 dark:text-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Printable Statement Header */}
        <div className="hidden print:block border-b pb-4 mb-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wide">
            {institution?.name || "Educational Institution"}
          </h1>
          <p className="text-xs text-slate-600">Official Student Fund Statement</p>
          <p className="text-xs text-slate-500">
            Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </div>

        {/* Student Profile & Quick Actions */}
        <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Student Photo */}
              <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm">
                {student?.profilePic?.url ? (
                  <Image
                    src={student.profilePic.url}
                    alt={student.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-10 w-10 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 text-center sm:text-left min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {student.name}
                  </h1>
                  <Badge variant="outline" className="font-semibold text-xs bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    Admn: {admissionNo}
                  </Badge>
                  <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                    Official Student Record
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {className && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>Class: <strong className="text-slate-800 dark:text-slate-200">{className}</strong></span>
                    </div>
                  )}
                  {batchName && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      <Building className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>Batch: <strong className="text-slate-800 dark:text-slate-200">{batchName}</strong></span>
                    </div>
                  )}
                  {student.contactNumber && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>{student.contactNumber}</span>
                    </div>
                  )}
                  {student.email && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Print Button */}
              <div className="shrink-0 flex sm:flex-col gap-2 print:hidden">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 text-xs font-medium"
                >
                  <Printer className="h-4 w-4" />
                  Print Statement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Net Current Balance */}
          <Card className={`border shadow-sm overflow-hidden ${
            isDebt
              ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20"
              : isSurplus
              ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90"
          }`}>
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Current Fund Balance
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    isDebt
                      ? "text-rose-600 dark:text-rose-400"
                      : isSurplus
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    ₹{Math.abs(summary.totalBalance).toFixed(2)}
                  </span>
                  <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                    isDebt
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                      : isSurplus
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {isDebt ? "Due / Debt" : isSurplus ? "In Advance" : "Cleared"}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${
                isDebt
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                  : isSurplus
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}>
                <Wallet className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          {/* Total Deposited */}
          <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Credited
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{summary.totalDeposits.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ArrowDownLeft className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          {/* Total Withdrawn */}
          <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Debited
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                  ₹{summary.totalWithdrawals.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          {/* Transactions Count */}
          <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Entries
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200 mt-1">
                  {summary.count}
                </p>
              </div>
              <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <History className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fund Breakdown by Department / Teacher */}
        {funds.length > 0 && (
          <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Fund Accounts Breakdown
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {funds.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {f.label}
                      </p>
                      {f.subLabel && (
                        <p className="text-xxs text-slate-500 dark:text-slate-400">
                          {f.subLabel}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        f.balance < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : f.balance > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      ₹{f.balance.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History & Ledger */}
        <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90 overflow-hidden">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Transaction History
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {filteredTransactions.length} of {transactions.length}
                </Badge>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <div className="relative min-w-[160px] flex-1 sm:flex-none">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search note or staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs w-full sm:w-44"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  </SelectContent>
                </Select>

                {fundNames.length > 1 && (
                  <Select value={selectedFundFilter} onValueChange={setSelectedFundFilter}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue placeholder="All Funds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Funds</SelectItem>
                      {fundNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                  onClick={() => setSortDirection((d) => (d === "desc" ? "asc" : "desc"))}
                  title={`Sort by Date: ${sortDirection === "desc" ? "Newest First" : "Oldest First"}`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Table */}
            {filteredTransactions.length > 0 ? (
              <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                      <TableHead className="w-[140px] text-xs font-bold">Date & Time</TableHead>
                      <TableHead className="w-[100px] text-xs font-bold">Type</TableHead>
                      <TableHead className="text-xs font-bold">Description / Note</TableHead>
                      <TableHead className="w-[130px] text-xs font-bold">Fund / Staff</TableHead>
                      <TableHead className="w-[110px] text-right text-xs font-bold">Amount (₹)</TableHead>
                      <TableHead className="w-[110px] text-right text-xs font-bold">Running (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx, idx) => {
                      const isDeposit = tx.type === "Deposit";
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatDateForDisplay(tx.date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[11px] font-semibold flex items-center gap-1 w-fit ${
                                isDeposit
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {isDeposit ? (
                                <ArrowDownLeft className="h-3 w-3" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3" />
                              )}
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-800 dark:text-slate-200 font-medium max-w-[250px]">
                            {tx.note || <span className="text-slate-400 italic">No description</span>}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{tx.fundName}</p>
                            {tx.performedByName && (
                              <p className="text-[10px] text-slate-500">By: {tx.performedByName}</p>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-xs text-right font-bold whitespace-nowrap ${
                              isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isDeposit ? `+₹${tx.amount.toFixed(2)}` : `-₹${tx.amount.toFixed(2)}`}
                          </TableCell>
                          <TableCell
                            className={`text-xs text-right font-bold whitespace-nowrap ${
                              tx.runningBalance < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : tx.runningBalance > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            ₹{tx.runningBalance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 border border-dashed rounded-lg">
                <Clock className="h-8 w-8 opacity-40" />
                <p className="text-sm font-medium">No transactions match your criteria</p>
                {(searchQuery || typeFilter !== "all" || selectedFundFilter !== "all") && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                      setSelectedFundFilter("all");
                    }}
                    className="text-xs text-indigo-600 h-auto p-0"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security / Verification Footer Note */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-500 py-3 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Official Real-time Ledger. Verified by {institution?.name || "Institution"}.</span>
        </div>
      </div>
    </div>
  );
}
