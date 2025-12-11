"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import {
    Loader,
    Plus,
    Search,
    FileSpreadsheet,
    Banknote,
    AlertCircle,
    TrendingUp,
    CreditCard,
    Download
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ComboBox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import ConfirmationPopup from "@/components/ConfirmationPopup";
// Assuming a generic ComboBox exists, effectively a searchable select. 
// If not, I'll fallback to standard Select or implement a simple search dropdown.
// Given previous files, I'll stick to a standard Select for now or use the one from `sidebar` if reusable, 
// but likely safer to simple implementation or use `Popover` + `Command` if needed.
// For now, adhering to standard ShadCN pattern used in this project.

import useCrud from "@/hooks/use-crud";
import Cookies from "js-cookie";
import * as XLSX from "xlsx-js-style";
// Dynamic imports for PDF generation to avoid SSR issues


export default function StudentCouponClient({ apiKey }) {
    // const apiKey = Cookies.get("api-key"); // Now passed as prop
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedYearFilter, setSelectedYearFilter] = useState("all");

    // Data Fetching
    const { useFetchItems, useAddItem, useDeleteItem } = useCrud("student-coupons", apiKey);
    const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
    const { useFetchItems: useFetchBatches } = useCrud("batches", apiKey);
    const { useFetchItems: useFetchClasses } = useCrud("classes", apiKey);

    // Fetch Batches
    const { data: batchesData } = useFetchBatches(0, 1000, {}, { enabled: !!apiKey }); // Fetch all batches (removed status filter)
    const allBatches = batchesData?.batches || [];

    // Filter out restricted batches (First, Second, Third, Fourth)
    const batches = useMemo(() => {
        const excludedTerms = ["first", "second", "third", "fourth"];
        return allBatches.filter(b =>
            !excludedTerms.some(term => b.name.toLowerCase().includes(term))
        );
    }, [allBatches]);

    const [selectedBatchId, setSelectedBatchId] = useState("all");
    const [selectedClassId, setSelectedClassId] = useState([]); // Changed to Array

    // Fetch Classes (filtered by batch if selected)
    const { data: classesData } = useFetchClasses(0, 1000, {
        ...(selectedBatchId !== "all" && { batchId: selectedBatchId })
    }, { enabled: !!apiKey });
    const classes = classesData?.classes || [];

    // Fetch Coupons
    const { data: couponsData, isLoading, refetch } = useFetchItems(0, 0, {
        academicYear: selectedYearFilter !== "all" ? selectedYearFilter : undefined,
        search: searchTerm,
    }, { enabled: !!apiKey });

    // Fetch Students (filtered by batch if selected)
    // If no batch selected ("all"), we must restrict to ONLY visible batches to exclude students from hidden batches.
    const visibleBatchIds = useMemo(() => batches.map(b => b._id).join(","), [batches]);

    const studentFilters = {
        roles: ["Student"],
        // If specific batch selected, use it. If "all", restrict to visible batches only.
        batchId: selectedBatchId !== "all" ? selectedBatchId : visibleBatchIds,
        ...(selectedClassId.length > 0 && { classId: selectedClassId.join(",") })
    };

    const { data: usersData } = useFetchUsers(0, 1000, studentFilters, { enabled: !!apiKey });
    const students = usersData?.users || [];

    const coupons = couponsData?.coupons || [];
    const stats = couponsData?.stats || { totalCouponAmount: 0, totalCollected: 0, totalPending: 0 };

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            studentId: [], // Array
            academicYear: "2025",
            couponNumber: "",
            couponAmount: "",
            date: new Date().toISOString().split('T')[0],
        }
    });

    const [selectedStudentId, setSelectedStudentId] = useState([]); // Separated state for MultiSelect
    const selectedYear = watch("academicYear");
    const couponAmount = watch("couponAmount");

    // Auto-fill Coupon Number if SINGLE student selected (optional, legacy behavior)
    // For Multi-select, pre-fill is tricky. We'll skip pre-fill for now or handle it differently.

    // Check if coupon exists for selected student + year to pre-fill
    // REMOVED single-student pre-fill effect to avoid complexity with multi-select for now.
    // Ideally we check per-student on save.

    const addItem = useAddItem();
    const deleteItem = useDeleteItem();

    const onSubmit = async (data) => {
        if (selectedStudentId.length === 0) {
            toast.error("Please select at least one student");
            return;
        }
        setIsSubmitting(true);
        try {
            // Helper to parse base coupon number for auto-increment (simple version)
            // Note: Auto-incrementing across a batch of *new* coupons is complex without backend support/locking.
            // We will prioritize: 
            // 1. Existing Coupon Number (for payments)
            // 2. Input Coupon Number (for new, might fail duplicates)

            const promises = selectedStudentId.map((studentId) => {
                // Check local cache for existing coupon
                const existingCoupon = coupons.find(c =>
                    c.studentId?._id === studentId &&
                    c.academicYear === data.academicYear
                );

                const payload = {
                    studentId: studentId,
                    academicYear: data.academicYear,
                    // Use existing coupon number if available to allow adding payments to existing coupons
                    couponNumber: existingCoupon ? existingCoupon.couponNumber : data.couponNumber,
                    couponAmount: data.couponAmount,
                    payment: {
                        amount: Number(data.amount) || 0,
                        date: new Date(data.date),
                    }
                };
                return addItem.mutateAsync(payload);
            });

            await Promise.all(promises);
            toast.success(`${selectedStudentId.length} Transaction(s) processed`);

            // Reset form but preserve Year and Coupon Amount
            reset({
                academicYear: data.academicYear,
                couponAmount: data.couponAmount,
                studentId: [],
                couponNumber: "",
                amount: "",
                date: new Date().toISOString().split('T')[0],
            });
            setSelectedStudentId([]);
            // Keep batch/class selection active
            refetch();
        } catch (error) {
            console.error(error);
            toast.error(error?.message || "Failed to save transaction(s). Check for duplicate coupon numbers.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteItem.mutateAsync({ data: { id } });
            toast.success("Coupon deleted successfully");
            refetch();
        } catch (error) {
            toast.error(error?.message || "Failed to delete coupon");
        }
    };

    // Export to Excel
    const exportToExcel = () => {
        const dataToExport = coupons.map(c => ({
            "Student Name": c.studentId?.name,
            "Student ID": c.studentId?._id,
            "Class/Year": c.academicYear,
            "Coupon No": c.couponNumber,
            "Amount": c.couponAmount,
            "Paid": c.totalPaid,
            "Balance": c.balance,
            "Status": c.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Coupons");
        XLSX.writeFile(wb, "Student_Coupons.xlsx");
    };

    // Export to PDF
    const exportToPDF = async () => {
        try {
            const jsPDF = (await import("jspdf")).default;
            await import("jspdf-autotable");

            const doc = new jsPDF();
            doc.text("Student Coupon Fund Report", 14, 15);

            const tableData = coupons.map(c => [
                c.studentId?.name || "",
                c.studentId?._id || "",
                c.academicYear || "",
                c.couponNumber || "",
                c.couponAmount || 0,
                c.totalPaid || 0,
                c.balance || 0,
                c.status || "Pending"
            ]);

            doc.autoTable({
                head: [["Name", "ID", "Year", "Coupon", "Amount", "Paid", "Balance", "Status"]],
                body: tableData,
                startY: 20,
            });
            doc.save("Student_Coupons.pdf");
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast.error("Failed to export PDF");
        }
    };

    return (
        <div className="px-2 md:px-6 pb-6 pt-2 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold uppercase tracking-wide">STUDENT COUPON FUND MANAGEMENT</h1>
                <p className="text-muted-foreground">Manage student coupons, track payments, and generate reports.</p>
            </div>



            {/* Form Section */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Coupon Amount</CardTitle>
                            <Banknote className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{stats.totalCouponAmount.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">₹{stats.totalCollected.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">₹{stats.totalPending.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Card 1: Coupon Settings (Year, Amount, & Student Selection) */}
                <Card className="border-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-0 pt-0 md:p-6">
                        <CardTitle>Coupon Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 md:p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* Academic Year */}
                            <div className="space-y-2">
                                <Label>Academic Year</Label>
                                <Select onValueChange={(val) => setValue("academicYear", val)} defaultValue="2025" value={watch("academicYear")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                                            <SelectItem key={year} value={String(year)}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Batch Selection */}
                            <div className="space-y-2">
                                <Label>Select Batch</Label>
                                <Select
                                    value={selectedBatchId}
                                    onValueChange={(val) => {
                                        setSelectedBatchId(val);
                                        setSelectedClassId([]); // Reset class on batch change
                                        setSelectedStudentId([]);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Select Batch</SelectItem>
                                        {batches.map((batch) => (
                                            <SelectItem key={batch._id} value={batch._id}>
                                                {batch.name} ({batch.endYear})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Class Selection */}
                            <div className="space-y-2">
                                <Label>Select Class</Label>
                                <MultiSelect
                                    options={classes.map(c => ({ label: c.name, value: c._id }))}
                                    onValueChange={setSelectedClassId}
                                    value={selectedClassId} // Pass array
                                    placeholder="Select Classes"
                                    variant="default"
                                />
                            </div>

                            {/* Student Selection */}
                            <div className="space-y-2">
                                <Label>Student Name</Label>
                                <MultiSelect
                                    options={students.map(s => ({ label: s.name, value: s._id }))}
                                    onValueChange={setSelectedStudentId}
                                    value={selectedStudentId} // Pass array
                                    placeholder="Select Students"
                                    variant="default"
                                />
                                {selectedStudentId.length > 0 && (
                                    <p className="text-xs text-muted-foreground">{selectedStudentId.length} student(s) selected</p>
                                )}
                            </div>

                            {/* Coupon Amount */}
                            <div className="space-y-2">
                                <Label>Coupon Amount</Label>
                                <Input type="number" {...register("couponAmount", { required: true })} placeholder="Total Amount" />
                            </div>

                            <div className="flex items-end">
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Save
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card 2: Payment Details */}
                <Card className="border-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-0 pt-0 md:p-6">
                        <CardTitle>Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 md:p-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Payment Date</Label>
                                    <Input type="date" {...register("date", { required: true })} />
                                </div>

                                {/* Batch Selection */}
                                <div className="space-y-2">
                                    <Label>Select Batch</Label>
                                    <Select
                                        value={selectedBatchId}
                                        onValueChange={(val) => {
                                            setSelectedBatchId(val);
                                            setSelectedClassId([]); // Reset class on batch change
                                            setSelectedStudentId([]);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Batch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Select Batch</SelectItem>
                                            {batches.map((batch) => (
                                                <SelectItem key={batch._id} value={batch._id}>
                                                    {batch.name} ({batch.endYear})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Class Selection */}
                                <div className="space-y-2">
                                    <Label>Select Class</Label>
                                    <MultiSelect
                                        options={classes.map(c => ({ label: c.name, value: c._id }))}
                                        onValueChange={setSelectedClassId}
                                        value={selectedClassId} // Pass array
                                        placeholder="Select Classes"
                                        variant="default"
                                    />
                                </div>

                                {/* Student Selection */}
                                <div className="space-y-2">
                                    <Label>Student Name</Label>
                                    <MultiSelect
                                        options={students.map(s => ({ label: s.name, value: s._id }))}
                                        onValueChange={setSelectedStudentId}
                                        value={selectedStudentId} // Pass array
                                        placeholder="Select Students"
                                        variant="default"
                                    />
                                    {selectedStudentId.length > 0 && (
                                        <p className="text-xs text-muted-foreground">{selectedStudentId.length} student(s) selected</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Coupon Number</Label>
                                    <Input {...register("couponNumber", { required: true })} placeholder="Enter Coupon No" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Paid Amount</Label>
                                    <Input type="number" {...register("amount", { required: true, min: 0 })} placeholder="Enter Amount" />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                                    {isSubmitting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Save
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>

            {/* Filters & Table */}
            <div className="flex gap-4 items-center">
                <div className="flex-1">
                    <Input
                        placeholder="Search by Student Name or Coupon No..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedYearFilter} onValueChange={setSelectedYearFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {["Year 1", "Year 2", "Year 3", "Year 4"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportToExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
                <Button variant="outline" onClick={exportToPDF}><Download className="mr-2 h-4 w-4" /> PDF</Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Coupon No</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Paid</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="text-center h-24"><Loader className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                        ) : coupons.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center h-24 text-muted-foreground">No records found</TableCell></TableRow>
                        ) : (
                            coupons.map((coupon) => (
                                <TableRow key={coupon._id}>
                                    <TableCell className="font-medium">{coupon.studentId?.name}</TableCell>
                                    <TableCell>{coupon.studentId?._id}</TableCell>
                                    <TableCell>{coupon.academicYear}</TableCell>
                                    <TableCell>{coupon.couponNumber}</TableCell>
                                    <TableCell>₹{coupon.couponAmount}</TableCell>
                                    <TableCell className="text-green-600 font-semibold">₹{coupon.totalPaid}</TableCell>
                                    <TableCell className="text-red-600 font-semibold">₹{coupon.balance}</TableCell>
                                    <TableCell>
                                        <Badge variant={coupon.status === "Paid" ? "success" : coupon.status === "Partial" ? "warning" : "destructive"}>
                                            {coupon.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {/* Future: View/Edit Details */}
                                            <Button variant="ghost" size="sm">View</Button>
                                            <ConfirmationPopup
                                                action="delete"
                                                title="Delete Coupon"
                                                onClick={() => handleDelete(coupon._id)}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
