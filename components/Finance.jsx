"use client";
import Header from "./Header";
import DataTableComponent from "./DataTableComponent";
import { useState } from "react";
import dynamic from "next/dynamic";

const DateRangePicker = dynamic(
  () => import("react-date-range").then((mod) => mod.DateRangePicker),
  { ssr: false }
);

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const Finance = () => {
  const [filters, setFilters] = useState({
    category: "",
    dateRange: [
      {
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      },
    ],
  });

  const columnsConfig = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "type",
      header: "Income/Expense",
    },
    {
      accessorKey: "invoiceNo",
      header: "Invoice/Receipt No",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "amount",
      header: "Amount",
    },
  ];

  const formFields = [
    {
      name: "date",
      label: "Date",
      type: "date",
      required: true,
    },
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
    {
      name: "invoiceNo",
      label: "Invoice/Receipt No",
      type: "text",
      required: true,
    },
    {
      name: "category",
      label: "Category",
      type: "text",
      required: true,
    },
    {
      name: "amount",
      label: "Amount",
      type: "number",
      required: true,
    },
  ];

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleDateRangeChange = (ranges) => {
    setFilters({ ...filters, dateRange: [ranges.selection] });
  };

  const apiFilters = {
    category: filters.category,
    startDate: filters.dateRange[0].startDate.toISOString(),
    endDate: filters.dateRange[0].endDate.toISOString(),
  };

  return (
    <div className="space-y-4">
      <Header title="FINANCE" subTitle="Manage Financial Transactions" />
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <input
            type="text"
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Date Range
          </label>
          <DateRangePicker
            onChange={handleDateRangeChange}
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
            months={2}
            ranges={filters.dateRange}
            direction="horizontal"
          />
        </div>
      </div>
      <DataTableComponent
        resource="finance"
        columnsConfig={columnsConfig}
        formFields={formFields}
        apiFilters={apiFilters}
      />
    </div>
  );
};

export default Finance;
