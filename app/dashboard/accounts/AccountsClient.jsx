"use client";

import { useEffect, useState, useCallback } from "react";
import FinanceStats from "@/app/dashboard/finance/_components/FinanceStats";
import DataTableComponent from "@/components/DataTableComponent";
import TransactionForm from "./_components/TransactionForm";
import { IndianRupee, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AccountsClient({ initialSummary, apiKey }) {
    const [summary, setSummary] = useState(initialSummary);
    const router = useRouter();

    // Custom Filter States
    const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
    const [categoryFilter, setCategoryFilter] = useState("");

    // Create apiFilters object for DataTable
    const [apiFilters, setApiFilters] = useState({});

    useEffect(() => {
        setSummary(initialSummary);
    }, [initialSummary]);

    // Update apiFilters when local filter states change
    useEffect(() => {
        const filters = {};
        if (dateFilter.start && dateFilter.end) {
            // The API route expects startDate and endDate as separate query params.
            filters.startDate = dateFilter.start;
            filters.endDate = dateFilter.end;
        }
        if (categoryFilter) {
            filters.category = categoryFilter;
        }
        setApiFilters(filters);
    }, [dateFilter, categoryFilter]);


    const handleSuccess = useCallback(() => {
        router.refresh();
        // Force DataTable refresh by updating key
        setRefreshKey(prev => prev + 1);
    }, [router]);

    const [refreshKey, setRefreshKey] = useState(0);


    const columnsConfig = [
        {
            accessorKey: "select",
            header: "Select",
            type: "checkbox",
        },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <span className={row.original.type === "Income" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {row.original.type}
                </span>
            )
        },
        {
            accessorKey: "invoiceNo",
            header: "Invoice/Receipt",
        },
        {
            accessorKey: "category",
            header: "Category",
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => (
                <div className="flex items-center">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {row.original.amount}
                </div>
            )
        },
    ];

    // We still provide formFields for Edit actions, as we want the PopupForm for editing.
    const formFields = [
        { name: "date", label: "Date", type: "date", required: true },
        {
            name: "type",
            label: "Income/Expense",
            type: "text",
            inputType: "select",
            options: [
                { value: "Income", label: "Income" },
                { value: "Expense", label: "Expense" },
            ],
            required: true,
        },
        { name: "invoiceNo", label: "Invoice/Receipt No", type: "text", required: true },
        { name: "category", label: "Category", type: "text", required: true },
        {
            name: "mode",
            label: "Mode",
            type: "text",
            inputType: "select",
            options: [
                { value: "Cash", label: "Cash" },
                { value: "Bank", label: "Bank" },
            ],
            required: true,
        },
        { name: "amount", label: "Amount", type: "number", required: true },
    ];

    return (
        <div className="space-y-6">
            <FinanceStats summary={summary} />

            <TransactionForm apiKey={apiKey} onSuccess={handleSuccess} />

            {/* Inline Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-end bg-transparent">
                <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">Start Date</label>
                        <Input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">End Date</label>
                        <Input
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="w-full md:w-64 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Category Search</label>
                    <Input
                        placeholder="Search category..."
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    />
                </div>
            </div>

            <DataTableComponent
                key={refreshKey}
                resource="finance"
                apiEndpoint="finance"
                columnsConfig={columnsConfig}
                formFields={formFields}
                apiKey={apiKey}
                filterType="api"
                enableDelete={true}
                enableCreate={false} // Disable built-in add button
                createFormTitle="Add Transaction"
                editFormTitle="Edit Transaction"
                apiFilters={apiFilters}
                filterConfig={[]} // Disable built-in popup filter since we have inline
            />

            <div className="flex justify-end mt-4">
                <Button variant="default" className="bg-black text-white hover:bg-gray-800">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Statement
                </Button>
            </div>
        </div>
    );
}
