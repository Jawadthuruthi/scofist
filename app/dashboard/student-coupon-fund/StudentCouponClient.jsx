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

    // Fetch Batches
    const { data: batchesData } = useFetchBatches(0, 1000, {}, { enabled: !!apiKey }); // Fetch all batches (removed status filter)
    const batches = batchesData?.batches || [];
    const [selectedBatchId, setSelectedBatchId] = useState("all");

    // Fetch Coupons
    const { data: couponsData, isLoading, refetch } = useFetchItems(0, 0, {
        academicYear: selectedYearFilter !== "all" ? selectedYearFilter : undefined,
        search: searchTerm,
    }, { enabled: !!apiKey });

    // Fetch Students (filtered by batch if selected)
    const studentFilters = {
        roles: ["Student"],
        // Removed status: "Active" to show all students
        ...(selectedBatchId !== "all" && { batchId: selectedBatchId })
    };

    const { data: usersData } = useFetchUsers(0, 1000, studentFilters, { enabled: !!apiKey });
    const students = usersData?.users || [];

    const coupons = couponsData?.coupons || [];
    const stats = couponsData?.stats || { totalCouponAmount: 0, totalCollected: 0, totalPending: 0 };

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            studentId: "",
            academicYear: "2025",
            couponNumber: "",
            couponAmount: "",
            date: new Date().toISOString().split('T')[0],
        }
    });

    const selectedStudentId = watch("studentId");
    const selectedYear = watch("academicYear");
    const couponAmount = watch("couponAmount");

    // Auto-fill Student ID (display only) logic
    const selectedStudent = useMemo(() =>
        students.find(s => s._id === selectedStudentId),
        [selectedStudentId, students]);

    // Check if coupon exists for selected student + year to pre-fill
    useEffect(() => {
        if (selectedStudentId && selectedYear) {
            const existingCoupon = coupons.find(c =>
                c.studentId?._id === selectedStudentId && c.academicYear === selectedYear
            );
            if (existingCoupon) {
                setValue("couponNumber", existingCoupon.couponNumber);
                setValue("couponAmount", existingCoupon.couponAmount);
                // Note: We don't lock these fields entirely, but maybe we should warn user?
                // For simplicity, we auto-fill. The API handles the "update" logic.
                setValue("payment.amount", 0);
            }
            // Default to current year or 2025
            setValue("academicYear", "2025");
        }
    }, [selectedStudentId, selectedYear, coupons, setValue]);

    const addItem = useAddItem();
    const deleteItem = useDeleteItem();

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                studentId: data.studentId,
                academicYear: data.academicYear,
                couponNumber: data.couponNumber,
                couponAmount: data.couponAmount,
                payment: {
                    amount: Number(data.amount),
                    date: new Date(data.date),
                }
            };

            await addItem.mutateAsync(payload);
            toast.success("Transaction saved successfully");

            // Reset form but preserve Year and Coupon Amount for easier batch entry
            reset({
                academicYear: data.academicYear,
                couponAmount: data.couponAmount,
                studentId: "",
                couponNumber: "",
                amount: "",
                date: new Date().toISOString().split('T')[0],
            });
            setSelectedStudentId("");
            // Keep batch selection active if user wants to add multiple students from same batch
            // setSelectedBatchId("all"); 
            refetch();
        } catch (error) {
            toast.error(error?.message || "Failed to save transaction");
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
        <div className="px-6 pb-6 pt-2 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold uppercase tracking-wide">STUDENT COUPON FUND MANAGEMENT</h1>
                <p className="text-muted-foreground">Manage student coupons, track payments, and generate reports.</p>
            </div>



            {/* Form Section */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Card 1: Coupon Settings (Year & Amount) */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                            {/* Coupon Amount */}
                            <div className="space-y-2">
                                <Label>Coupon Amount</Label>
                                <Input type="number" {...register("couponAmount", { required: true })} placeholder="Total Amount" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

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

                {/* Card 2: Payment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Batch Selection */}
                                <div className="space-y-2">
                                    <Label>Select Batch</Label>
                                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Batches" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Batches</SelectItem>
                                            {batches.map((batch) => (
                                                <SelectItem key={batch._id} value={batch._id}>
                                                    {batch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Student Selection */}
                                <div className="space-y-2">
                                    <Label>Student Name</Label>
                                    <ComboBox
                                        items={students.map(s => ({ value: s._id, label: s.name }))}
                                        value={selectedStudentId}
                                        onSelect={(val) => setValue("studentId", val)}
                                        placeholder="Select Student"
                                    />
                                    {selectedStudent && <p className="text-xs text-muted-foreground">ID: {selectedStudent._id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Coupon Number</Label>
                                    <Input {...register("couponNumber", { required: true })} placeholder="Enter Coupon No" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Paid Amount</Label>
                                    <Input type="number" {...register("amount", { required: true, min: 0 })} placeholder="Enter Amount" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Payment Date</Label>
                                    <Input type="date" {...register("date", { required: true })} />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Save Payment
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
