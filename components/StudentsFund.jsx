"use client";

import { useState, useEffect } from "react";
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
  User,
  GraduationCap,
  Calendar,
  FileText,
} from "lucide-react";
import Header from "./Header";

const StudentsFund = ({
  classes = [
    { _id: "CS-2024", name: "Computer Science 2024", teacherId: "T001" },
    { _id: "EE-2024", name: "Electrical Engineering 2024", teacherId: "T002" },
    { _id: "ME-2024", name: "Mechanical Engineering 2024", teacherId: "T001" },
  ],
  students = [
    {
      _id: "S001",
      name: "John Smith",
      profilePic: "",
      studentSpecificField: { classId: "CS-2024" },
    },
    {
      _id: "S002",
      name: "Sarah Johnson",
      profilePic: "",
      studentSpecificField: { classId: "CS-2024" },
    },
    {
      _id: "S003",
      name: "Mike Davis",
      profilePic: "",
      studentSpecificField: { classId: "EE-2024" },
    },
    {
      _id: "S004",
      name: "Emily Brown",
      profilePic: "",
      studentSpecificField: { classId: "ME-2024" },
    },
  ],
  apiKey,
  role = "College Admin", // or "Teacher"
  teacherId = "T001",
}) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentBalance, setStudentBalance] = useState(0);
  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock transaction history data
  const mockHistory = [
    {
      _id: "1",
      teacherId: "T001",
      teacherName: "Dr. Anderson",
      amount: 500,
      type: "Deposit",
      note: "Monthly allowance deposit",
      date: "2024-06-10T10:30:00Z",
    },
    {
      _id: "2",
      teacherId: "T002",
      teacherName: "Prof. Williams",
      amount: 150,
      type: "Withdrawal",
      note: "Book purchase expenses",
      date: "2024-06-08T14:20:00Z",
    },
    {
      _id: "3",
      teacherId: "T001",
      teacherName: "Dr. Anderson",
      amount: 300,
      type: "Deposit",
      note: "Scholarship fund addition",
      date: "2024-06-05T09:15:00Z",
    },
  ];

  // Filter classes based on role
  const availableClasses =
    role === "Teacher"
      ? classes.filter((cls) => cls.teacherId === teacherId)
      : classes;

  // Filter students based on selected class
  const availableStudents = selectedClass
    ? students.filter((student) => student?.classId === selectedClass)
    : [];

  // Auto-select class for teachers
  useEffect(() => {
    if (role === "Teacher" && availableClasses.length === 1) {
      setSelectedClass(availableClasses[0]._id);
    }
  }, [role, availableClasses]);

  // Mock function to fetch student balance
  useEffect(() => {
    if (selectedStudent) {
      // Simulate API call
      setStudentBalance(1250); // Mock balance
      setTransactionHistory(mockHistory);
    }
  }, [selectedStudent]);

  const handleTransaction = () => {
    if (!amount || !note || !transactionType) return;
    setShowConfirmDialog(true);
  };

  const confirmTransaction = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newBalance =
        transactionType === "Deposit"
          ? studentBalance + parseFloat(amount)
          : studentBalance - parseFloat(amount);

      setStudentBalance(newBalance);

      // Add to history
      const newTransaction = {
        _id: Date.now().toString(),
        teacherId: teacherId,
        teacherName: "Current User",
        amount: parseFloat(amount),
        type: transactionType,
        note: note,
        date: new Date().toISOString(),
      };

      setTransactionHistory((prev) => [newTransaction, ...prev]);

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
    <div className="min-h-screen md:max-w-7xl mx-auto">
      <Header
        title="STUDENTS FUND"
        subTitle="Log, Track, and Review Student Fund Activities"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Class Selection
              </CardTitle>
              <CardDescription>
                {role === "College Admin"
                  ? "Select a class to manage student funds"
                  : "Your assigned class"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {role === "College Admin" ? (
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border">
                  <p className="font-medium text-blue-900">
                    {availableClasses[0]?.name || "No class assigned"}
                  </p>
                  <p className="text-sm text-blue-600">
                    Class ID: {availableClasses[0]?._id}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Selection */}
          {selectedClass && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Selection
                </CardTitle>
                <CardDescription>
                  Choose a student to manage their fund
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

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
              <CardContent className="space-y-6">
                {/* Student Info & Balance */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-7 md:h-12 w-7 md:w-12">
                      <AvatarImage src={selectedStudentData?.profilePic.url} />
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
                      ₹{studentBalance.toLocaleString()}
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
                    className="h-16 flex-col gap-2"
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
                      rows={3}
                    />
                  </div>
                )}

                {/* Submit Button */}
                {transactionType && (
                  <Button
                    onClick={handleTransaction}
                    disabled={!amount || !note || loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Processing..." : `Confirm ${transactionType}`}
                  </Button>
                )}
              </CardContent>
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
                  <ScrollArea className="h-[400px] pr-4">
                    {transactionHistory.slice(0, 5).map((transaction) => (
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
                        <p className="text-xs text-gray-500">
                          By: {transaction.teacherName}
                        </p>
                      </div>
                    ))}
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
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-4">
                          {transactionHistory.map((transaction) => (
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
                                  <p className="text-sm text-gray-600">
                                    Amount
                                  </p>
                                  <p className="font-bold text-lg">
                                    {transaction.type === "Deposit" ? "+" : "-"}
                                    ₹{transaction.amount.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Processed by
                                  </p>
                                  <p className="font-medium">
                                    {transaction.teacherName}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3">
                                <p className="text-sm text-gray-600">Note</p>
                                <p className="text-gray-800">
                                  {transaction.note}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
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
                <p className="font-medium">
                  ₹
                  {(transactionType === "Deposit"
                    ? studentBalance + parseFloat(amount || 0)
                    : studentBalance - parseFloat(amount || 0)
                  ).toLocaleString()}
                </p>
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
