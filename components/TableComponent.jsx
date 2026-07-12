"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useReactToPrint } from "react-to-print";
import useTableColumns from "@/hooks/use-table-columns";
import PrintHeader from "./PrintHeader";
import { SlidersHorizontal, Filter, Search, LayoutGrid, List, Download, Printer } from "lucide-react";

import { cn } from "@/lib/utils";
import PopupFilter from "./PopupFilter";
import { Checkbox } from "@/components/ui/checkbox";

const getCellStyles = (meta) => ({
  width: meta?.width || "auto",
  minWidth: meta?.minWidth || "auto", // Default to auto for better fit
  maxWidth: meta?.maxWidth || "300px",
  overflow: meta?.overflow || "hidden",
  textOverflow: meta?.textOverflow || "ellipsis",
  whiteSpace: meta?.whiteSpace || "nowrap",
  padding: meta?.padding, // Allow overriding padding
  textAlign: meta?.textAlign || "left",
  verticalAlign: meta?.verticalAlign || "middle", // Default to middle for consistency
  fontSize: meta?.fontSize,
});

const TableComponent = forwardRef(({
  data = [],
  columnsConfig = [],
  apiKey,
  printTitle,
  hidePrintBtn = false,
  hidePrintLogo = false,
  tableHeight = "calc(100vh - 250px)",
  rowSelection = {},
  onRowSelectionChange,
  getRowId,
  actionButtons,
  filterConfig = [],
  enableGrid = false,
  renderGridItem,
  onRowClick,
  hideSearch = false,
  hideColumnManagement = false,
  showCsvBtn = false,
  defaultViewMode = "list",
  hideViewToggle = false,
  showTotalCount = false,
  totalCountLabel = "Total Records",
  searchPlaceholder,
  onFiltersChange,
}, ref) => {
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]); // Advanced filters
  const [showFilterInput, setShowFilterInput] = useState(false);
  const [viewMode, setViewMode] = useState(defaultViewMode); // list or grid

  const tableRef = useRef(null);

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(columnFilters);
    }
  }, [columnFilters, onFiltersChange]);

  const columns = useMemo(() => {
    return useTableColumns(columnsConfig);
  }, [columnsConfig]);

  const dynamicPrintTitle = useMemo(() => {
    let title = printTitle || "Table Print";
    if (columnFilters && columnFilters.length > 0) {
      const filterLabels = columnFilters
        .filter(f => f.value)
        .map(f => String(f.value).replace(/[^a-zA-Z0-9]/g, '_'));
      if (filterLabels.length > 0) {
        title = `${title}_${filterLabels.join('_')}`;
      }
    }
    return title;
  }, [printTitle, columnFilters]);

  const handlePrint = useReactToPrint({
    contentRef: tableRef,
    documentTitle: dynamicPrintTitle,
  });

  const handleExportCSV = () => {
    const visibleColumns = table.getVisibleLeafColumns()
      .filter((col) => col.id !== "select" && col.id !== "actions" && !col.columnDef.meta?.className?.includes("print:hidden") && !col.columnDef.type?.includes("avatar"));

    const csvHeaders = visibleColumns.map((col) => `"${String(col.columnDef.header).replace(/"/g, '""')}"`).join(",");

    const csvRows = table.getFilteredRowModel().rows.map((row) => {
      return visibleColumns.map((col) => {
        let val = row.getValue(col.id);
        if (col.id === "serialNo") {
          val = row.index + 1;
        } else if (col.columnDef.type?.includes("avatar")) {
          // Skip exporting raw image URLs for avatars
          val = "";
        }

        if (val === null || val === undefined) val = "";

        if (typeof val === "object") {
          val = Array.isArray(val) ? val.join(", ") : JSON.stringify(val);
        }

        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",");
    });

    const csvContent = [csvHeaders, ...csvRows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${printTitle || "export"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const table = useReactTable({
    data,
    columns,
    getRowId,
    onSortingChange: setSorting,
    onRowSelectionChange: onRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters, // Sync column filters
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      globalFilter,
      columnFilters,
    },
  });

  useImperativeHandle(ref, () => ({
    getFilteredData: () => table.getFilteredRowModel().rows.map(row => row.original),
    getFilters: () => columnFilters
  }));

  return (
    <div className="space-y-4">
      {/* Unified Toolbar Container */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 order-1 w-full md:w-auto md:flex-1">
          {/* Column Management - First */}
          {!hideColumnManagement && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 md:h-8 lg:flex shrink-0 order-1">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto">
                <div className="p-2 border-b">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-columns"
                      checked={table.getIsAllColumnsVisible()}
                      onCheckedChange={(value) =>
                        table.toggleAllColumnsVisible(!!value)
                      }
                    />
                    <label
                      htmlFor="select-all-columns"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Select All
                    </label>
                  </div>
                </div>
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => {
                    return (
                      <div key={column.id} className="flex items-center space-x-2 p-2">
                        <Checkbox
                          id={`col-${column.id}`}
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        />
                        <label
                          htmlFor={`col-${column.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                        >
                          {column.columnDef.header}
                        </label>
                      </div>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Global Search Button/Input - Moved next to Column Management */}
          {!hideSearch && (
            <div className="relative flex items-center flex-1 md:flex-none order-3 md:order-2">
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder || "Search..."}
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-10 md:h-8 pl-8 w-full md:w-[250px]"
              />
            </div>
          )}

          {/* Filters (Desktop) */}
          {filterConfig.length > 0 && (
            <PopupFilter
              filterConfig={filterConfig}
              filters={columnFilters.reduce((acc, filter) => {
                acc[filter.id] = filter.value;
                return acc;
              }, {})}
              setFilter={(id, value) => {
                setColumnFilters((prev) => {
                  const existing = prev.find((f) => f.id === id);
                  if (existing) {
                    return prev.map((f) => (f.id === id ? { ...f, value } : f));
                  }
                  return [...prev, { id, value }];
                });
              }}
              removeFilter={(id) => {
                setColumnFilters((prev) => prev.filter((f) => f.id !== id));
              }}
              clearFilters={() => setColumnFilters([])}
              hasFilters={columnFilters.length > 0}
              triggerClass="hidden md:flex h-8 w-auto px-3 shrink-0 order-3"
            />
          )}

          {/* View Toggle (Desktop) */}
          {enableGrid && !hideViewToggle && (
            <div className="hidden md:flex items-center border rounded-md overflow-hidden shrink-0">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-10 w-10 md:h-8 md:w-8 px-0 rounded-none border-r"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-10 w-10 md:h-8 md:w-8 px-0 rounded-none"
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 md:gap-2 order-2 md:order-3 ml-auto overflow-x-auto hide-scrollbar">
          {/* View Toggle (Mobile) */}
          {enableGrid && !hideViewToggle && (
            <div className="flex md:hidden items-center border rounded-md overflow-hidden shrink-0">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 px-0 rounded-none border-r"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 px-0 rounded-none"
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}
          {/* Filters (Mobile) */}
          {filterConfig.length > 0 && (
            <PopupFilter
              filterConfig={filterConfig}
              filters={columnFilters.reduce((acc, filter) => {
                acc[filter.id] = filter.value;
                return acc;
              }, {})}
              setFilter={(id, value) => {
                setColumnFilters((prev) => {
                  const existing = prev.find((f) => f.id === id);
                  if (existing) {
                    return prev.map((f) => (f.id === id ? { ...f, value } : f));
                  }
                  return [...prev, { id, value }];
                });
              }}
              removeFilter={(id) => {
                setColumnFilters((prev) => prev.filter((f) => f.id !== id));
              }}
              clearFilters={() => setColumnFilters([])}
              hasFilters={columnFilters.length > 0}
              triggerClass="flex md:hidden h-8 w-8 px-0 p-0 shrink-0 justify-center items-center"
            />
          )}
          {actionButtons}
          {showCsvBtn && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="h-8 w-8 p-0 md:w-auto md:px-3 shrink-0"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Export CSV</span>
            </Button>
          )}
          {!hidePrintBtn && (
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 w-8 p-0 md:w-auto md:px-3 shrink-0"
              title="Print"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Print</span>
            </Button>
          )}
        </div>
      </div>



      {viewMode === "grid" && renderGridItem ? (
        <div ref={tableRef}>
          {!hidePrintBtn && (
            <PrintHeader
              apiKey={apiKey}
              title={printTitle}
              hidePrintLogo={hidePrintLogo}
            />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <div key={row.id}>
                  {renderGridItem(row)}
                </div>
              ))
            ) : (
              <div className="col-span-full h-24 flex items-center justify-center text-gray-500 border rounded-md">
                No data available
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={tableRef}
          className="rounded-md border overflow-auto shadow-sm table-print relative  "
          style={{
            maxHeight: tableHeight,
          }}
        >
          {!hidePrintBtn && (
            <PrintHeader
              apiKey={apiKey}
              title={printTitle}
              hidePrintLogo={hidePrintLogo}
            />
          )}
          <div className="print-table-wrapper">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={getCellStyles(header.column.columnDef.meta)}
                        className={cn(
                          header.id === "select" ? "print:hidden" : "",
                          header.column.columnDef.meta?.className
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={cn(
                        "break-inside-avoid transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/50"
                      )}
                      onClick={() => onRowClick && onRowClick(row)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          style={getCellStyles(cell.column.columnDef.meta)}
                          key={cell.id}
                          className={cn(
                            cell.column.id === "select" ? "print:hidden" : "",
                            cell.column.columnDef.meta?.className
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-gray-500"
                    >
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {showTotalCount && (
        <div className="flex items-center mt-2 px-1 print:hidden">
          <div className="text-sm font-medium text-muted-foreground">
            {totalCountLabel}: {table.getFilteredRowModel().rows.length}
          </div>
        </div>
      )}
    </div>
  );
});

export default TableComponent;
