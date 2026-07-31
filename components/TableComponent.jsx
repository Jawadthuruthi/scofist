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
  getPaginationRowModel,
} from "@tanstack/react-table";
import { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useReactToPrint } from "react-to-print";
import { useVirtualizer } from "@tanstack/react-virtual";
import useTableColumns from "@/hooks/use-table-columns";
import PrintHeader from "./PrintHeader";
import { SlidersHorizontal, Filter, Search, LayoutGrid, List, Download, Printer } from "lucide-react";

import { cn } from "@/lib/utils";
import PopupFilter from "./PopupFilter";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";

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

const EMPTY_ARRAY = [];

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
  searchPlaceholderMobile,
  onFiltersChange,
  enablePagination = false,
  inlineFilters = false,
  requireFilterToRenderData = false,
  gridColsClass = "grid-cols-1 lg:grid-cols-2",
}, ref) => {
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]); // Advanced filters
  const [showFilterInput, setShowFilterInput] = useState(false);
  const [viewMode, setViewMode] = useState(defaultViewMode); // list or grid

  const tableRef = useRef(null);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(columnFilters);
    }
  }, [columnFilters, onFiltersChange]);

  // Clear row selection when filters change
  useEffect(() => {
    if (onRowSelectionChange && Object.keys(rowSelection || {}).length > 0) {
      onRowSelectionChange({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters, globalFilter]);

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

  const printSubTitleText = useMemo(() => {
    let subTitle = "";
    if (columnFilters && columnFilters.length > 0) {
      const filterLabels = columnFilters
        .filter(f => f.value && f.value.length > 0)
        .map(f => {
          const filterDef = filterConfig?.find(fc => fc.id === f.id);
          const label = filterDef ? filterDef.label : f.id;
          const valStr = Array.isArray(f.value) ? f.value.join(", ") : String(f.value);
          return `${label}: ${valStr}`;
        });
      if (filterLabels.length > 0) {
        subTitle = filterLabels.join(' | ');
      }
    }
    return subTitle || undefined;
  }, [columnFilters, filterConfig]);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [isPrinting, setIsPrinting] = useState(false);
  const resolvePrintRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: tableRef,
    documentTitle: dynamicPrintTitle,
    onBeforePrint: () => {
      return new Promise((resolve) => {
        setIsPrinting(true);
        resolvePrintRef.current = resolve;
      });
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    }
  });

  useEffect(() => {
    if (isPrinting && resolvePrintRef.current) {
      // Give React and the browser time to render all rows before resolving
      const timer = setTimeout(() => {
        if (resolvePrintRef.current) {
          resolvePrintRef.current();
          resolvePrintRef.current = null;
        }
      }, 500); // 500ms safety buffer for large tables to finish rendering
      return () => clearTimeout(timer);
    }
  }, [isPrinting]);

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

  const hasSearch = globalFilter && globalFilter.trim().length > 0;
  const hasFilters = columnFilters && columnFilters.some(f => f.value && (Array.isArray(f.value) ? f.value.length > 0 : String(f.value).trim().length > 0));
  const isAwaitingFilter = requireFilterToRenderData && !hasSearch && !hasFilters;

  const displayData = useMemo(() => {
    if (!requireFilterToRenderData) return data;
    if (hasSearch || hasFilters) return data;
    return EMPTY_ARRAY;
  }, [data, requireFilterToRenderData, hasSearch, hasFilters]);

  const table = useReactTable({
    data: displayData,
    columns,
    getRowId,
    onSortingChange: setSorting,
    onRowSelectionChange: onRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: (enablePagination && !isPrinting) ? getPaginationRowModel() : undefined,
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      globalFilter,
      columnFilters,
      ...(enablePagination && !isPrinting ? { pagination } : {}),
    },
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 45, // default row height estimate
    overscan: 10,
  });

  useImperativeHandle(ref, () => ({
    getFilteredData: () => table.getFilteredRowModel().rows.map(row => row.original),
    getFilters: () => columnFilters,
    printTable: handlePrint,
    exportCSV: handleExportCSV
  }));

  return (
    <div className="space-y-4">
      {/* Unified Toolbar Container */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
        {/* Primary Row: Col Mgmt, Search, CSV, Print on Mobile. On Desktop: Col Mgmt, Search */}
        <div className="flex items-center gap-2 w-full md:flex-1 order-1">
          {/* Column Management */}
          {!hideColumnManagement && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 flex items-center justify-center md:w-auto md:px-3 lg:flex shrink-0">
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

          {/* View Toggle */}
          {enableGrid && !hideViewToggle && (
            <div className="flex items-center border rounded-md overflow-hidden shrink-0">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 px-0 rounded-none border-r flex items-center justify-center"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 px-0 rounded-none flex items-center justify-center"
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Inline Filters (Desktop) */}
          {inlineFilters && filterConfig.length > 0 && filterConfig.map((filter) => (
             filter.inputType === "multiSelect" ? (
               <div key={filter.id} className="hidden md:block w-auto min-w-[180px]">
                 <MultiSelect
                   options={filter.options}
                   onValueChange={(val) => {
                     setColumnFilters((prev) => {
                       const existing = prev.find((f) => f.id === filter.id);
                       if (existing) {
                         return prev.map((f) => (f.id === filter.id ? { ...f, value: val } : f));
                       }
                       return [...prev, { id: filter.id, value: val }];
                     });
                   }}
                   value={columnFilters.find((f) => f.id === filter.id)?.value || []}
                   placeholder={filter.label}
                   variant="default"
                   maxCount={1}
                 />
               </div>
             ) : null
          ))}

          {/* Global Search Button/Input */}
          {!hideSearch && (
            <div className={cn("relative items-center flex-1 min-w-0", inlineFilters ? "hidden md:flex" : "flex")}>
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground z-10" />
              <Input
                placeholder={searchPlaceholderMobile || searchPlaceholder || "Search..."}
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-10 pl-8 w-full"
              />
            </div>
          )}



          {/* Mobile Action Buttons */}
          {actionButtons && (
            <div className="flex md:hidden items-center gap-1 overflow-x-auto hide-scrollbar shrink-0">
              {actionButtons}
            </div>
          )}

          {/* Filters (Mobile) */}
          {!inlineFilters && filterConfig.length > 0 && (
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
              triggerClass="flex h-8 w-8 md:w-auto md:px-3 p-0 shrink-0 justify-center items-center"
            />
          )}

          {/* CSV (Mobile) */}
          {showCsvBtn && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="flex md:hidden h-8 w-8 p-0 shrink-0 items-center justify-center"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {/* Print (Mobile) */}
          {!hidePrintBtn && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="flex md:hidden h-8 w-8 p-0 shrink-0 items-center justify-center"
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Secondary Row / Desktop Right Side */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto md:ml-auto order-2">
          
          {/* Inline Filters (Mobile) */}
          {inlineFilters && filterConfig.length > 0 && filterConfig.map((filter) => (
             filter.inputType === "multiSelect" ? (
               <div key={filter.id} className="w-[calc(50%-0.25rem)] md:hidden">
                 <MultiSelect
                   options={filter.options}
                   onValueChange={(val) => {
                     setColumnFilters((prev) => {
                       const existing = prev.find((f) => f.id === filter.id);
                       if (existing) {
                         return prev.map((f) => (f.id === filter.id ? { ...f, value: val } : f));
                       }
                       return [...prev, { id: filter.id, value: val }];
                     });
                   }}
                   value={columnFilters.find((f) => f.id === filter.id)?.value || []}
                   placeholder={filter.label}
                   variant="default"
                   maxCount={1}
                 />
               </div>
             ) : null
          ))}

          {/* Global Search Button/Input (Mobile, if inlineFilters) */}
          {!hideSearch && inlineFilters && (
            <div className="relative flex items-center w-[calc(50%-0.25rem)] md:hidden">
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground z-10" />
              <Input
                placeholder={searchPlaceholderMobile || searchPlaceholder || "Search..."}
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-10 pl-8 w-full"
              />
            </div>
          )}



          {/* Action Buttons (Desktop) */}
          {actionButtons && (
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {actionButtons}
            </div>
          )}

          {/* CSV (Desktop) */}
          {showCsvBtn && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="hidden md:flex h-8 md:h-10 w-auto px-3 shrink-0"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              <span className="ml-2">Export CSV</span>
            </Button>
          )}

          {/* Print (Desktop) */}
          {!hidePrintBtn && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="hidden md:flex h-8 md:h-10 w-auto px-3 shrink-0"
              title="Print"
            >
              <Printer className="h-4 w-4" />
              <span className="ml-2">Print</span>
            </Button>
          )}
        </div>
      </div>



      {isAwaitingFilter ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-md bg-muted/10 shadow-sm min-h-[300px]">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Search className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Records Displayed</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Please search for a book in the search bar or select options from the dropdowns above to view the records.
          </p>
        </div>
      ) : viewMode === "grid" && renderGridItem ? (
        <div ref={tableRef}>
          <PrintHeader
            apiKey={apiKey}
            title={printTitle}
            subTitle={printSubTitleText}
            hidePrintLogo={hidePrintLogo}
          />
          <div className={`grid ${gridColsClass} gap-4`}>
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
          ref={tableContainerRef}
          className="rounded-md border overflow-auto shadow-sm table-print relative"
          style={{
            maxHeight: tableHeight,
          }}
        >
          <div ref={tableRef}>
            <PrintHeader
              apiKey={apiKey}
              title={printTitle}
              subTitle={printSubTitleText}
              hidePrintLogo={hidePrintLogo}
            />
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
                {rows.length > 0 ? (
                  isPrinting || enablePagination ? (
                    rows.map((row) => (
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
                    <>
                      {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].start > 0 && (
                        <tr>
                          <td style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
                        </tr>
                      )}
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        return (
                          <TableRow
                            key={row.id}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
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
                        );
                      })}
                      {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end < rowVirtualizer.getTotalSize() && (
                        <tr>
                          <td style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }} />
                        </tr>
                      )}
                    </>
                  )
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
        </div>
      )}
      {showTotalCount && (
        <div className="flex items-center mt-2 px-1 print:hidden">
          <div className="text-sm font-medium text-muted-foreground">
            {totalCountLabel}: {table.getFilteredRowModel().rows.length}
          </div>
        </div>
      )}
      
      {/* Pagination Controls */}
      {enablePagination && !isPrinting && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-4 px-2 print:hidden">
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export default TableComponent;
