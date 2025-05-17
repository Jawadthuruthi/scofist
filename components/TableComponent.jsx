"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/react-table";
import { useMemo, useRef, useState } from "react";
import usePrint from "@/hooks/use-print";
import useTableColumns from "@/hooks/use-table-columns";
import PrintHeader from "./PrintHeader";

const getCellStyles = (meta) => ({
  width: meta?.width || "auto",
  minWidth: meta?.minWidth || "100px",
  maxWidth: meta?.maxWidth || "300px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const TableComponent = ({
  data = [],
  columnsConfig = [],
  apiKey,
  printTitle,
  hidePrintBtn = false,
  hidePrintLogo = false,
  tableHeight = "calc(100vh - 250px)",
}) => {
  const [sorting, setSorting] = useState([]);

  const tableRef = useRef(null);

  const columns = useMemo(() => {
    return useTableColumns(columnsConfig);
  }, [columnsConfig]);

  const handlePrint = usePrint({
    content: () => tableRef.current,
  });

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    state: {
      sorting,
    },
  });
  return (
    <div className="space-y-4">
      <div
        ref={tableRef}
        className="rounded-md border overflow-auto shadow-sm table-print relative"
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
