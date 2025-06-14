"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DollarSign,
  Plus,
  Minus,
  History,
  Calendar,
  FileText,
  Trash2,
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

const StudentsFund = ({
  batches = [],
  students = [],
  apiKey,
  role,
  teacherId,
}) => {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [studentBalance, setStudentBalance] = useState(0);
  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const { useFetchItems, useAddItem, useUpdateItem } = useCrud(
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
      enabled: !!selectedStudent && !!teacherId && !!selectedBatch,
    }
  );

  const allStudentsFund = useMemo(() => {
    return fetchStudentFundQuery.data?.allStudentsFund || [];
  }, [fetchStudentFundQuery.data]);

  const addStudentFund = useAddItem();

  const updateStudentFund = useUpdateItem();

  const studentFund = useMemo(() => {
    return fetchStudentFundQuery.data?.studentFund || {};
  }, [fetchStudentFundQuery.data]);

  const transactions = useMemo(() => {
    return (
      studentFund?.transactions?.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      ) || []
    );
  }, [studentFund]);

  useEffect(() => {
    if (fetchStudentFundQuery.data && studentFund) {
      const balance = studentFund.balance;
      setStudentBalance(balance || 0);
    }
  }, [fetchStudentFundQuery.data]);

  // Filter students based on selected batch
  const availableStudents = selectedBatch
    ? students.filter((student) => student?.batchId === selectedBatch)
    : [];

  const handleTransaction = () => {
    if (!amount || !transactionType) return;
    setShowConfirmDialog(true);
    setStudentBalance(
      transactionType === "Deposit"
        ? studentBalance + parseFloat(amount)
        : studentBalance - parseFloat(amount)
    );
  };

  const confirmTransaction = async () => {
    setLoading(true);
    try {
      const transaction = {
        type: transactionType,
        amount: parseFloat(amount),
        note,
      };
      await addStudentFund.mutateAsync({
        studentId: selectedStudent,
        teacherId,
        batchId: selectedBatch,
        transaction,
        balance: studentBalance,
      });
      await fetchStudentFundQuery.refetch();
      // Reset form
      setAmount("");
      setNote("");
      setTransactionType("");
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
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
                  <Select
                    value={selectedStudent}
                    onValueChange={setSelectedStudent}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            </CardContent>
          </Card>

          {/* Student Balance & Transaction Form */}
          {selectedStudent && (
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
                    <Loader2 className="mr-2 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="space-y-6">
                  {/* Student Info & Balance */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:bg-gradient-to-r dark:from-blue-200 dark:to-indigo-200 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 md:h-12 w-7 md:w-12">
                        <AvatarImage
                          src={selectedStudentData?.profilePic.url}
                        />
                        <AvatarFallback>
                          {selectedStudentData?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm md:text-base text-gray-900">
                          {selectedStudentData?.name}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600">
                          Student ID: {selectedStudent}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-sm text-gray-600">
                        Current Balance
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-green-600">
                        {studentBalance ? `₹ ${studentBalance}` : "0"}
                      </p>
                    </div>
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
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
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
                      <Textarea
                        id="note"
                        placeholder="Enter transaction note or description"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={1}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  {transactionType && (
                    <Button
                      onClick={handleTransaction}
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
              {selectedStudent ? (
                <div className="space-y-4">
                  <ScrollArea className="h-[320px] pr-4">
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
                            <span className="text-sm text-gray-500">
                              {formatDate(transaction.date)}
                            </span>
                          </div>
                          <p className="font-semibold text-lg">
                            {transaction.type === "Deposit" ? "+" : "-"}₹
                            {transaction.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            {transaction.note}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions found</p>
                      </div>
                    )}
                  </ScrollArea>

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
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Complete Transaction History</DialogTitle>
                        <DialogDescription>
                          All transactions for {selectedStudentData?.name}
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[80vw] md:h-[500px] pr-4">
                        <div className="space-y-4">
                          {transactions?.map((transaction) => (
                            <div
                              key={transaction._id}
                              className="border rounded-lg p-4"
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
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(transaction.date)}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="font-bold text-lg">
                                    {transaction.type === "Deposit" ? "+" : "-"}
                                    ₹{transaction.amount.toLocaleString()}
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
                      </ScrollArea>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          className="w-full !bg-destructive !text-destructive-foreground"
                          onClick={handleClearHistory}
                          disabled={updateStudentFund.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear All History
                        </Button>
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
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>All Students Balance</DialogTitle>
                        <DialogDescription>
                          Review the current fund balance for each student.
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[500px] pr-4">
                        <Table className="border border-border w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allStudentsFund.map((student) => (
                              <TableRow key={student._id}>
                                <TableCell>{student.studentId?.name}</TableCell>
                                <TableCell>{student.balance}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a student to view transaction history</p>
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
          <div className="my-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Student</p>
                <p className="font-medium">{selectedStudentData?.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Transaction Type</p>
                <p className="font-medium">{transactionType}</p>
              </div>
              <div>
                <p className="text-gray-600">Amount</p>
                <p className="font-medium">
                  ₹{parseFloat(amount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">New Balance</p>
                <p className="font-medium">₹{studentBalance || 0}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-gray-600 text-sm">Note</p>
              <p className="text-sm">{note}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransaction} disabled={loading}>
              {loading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentsFund;
