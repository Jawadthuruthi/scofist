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
import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import useTableColumns from "@/hooks/use-table-columns";
import PrintHeader from "./PrintHeader";
import { SlidersHorizontal, Filter } from "lucide-react";

const getCellStyles = (meta) => ({
  width: meta?.width || "auto",
  minWidth: meta?.minWidth || "50px", // Reduced default from 100px
  maxWidth: meta?.maxWidth || "300px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  padding: meta?.padding, // Allow overriding padding
});

const TableComponent = ({
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
}) => {
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [showFilterInput, setShowFilterInput] = useState(false);

  const tableRef = useRef(null);

  const columns = useMemo(() => {
    return useTableColumns(columnsConfig);
  }, [columnsConfig]);

  const handlePrint = useReactToPrint({
    contentRef: tableRef,
    documentTitle: printTitle ? printTitle : "Table Print",
  });

  const table = useReactTable({
    data,
    columns,
    getRowId,
    onSortingChange: setSorting,
    onRowSelectionChange: onRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      globalFilter,
    },
  });
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 lg:flex"
            onClick={() => setShowFilterInput(!showFilterInput)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          {showFilterInput && (
            <Input
              placeholder="Filter..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 lg:flex">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[150px]">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.columnDef.header}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
          {table.getRowModel().rows.length > 0 ? (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={getCellStyles(header.column.columnDef.meta)}
                        className={header.id === "select" ? "print:hidden" : ""}
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
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="break-inside-avoid"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        style={getCellStyles(cell.column.columnDef.meta)}
                        key={cell.id}
                        className={
                          cell.column.id === "select" ? "print:hidden" : ""
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-full p-4 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>
      {!hidePrintBtn && (
        <div className="w-full flex justify-end">
          <Button onClick={handlePrint}>Print</Button>
        </div>
      )}
    </div>
  );
};

export default TableComponent;
