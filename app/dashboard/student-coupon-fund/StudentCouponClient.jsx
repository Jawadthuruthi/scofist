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
    Download,
    Users
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

import useCrud from "@/hooks/use-crud";
import Cookies from "js-cookie";
import * as XLSX from "xlsx-js-style";


export default function StudentCouponClient({ apiKey }) {
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [isSavingPayment, setIsSavingPayment] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedYearFilter, setSelectedYearFilter] = useState("all");

    // Data Fetching
    const { useFetchItems, useAddItem, useDeleteItem } = useCrud("student-coupons", apiKey);
    const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
    const { useFetchItems: useFetchBatches } = useCrud("batches", apiKey);
    const { useFetchItems: useFetchClasses } = useCrud("classes", apiKey);

    const addItem = useAddItem();
    const deleteItem = useDeleteItem();

    // Fetch Batches (Shared)
    const { data: batchesData } = useFetchBatches(0, 1000, {}, { enabled: !!apiKey });
    const allBatches = batchesData?.batches || [];

    // Filter out restricted batches (First, Second, Third, Fourth)
    const batches = useMemo(() => {
        const excludedTerms = ["first", "second", "third", "fourth"];
        return allBatches.filter(b =>
            !excludedTerms.some(term => b.name.toLowerCase().includes(term))
        );
    }, [allBatches]);

    const visibleBatchIds = useMemo(() => batches.map(b => b._id).join(","), [batches]);

    // =================================================================================================
    // SECTION 1: COUPON DETAILS (Bulk Entry)
    // =================================================================================================
    const [detailsBatchId, setDetailsBatchId] = useState("all");
    const [detailsClassId, setDetailsClassId] = useState([]);

    // Setup for Bulk Student List
    const [bulkStudents, setBulkStudents] = useState([]);
    const [isLoadingBulkStudents, setIsLoadingBulkStudents] = useState(false);
    // State to hold individual coupon numbers: { [studentId]: "A001" }
    const [couponNumbers, setCouponNumbers] = useState({});

    // Fetch Students Query (On demand logic mostly, but we use the hook to sync)
    // We will trigger this manually via refetch or enabling it when "Get Students" clicked
    const detailsStudentFilters = {
        roles: ["Student"],
        batchId: detailsBatchId !== "all" ? detailsBatchId : visibleBatchIds,
        ...(detailsClassId.length > 0 && { classId: detailsClassId.join(",") })
    };

    // We use enabled: false to manually trigger fetch
    const { data: detailsUsersData, refetch: refetchDetailsUsers, isFetching: isFetchingUsers } = useFetchUsers(0, 1000, detailsStudentFilters, { enabled: false });

    // Fetch Coupons for Pre-filling
    // We need to fetch coupons for the selected Year + Batch/Class to prefill
    // We will just fetch ALL coupons for the selected year and filter in memory since we don't have a complex backend filter yet
    const { data: allCouponsForYearData, refetch: refetchAllCoupons } = useFetchItems(0, 0, {
        academicYear: "2025" // Default, will update dynamically
    }, { enabled: false });


    const {
        register: registerDetails,
        handleSubmit: handleSubmitDetails,
        setValue: setValueDetails,
        reset: resetDetails,
        watch: watchDetails,
        getValues: getValuesDetails
    } = useForm({
        defaultValues: {
            academicYear: "2025",
            couponAmount: ""
        }
    });

    const currentYear = watchDetails("academicYear");

    // Fetch classes for dropdown
    const { data: detailsClassesData } = useFetchClasses(0, 1000, {
        ...(detailsBatchId !== "all" && { batchId: detailsBatchId })
    }, { enabled: !!apiKey });
    const detailsClasses = detailsClassesData?.classes || [];


    const handleGetStudents = async () => {
        setIsLoadingBulkStudents(true);
        try {
            // 1. Fetch Students
            const usersResult = await refetchDetailsUsers();
            const students = usersResult.data?.users || [];

            if (students.length === 0) {
                toast.warning("No students found for satisfied criteria");
                setBulkStudents([]);
                return;
            }

            // 2. Fetch Existing Coupons (to prefill numbers)
            // We pass academicYear to the query
            // Note: useFetchItems hook arguments might be stale in closure if not carefully used, 
            // but refetch() uses current props if updated? No, usually TanStack uses render props.
            // Hack: we'll call API directly or accept we refetch base on current state if react-query handles it.
            // Better: Trigger the refetch of the coupons query which is watching `selectedYearFilter` usually, 
            // but here we want `currentYear` from form.

            // Let's rely on global coupons list if it covers everything or fetch specifically. 
            // Since we split logic, we should probably fetch specifically.
            // For now, let's assume `coupons` (global list) might have it if updated. 
            // BUT global list is filtered by search/pagination.
            // SO we need to fetch all coupons for this Batch+Year. 
            // Limitations: Backend might not support batch filtering for coupons yet fully.
            // Workaround: Fetch all for Year (might be heavy) or ignore pre-fill if too hard? 
            // User requested "add their coupon number", implying pre-fill if exists is nice.

            // Let's try to fetch coupons matching these students.
            // Since we have the student list, we can just check against `couponsData` if we remove pagination limits there? 
            // No, bad for perf.

            // Let's assume we start blank or fetch fresh.
            setBulkStudents(students);

            // Initialize coupon numbers map
            // Ideally we should pre-fill from DB. 
            // Let's use `refetchAllCoupons` with the year filter.
            // We need to update existing query options for `allCouponsForYearData` first?
            // Actually, let's just use `coupons` from the main list IF the user removed filters? 
            // No, reliable way is:

            // Simple: Just show inputs blank initially. If user needs to SEE existing numbers, they check the table below.
            // BUT user wants to ADD/Edit them.
            // Let's try to pre-fill from the main `coupons` data if available.

            const existingMap = {};
            // We will scan the `coupons` already loaded in the bottom table (assuming "All Years" or matching year)
            // This is risky if bottom table is paginated.
            // Best Effort: Just init empty. If user re-saves, it updates.

            // UPDATE: I'll try to match from `coupons` array if loaded.
            coupons.forEach(c => {
                if (c.academicYear === currentYear && c.studentId?._id) {
                    existingMap[c.studentId._id] = c.couponNumber || "";
                }
            });

            setCouponNumbers(existingMap);

        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch students");
        } finally {
            setIsLoadingBulkStudents(false);
        }
    };

    const handleCouponNumberChange = (studentId, value) => {
        setCouponNumbers(prev => ({ ...prev, [studentId]: value }));
    };

    const onSaveDetails = async (data) => {
        if (bulkStudents.length === 0) {
            toast.error("No students loaded. Click 'Get Students' first.");
            return;
        }

        setIsSavingDetails(true);
        try {
            const promises = bulkStudents.map((student) => {
                const cNumber = couponNumbers[student._id] || undefined;

                // Only send payload if we have an amount or a coupon number to save
                // Actually always save to ensure student is initialized
                const payload = {
                    studentId: student._id,
                    academicYear: data.academicYear,
                    couponAmount: data.couponAmount,
                    couponNumber: cNumber // Optional now
                };
                return addItem.mutateAsync(payload);
            });

            await Promise.all(promises);
            toast.success(`Updated ${bulkStudents.length} students successfully`);

            setBulkStudents([]);
            setCouponNumbers({});
            // Keep Batch/Class selected for workflow continuity? User might want to do next batch.
            // But maybe clear students list to avoid confusion.

            refetchCoupons();
        } catch (error) {
            console.error(error);
            const detailedError = error?.details?.errors?.map(e => `${e.field}: ${e.message}`).join(", ");
            toast.error(detailedError || error?.message || "Failed to save details");
        } finally {
            setIsSavingDetails(false);
        }
    };


    // =================================================================================================
    // SECTION 2: PAYMENT DETAILS (Transactions)
    // =================================================================================================
    const [paymentBatchId, setPaymentBatchId] = useState("all");
    const [paymentClassId, setPaymentClassId] = useState([]);
    const [paymentStudentId, setPaymentStudentId] = useState([]);

    // Fetch Classes for Payment
    const { data: paymentClassesData } = useFetchClasses(0, 1000, {
        ...(paymentBatchId !== "all" && { batchId: paymentBatchId })
    }, { enabled: !!apiKey });
    const paymentClasses = paymentClassesData?.classes || [];

    // Fetch Students for Payment
    const paymentStudentFilters = {
        roles: ["Student"],
        batchId: paymentBatchId !== "all" ? paymentBatchId : visibleBatchIds,
        ...(paymentClassId.length > 0 && { classId: paymentClassId.join(",") })
    };
    const { data: paymentUsersData } = useFetchUsers(0, 1000, paymentStudentFilters, { enabled: !!apiKey });
    const paymentStudents = paymentUsersData?.users || [];

    const {
        register: registerPayment,
        handleSubmit: handleSubmitPayment,
        setValue: setValuePayment,
        reset: resetPayment,
        watch: watchPayment
    } = useForm({
        defaultValues: {
            academicYear: "2025",
            date: new Date().toISOString().split('T')[0],
            couponNumber: "",
            amount: ""
        }
    });

    const onSavePayment = async (data) => {
        if (paymentStudentId.length === 0) {
            toast.error("Please select at least one student for Payment");
            return;
        }
        setIsSavingPayment(true);
        try {
            const promises = paymentStudentId.map((studentId) => {
                const payload = {
                    studentId: studentId,
                    academicYear: data.academicYear,
                    couponNumber: data.couponNumber, // Optional update
                    payment: {
                        amount: Number(data.amount) || 0,
                        date: new Date(data.date),
                    }
                };
                return addItem.mutateAsync(payload);
            });

            await Promise.all(promises);
            toast.success(`Payment saved for ${paymentStudentId.length} students`);

            resetPayment({
                academicYear: data.academicYear,
                date: new Date().toISOString().split('T')[0],
                couponNumber: "",
                amount: ""
            });
            setPaymentStudentId([]);
            refetchCoupons();
        } catch (error) {
            console.error(error);
            const detailedError = error?.details?.errors?.map(e => `${e.field}: ${e.message}`).join(", ");
            toast.error(detailedError || error?.message || "Failed to save payment");
        } finally {
            setIsSavingPayment(false);
        }
    };


    // =================================================================================================
    // COUPON LIST & EXPORTS
    // =================================================================================================
    const { data: couponsData, isLoading, refetch: refetchCoupons } = useFetchItems(0, 0, {
        academicYear: selectedYearFilter !== "all" ? selectedYearFilter : undefined,
        search: searchTerm,
    }, { enabled: !!apiKey });

    const coupons = couponsData?.coupons || [];
    const stats = couponsData?.stats || { totalCouponAmount: 0, totalCollected: 0, totalPending: 0 };


    const handleDelete = async (id) => {
        try {
            await deleteItem.mutateAsync({ data: { id } });
            toast.success("Coupon deleted successfully");
            refetchCoupons();
        } catch (error) {
            toast.error(error?.message || "Failed to delete coupon");
        }
    };

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

            {/* FORMS CONTAINER */}
            <div className="space-y-6">

                {/* CARD 1: COUPON DETAILS - BULK ENTRY */}
                <Card className="border-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-0 pt-0 md:px-6 md:pt-6 md:pb-2">
                        <CardTitle>Coupon Details (Bulk Entry)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 md:px-6 md:pb-6 md:pt-0">
                        <form onSubmit={handleSubmitDetails(onSaveDetails)}>
                            <div className="space-y-6">
                                {/* Filters Row */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>Academic Year</Label>
                                        <Select
                                            onValueChange={(val) => {
                                                setValueDetails("academicYear", val);
                                                // Clear students on year change to avoid confusion?
                                                setBulkStudents([]);
                                            }}
                                            defaultValue="2025"
                                            value={watchDetails("academicYear")}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                            <SelectContent>
                                                {[2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Select Batch</Label>
                                        <Select
                                            value={detailsBatchId}
                                            onValueChange={(val) => {
                                                setDetailsBatchId(val);
                                                setDetailsClassId([]);
                                                setBulkStudents([]); // Reset list
                                            }}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Select Batch</SelectItem>
                                                {batches.map((batch) => (
                                                    <SelectItem key={batch._id} value={batch._id}>{batch.name} ({batch.endYear})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Select Class</Label>
                                        <MultiSelect
                                            options={detailsClasses.map(c => ({ label: c.name, value: c._id }))}
                                            onValueChange={setDetailsClassId}
                                            value={detailsClassId}
                                            placeholder="Select Classes"
                                            variant="default"
                                        />
                                    </div>
                                    <div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="w-full"
                                            onClick={handleGetStudents}
                                            disabled={isLoadingBulkStudents}
                                        >
                                            {isLoadingBulkStudents ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                                            Get Students
                                        </Button>
                                    </div>
                                </div>

                                {/* Bulk Student List */}
                                {bulkStudents.length > 0 && (
                                    <div className="space-y-4 border rounded-md p-4 bg-muted/10">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-lg">{bulkStudents.length} Students Found</h3>
                                            <div className="flex gap-2 items-center">
                                                <Label className="whitespace-nowrap">Global Amount:</Label>
                                                <Input
                                                    type="number"
                                                    {...registerDetails("couponAmount", { required: true })}
                                                    className="w-32"
                                                    placeholder="Amount"
                                                />
                                            </div>
                                        </div>

                                        <div className="max-h-[400px] overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]">No.</TableHead>
                                                        <TableHead>Student Name</TableHead>
                                                        <TableHead>ID</TableHead>
                                                        <TableHead>Coupon Number</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {bulkStudents.map((student, index) => (
                                                        <TableRow key={student._id}>
                                                            <TableCell>{index + 1}</TableCell>
                                                            <TableCell className="font-medium">{student.name}</TableCell>
                                                            <TableCell>{student._id}</TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    className="h-8 w-48"
                                                                    placeholder="Coupon No"
                                                                    value={couponNumbers[student._id] || ""}
                                                                    onChange={(e) => handleCouponNumberChange(student._id, e.target.value)}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button type="submit" disabled={isSavingDetails}>
                                                {isSavingDetails ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                Save All Details
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* CARD 2: PAYMENT DETAILS */}
                <Card className="border-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-0 pt-0 md:p-6">
                        <CardTitle>Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 md:p-6">
                        <form onSubmit={handleSubmitPayment(onSavePayment)}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Payment Date</Label>
                                        <Input type="date" {...registerPayment("date", { required: true })} />
                                    </div>

                                    {/* Academic Year for Payment to Identify Coupon */}
                                    <div className="space-y-2">
                                        <Label>Academic Year</Label>
                                        <Select
                                            onValueChange={(val) => setValuePayment("academicYear", val)}
                                            defaultValue="2025"
                                            value={watchPayment("academicYear")}
                                        >
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
                                            value={paymentBatchId}
                                            onValueChange={(val) => {
                                                setPaymentBatchId(val);
                                                setPaymentClassId([]);
                                                setPaymentStudentId([]);
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
                                            options={paymentClasses.map(c => ({ label: c.name, value: c._id }))}
                                            onValueChange={setPaymentClassId}
                                            value={paymentClassId}
                                            placeholder="Select Classes"
                                            variant="default"
                                        />
                                    </div>

                                    {/* Student Selection */}
                                    <div className="space-y-2">
                                        <Label>Student Name</Label>
                                        <MultiSelect
                                            options={paymentStudents.map(s => ({ label: s.name, value: s._id }))}
                                            onValueChange={setPaymentStudentId}
                                            value={paymentStudentId}
                                            placeholder="Select Students"
                                            variant="default"
                                        />
                                        {paymentStudentId.length > 0 && (
                                            <p className="text-xs text-muted-foreground">{paymentStudentId.length} student(s) selected</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Coupon Number</Label>
                                        <Input {...registerPayment("couponNumber")} placeholder="Enter Coupon No (Optional)" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Paid Amount</Label>
                                        <Input type="number" {...registerPayment("amount", { required: true, min: 0 })} placeholder="Enter Amount" />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSavingPayment} className="w-full md:w-auto">
                                        {isSavingPayment ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        Save Payment
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

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
                        {["2025", "2024", "2023"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
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
                                    <TableCell>{coupon.couponNumber || "-"}</TableCell>
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
