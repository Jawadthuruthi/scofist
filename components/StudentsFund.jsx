"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DollarSign,
  Plus,
  Minus,
  History,
  Calendar,
  FileText,
  Trash2,
  Loader,
} from "lucide-react";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";

const StudentsFund = ({ batches = [], students = [], apiKey, teacherId }) => {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [studentBalance, setStudentBalance] = useState(0);
  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showClearHistoryDialogue, setShowClearHistoryDialogue] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const amountInputRef = useRef(null);
  const noteInputRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const finalConfirmButtonRef = useRef(null);

  const printRef = useRef();
  const allStudentsFundRef = useRef();

  const isMobile = useIsMobile();

  const { useFetchItems, useAddItem, useUpdateItem, useAddBatch } = useCrud(
    "studentsFund",
    apiKey
  );

  const fetchStudentFundQuery = useFetchItems(
    null,
    null,
    {
      studentId: selectedStudent,
      teacherId,
      batchId: selectedBatch,
    },
    {
      enabled: !!teacherId && !!selectedBatch,
    }
  );

  const allStudentsFund = useMemo(() => {
    return fetchStudentFundQuery.data?.allStudentsFund || [];
  }, [fetchStudentFundQuery.data, selectedBatch]);

  const allStudentBalance = useMemo(() => {
    return allStudentsFund.reduce((total, studentFund) => {
      return total + (studentFund.balance || 0);
    }, 0);
  }, [allStudentsFund]);

  const addStudentFund = useAddItem();

  const addBatchFund = useAddBatch();

  const updateStudentFund = useUpdateItem();

  const studentFund = useMemo(() => {
    return fetchStudentFundQuery.data?.studentFund || {};
  }, [fetchStudentFundQuery.data, selectedStudent, selectedBatch]);

  const transactions = useMemo(() => {
    return (
      studentFund?.transactions?.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      ) || []
    );
  }, [studentFund, selectedStudent]);

  useEffect(() => {
    if (fetchStudentFundQuery.data && studentFund) {
      const balance = studentFund.balance;
      setStudentBalance(balance || 0);
    }
  }, [studentFund, selectedStudent]);

  useEffect(() => {
    if (transactionType && amountInputRef.current) {
      setTimeout(() => {
        amountInputRef.current.focus();
      }, 0);
    }
  }, [transactionType]);
  useEffect(() => {
    setSelectedStudent("");
  }, [selectedBatch]);

  useEffect(() => {
    if (showConfirmDialog && finalConfirmButtonRef.current) {
      setTimeout(() => {
        finalConfirmButtonRef.current.focus();
      }, 0);
    }
  }, [showConfirmDialog]);

  // Filter students based on selected batch
  const availableStudents = useMemo(() => {
    return students.filter((student) => student.batchId === selectedBatch);
  }, [selectedBatch]);

  const selectedBatchData = useMemo(() => {
    return batches.find((batch) => batch._id === selectedBatch) || {};
  }, [selectedBatch]);

  const dropdownOptions = useMemo(() => {
    if (!selectedBatch) return [];

    const batchOption = {
      value: selectedBatchData._id,
      label: selectedBatchData.name,
      isBatch: true, // Custom property to identify the batch option
    };

    const studentOptions = formatOptions(availableStudents);

    return [batchOption, ...studentOptions];
  }, [selectedBatch, availableStudents, selectedBatchData]);

  const handleTransaction = () => {
    if (!amount || !transactionType) return;
    setShowConfirmDialog(true);
  };

  const confirmTransaction = async () => {
    setLoading(true);

    const isBatchTransaction = selectedStudent === selectedBatch;

    // Create transaction object
    const transaction = {
      type: transactionType,
      amount: parseFloat(amount),
      note,
    };

    // Reset form fields immediately
    setAmount("");
    setNote("");
    setTransactionType("");
    setShowConfirmDialog(false);

    try {
      if (isBatchTransaction) {
        // Handle batch transaction
        await addBatchFund.mutateAsync({
          batchId: selectedBatch,
          teacherId,
          transaction,
        });
      } else {
        // Handle single student transaction with optimistic update
        const originalBalance = studentBalance;
        const newBalance =
          (transaction.type === "Deposit"
            ? originalBalance + transaction.amount
            : originalBalance - transaction.amount) || 0;

        // Optimistically update UI
        setStudentBalance(newBalance);

        await addStudentFund.mutateAsync({
          studentId: selectedStudent,
          teacherId,
          batchId: selectedBatch,
          transaction,
          balance: newBalance,
        });
      }

      // Refetch data to ensure UI is in sync with the server
      await fetchStudentFundQuery.refetch();
    } catch (error) {
      console.error("Transaction failed:", error);
      if (!isBatchTransaction) {
        // Revert optimistic update on failure for single student transaction
        setStudentBalance(originalBalance); // Re-set to the original state before refetch
      }
      // Consider adding a user notification (e.g., a toast) here to inform them of the failure.
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await updateStudentFund.mutateAsync({
        data: {
          studentId: selectedStudent,
          teacherId,
          batchId: selectedBatch,
        },
      });
      await fetchStudentFundQuery.refetch();
      setShowHistoryDialog(false);
      setShowClearHistoryDialogue(false);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedStudentData = students.find((s) => s._id === selectedStudent);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Transaction History - ${selectedStudentData?.name}`,
  });
  const handleAllStudentsFundPrint = useReactToPrint({
    contentRef: allStudentsFundRef,
    documentTitle: `All Students Balance - ${selectedBatchData?.name}`,
  });

  const handleDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;

    const element = printRef.current;
    const opt = {
      margin: 0.5,
      filename: `Transaction_History_${new Date().toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };
  const handleAllStudentsFundDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;

    const element = allStudentsFundRef.current;
    const opt = {
      margin: 0.5,
      filename: `All_Students_Balance_${selectedBatchData?.name}_${new Date().toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-screen">
      <Header title="STUDENTS FUND" subTitle="Review Student Fund Activities" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch._id} value={batch._id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedBatch && (
                  <div className="space-y-2">
                    <MultiSelect
                      options={dropdownOptions}
                      onValueChange={setSelectedStudent}
                      value={selectedStudent}
                      placeholder="Select a student"
                      multiSelect={false}
                    />
                  </div>
                )}
              </>
            </CardContent>
          </Card>

          {/* Student Balance & Transaction Form */}
          {(selectedStudent || selectedBatch) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fund Management
                </CardTitle>
                <CardDescription>
                  Current balance and transaction controls
                </CardDescription>
              </CardHeader>
              {fetchStudentFundQuery.isLoading ? (
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-center">
                    <Loader className="mr-2 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="space-y-6">
                  {/* Student Info & Balance */}
                  <div className="flex items-center justify-between p-4 bg-accent rounded-lg border">
                    <div className="flex items-center gap-3">
                      {selectedStudent && selectedStudent !== selectedBatch ? (
                        <>
                          <Avatar className="h-7 md:h-12 w-7 md:w-12">
                            <AvatarImage
                              src={selectedStudentData?.profilePic.url}
                            />
                            <AvatarFallback>
                              {selectedStudentData?.name
                                ?.charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-sm md:text-base text-foreground">
                              {selectedStudentData?.name}
                            </h3>
                            <p className="text-xs md:text-sm text-accent-foreground">
                              Student ID: {selectedStudent}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <h3 className="font-semibold text-sm md:text-base text-foreground">
                            {selectedBatchData?.name}
                          </h3>
                        </div>
                      )}
                    </div>
                    {selectedStudent && selectedStudent !== selectedBatch && (
                      <div className="text-right">
                        <p className="text-xs md:text-sm text-accent-foreground">
                          Current Balance
                        </p>
                        <p
                          className={`text-lg md:text-2xl font-bold ${
                            studentBalance < 0
                              ? "text-destructive"
                              : "text-green-600"
                          }`}
                        >
                          {studentBalance
                            ? `₹ ${studentBalance?.toFixed(2)}`
                            : "₹ 0.00"}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Transaction Type Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={
                        transactionType === "Deposit" ? "default" : "outline"
                      }
                      onClick={() => setTransactionType("Deposit")}
                      className="h-16 flex-col gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Deposit
                    </Button>
                    <Button
                      variant={
                        transactionType === "Withdrawal" ? "default" : "outline"
                      }
                      onClick={() => setTransactionType("Withdrawal")}
                      className={`h-16 flex-col gap-2 ${transactionType === "Withdrawal" ? "!bg-destructive !text-destructive-foreground" : ""}`}
                    >
                      <Minus className="h-5 w-5" />
                      Withdrawal
                    </Button>
                  </div>

                  {/* Amount Input */}
                  {transactionType && (
                    <div
                      className="space-y-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          noteInputRef.current.focus();
                        }
                      }}
                    >
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        ref={amountInputRef}
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="1"
                        step="0.01"
                      />
                    </div>
                  )}

                  {/* Note Input */}
                  {transactionType && (
                    <div className="space-y-2">
                      <Label htmlFor="note">Note</Label>
                      <Input
                        ref={noteInputRef}
                        id="note"
                        placeholder="Enter transaction note or description"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            confirmButtonRef.current.focus();
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  {transactionType && (
                    <Button
                      ref={confirmButtonRef}
                      onClick={handleTransaction}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleTransaction();
                        }
                      }}
                      disabled={!amount || loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? "Processing..." : `Confirm ${transactionType}`}
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>Recent fund activities</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStudent && selectedStudent !== selectedBatch ? (
                <div className="space-y-4">
                  <div className="max-h-[320px] overflow-y-auto hide-scrollbar">
                    {transactions?.length > 0 ? (
                      transactions?.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction._id}
                          className="border-b pb-4 mb-4 last:border-b-0"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant={
                                transaction.type === "Deposit"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {transaction.type}
                            </Badge>
                            <span className="text-sm text-accent-foreground">
                              {formatDate(transaction.date)}
                            </span>
                          </div>
                          <p className="font-semibold text-lg">
                            {transaction.type === "Deposit" ? "+" : "-"}₹
                            {transaction.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-accent-foreground mb-1">
                            {transaction.note}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-accent-foreground py-8">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions found</p>
                      </div>
                    )}
                  </div>

                  <Dialog
                    open={showHistoryDialog}
                    onOpenChange={setShowHistoryDialog}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        View Full History
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh]">
                      <div
                        className="space-y-4 max-h-full overflow-y-auto hide-scrollbar  "
                        ref={printRef}
                      >
                        <DialogHeader>
                          <DialogTitle>
                            Complete Transaction History
                          </DialogTitle>
                          <DialogDescription>
                            All transactions for {selectedStudentData?.name}
                          </DialogDescription>
                        </DialogHeader>

                        {transactions?.map((transaction) => (
                          <div
                            key={transaction._id}
                            className="border rounded-lg p-4 break-inside-avoid"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge
                                variant={
                                  transaction.type === "Deposit"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {transaction.type}
                              </Badge>
                              <div className="flex items-center gap-2 text-sm text-accent-foreground">
                                <Calendar className="h-4 w-4" />
                                {formatDate(transaction.date)}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-bold text-lg">
                                  {transaction.type === "Deposit" ? "+" : "-"}₹
                                  {transaction.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-800">
                                {transaction.note}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <div className="flex items-center justify-between w-full gap-2">
                          {isMobile ? (
                            <Button
                              variant="default"
                              onClick={handleDownloadPDF}
                            >
                              Download
                            </Button>
                          ) : (
                            <Button variant="default" onClick={handlePrint}>
                              Print
                            </Button>
                          )}

                          <Button variant="destructive">
                            <Dialog
                              open={showClearHistoryDialogue}
                              onOpenChange={setShowClearHistoryDialogue}
                            >
                              <DialogTrigger asChild>
                                <span className="flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" />
                                  Clear History
                                </span>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Clear History</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to clear the history
                                    for {selectedStudentData?.name}?
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setShowClearHistoryDialogue(false);
                                      setShowHistoryDialog(false);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    className="!bg-destructive !text-destructive-foreground"
                                    onClick={handleClearHistory}
                                    disabled={updateStudentFund.isPending}
                                  >
                                    Clear
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={showBalanceDialog}
                    onOpenChange={setShowBalanceDialog}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        View All Students Balance
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh]">
                      <div
                        className="max-h-full overflow-y-auto hide-scrollbar "
                        ref={allStudentsFundRef}
                      >
                        <DialogHeader>
                          <DialogTitle>All Students Balance</DialogTitle>
                          <DialogDescription>
                            Review the current fund balance for each student of{" "}
                            {selectedBatchData?.name}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-between border border-border items-center bg-accent/10 p-2 rounded-md my-4">
                          <span className="text-base font-medium text-muted-foreground">
                            Total Balance
                          </span>
                          <span className="text-lg font-extrabold text-primary">
                            {allStudentBalance?.toFixed(2)}
                          </span>
                        </div>
                        <Table className="border border-border w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allStudentsFund.map((student) => (
                              <TableRow
                                key={student._id}
                                className="break-inside-avoid"
                              >
                                <TableCell>{student.studentId?.name}</TableCell>
                                <TableCell>
                                  {student.balance?.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <DialogFooter>
                        {isMobile ? (
                          <Button
                            variant="default"
                            onClick={handleAllStudentsFundDownloadPDF}
                          >
                            Download
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            onClick={handleAllStudentsFundPrint}
                          >
                            Print
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="text-center text-accent-foreground py-8 space-y-4">
                  <History className="h-12 w-12 mx-auto opacity-50" />
                  <p>Select a student to view transaction history</p>
                  {selectedBatch && (
                    <Dialog
                      open={showBalanceDialog}
                      onOpenChange={setShowBalanceDialog}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <FileText className="h-4 w-4 mr-2" />
                          View All Students Balance
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[80vh]">
                        <div
                          className="max-h-full overflow-y-auto hide-scrollbar "
                          ref={allStudentsFundRef}
                        >
                          <DialogHeader>
                            <DialogTitle>All Students Balance</DialogTitle>
                            <DialogDescription>
                              Review the current fund balance for each student
                              of {selectedBatchData?.name}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-between border border-border items-center bg-accent/10 p-2 rounded-md my-4">
                            <span className="text-base font-medium text-muted-foreground">
                              Total Balance
                            </span>
                            <span className="text-lg font-extrabold text-primary">
                              {allStudentBalance?.toFixed(2)}
                            </span>
                          </div>
                          <Table className="border border-border w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allStudentsFund.map((student) => (
                                <TableRow
                                  key={student._id}
                                  className="break-inside-avoid"
                                >
                                  <TableCell>
                                    {student.studentId?.name}
                                  </TableCell>
                                  <TableCell>
                                    {student.balance?.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <DialogFooter>
                          {isMobile ? (
                            <Button
                              variant="default"
                              onClick={handleAllStudentsFundDownloadPDF}
                            >
                              Download
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              onClick={handleAllStudentsFundPrint}
                            >
                              Print
                            </Button>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to process this{" "}
              {transactionType?.toLowerCase()} transaction?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-accent rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-accent-foreground">
                  {selectedStudent === selectedBatch ? "Batch" : "Student"}
                </p>
                <p className="font-medium">
                  {selectedStudent === selectedBatch
                    ? selectedBatchData?.name
                    : selectedStudentData?.name}
                </p>
              </div>
              <div>
                <p className="text-accent-foreground">Transaction Type</p>
                <p className="font-medium">{transactionType}</p>
              </div>
              <div>
                <p className="text-accent-foreground">Amount</p>
                <p className="font-medium">₹{parseFloat(amount || 0)}</p>
              </div>
              {selectedStudent !== selectedBatch && (
                <div>
                  <p className="text-accent-foreground">New Balance</p>
                  <p className="font-medium">
                    ₹
                    {transactionType === "Deposit"
                      ? studentBalance + parseFloat(amount)
                      : studentBalance - parseFloat(amount) || 0}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-accent-foreground text-sm">Note</p>
              <p className="text-sm">{note}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              ref={finalConfirmButtonRef}
              onClick={confirmTransaction}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  confirmTransaction();
                }
              }}
            >
              {loading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentsFund;
