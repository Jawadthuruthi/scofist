"use client";

import { useEffect, useState, useCallback } from "react";
import FinanceStats from "@/app/dashboard/finance/_components/FinanceStats";
import DataTableComponent from "@/components/DataTableComponent";
import TransactionForm from "./_components/TransactionForm";
import { IndianRupee, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import CategoryBalanceDialog from "./_components/CategoryBalanceDialog";

export default function AccountsClient({ initialSummary, apiKey, accountType = "College" }) {
    const [summary, setSummary] = useState(initialSummary);
    const router = useRouter();

    useEffect(() => {
        setSummary(initialSummary);
    }, [initialSummary]);

    // Custom Filter States
    // Filter Config for PopupFilter
    const filterConfig = [
        {
            id: "dateRange",
            label: "Date Range",
            inputType: "dateRange",
        },
        {
            id: "category",
            label: "Category",
            inputType: "select",
            options: [
                { value: "Stationary", label: "Stationary" },
                { value: "IT Lab", label: "IT Lab" },
                { value: "Donation", label: "Donation" },
            ]
        },
        {
            id: "type",
            label: "Type",
            inputType: "select",
            options: [
                { value: "Income", label: "Income" },
                { value: "Expense", label: "Expense" },
            ]
        },
        {
            id: "mode",
            label: "Mode",
            inputType: "select",
            options: [
                { value: "Cash", label: "Cash" },
                { value: "Bank", label: "Bank" },
            ]
        }
    ];

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
            width: "50px",
            minWidth: "50px",
        },
        {
            id: "slNo",
            header: "Sl No",
            cell: ({ row, table }) => {
                const pageIndex = table.getState().pagination.pageIndex;
                const pageSize = table.getState().pagination.pageSize;
                return pageIndex * pageSize + row.index + 1;
            },
            enableSorting: false,
            enableHiding: false,
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
            accessorKey: "mode",
            header: "Mode",
        },
        {
            accessorKey: "invoiceNo",
            header: "Invoice/Receipt",
        },
        {
            accessorKey: "item",
            header: "Item",
            minWidth: "150px",
            cell: ({ row }) => row.original.item || "-",
        },
        {
            accessorKey: "recipient",
            header: "Recipient",
            minWidth: "150px",
            cell: ({ row }) => row.original.recipient || "-",
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
        { name: "item", label: "Item", type: "text", required: false },
        { name: "recipient", label: "Recipient", type: "text", required: false },
        {
            name: "category",
            label: "Category",
            type: "text",
            inputType: "select",
            options: [
                { value: "Stationary", label: "Stationary" },
                { value: "IT Lab", label: "IT Lab" },
                { value: "Donation", label: "Donation" },
            ],
            required: true,
            freeSolo: true
        },
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

            <TransactionForm apiKey={apiKey} onSuccess={handleSuccess} accountType={accountType} />

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
                apiFilters={{ accountType }} // Pass accountType for filtering
                additionalFormParams={{ accountType }} // Pass accountType for creation
                additionalProps={{
                    customActions: summary?.categories && (
                        <CategoryBalanceDialog categories={summary.categories} totalBalance={summary.totalBalance} />
                    ),
                    accountType // Keep accountType here if needed by other logic, though usually mostly for toolbar
                }}
                filterConfig={filterConfig}
                printInReverse={true}
                printTitle="Accounts"
            />


        </div>
    );
}
