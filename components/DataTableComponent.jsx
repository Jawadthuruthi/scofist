"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useRef, useState } from "react";
import usePrint from "@/hooks/use-print";
import useTableColumns from "@/hooks/use-table-columns";
import { useCrud } from "@/hooks/use-crud";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useDataFilter } from "@/hooks/use-data-filter";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PopupFilter = dynamic(() => import("./PopupFilter"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader2 />
    </Button>
  ),
});
const ColumnCustomization = dynamic(() => import("./ColumnCustomization"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader2 />
    </Button>
  ),
});
const ConfirmationPopup = dynamic(() => import("./ConfirmationPopup"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader2 />
    </Button>
  ),
});
const PopupForm = dynamic(() => import("./PopupForm"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader2 />
    </Button>
  ),
});

const DataTableComponent = ({
  resource,
  initialData = [],
  columnsConfig,
  tableHeight = "calc(100vh - 312px)",
  formFields,
  createSuccessMessage = "Item added successfully!",
  editSuccessMessage = "Item updated successfully!",
  deleteSuccessMessage = "Item deleted successfully!",
  token,
  createFormTitle = "Add New Item",
  editFormTitle = "Edit Item",
  deleteFormTitle = "Delete Item",
  filterConfig = [],
  multiEdit = false,
}) => {
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  const tableRef = useRef(null);
  const router = useRouter();

  const {
    useFetchItems,
    useFetchItemById,
    useAddItem,
    useUpdateItem,
    useDeleteItem,
  } = useCrud(resource, token);

  const {
    filteredData,
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    globalFilter,
    setGlobalFilter,
    hasFilters,
  } = useDataFilter(initialData);

  const handlePrint = usePrint({
    content: () => tableRef.current,
  });

  const columns = useTableColumns(columnsConfig);

  const addData = useAddItem();
  const updateData = useUpdateItem();
  const deleteData = useDeleteItem();

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedData = useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
    [rowSelection]
  );

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      await addData.mutateAsync(values);
      table.resetRowSelection();
      toast.success(createSuccessMessage);
      router.refresh();
    } catch (error) {
      console.error(error.message);
      toast.error(
        error.message || "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (values) => {
    try {
      setLoading(true);
      await updateData.mutateAsync({
        data: {
          ids: selectedData?.map((item) => item._id),
          ...values,
        },
      });
      table.resetRowSelection();
      router.refresh();
      toast.success(editSuccessMessage);
    } catch (error) {
      console.error(error.message);
      toast.error(
        error.message || "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteData.mutateAsync(selectedData?.map((item) => item._id));
      table.resetRowSelection();
      toast.success(deleteSuccessMessage);
      router.refresh();
    } catch (error) {
      console.error(error.message);
      toast.error(
        error.message || "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="mr-auto space-x-2 flex">
          <ColumnCustomization table={table} columnsConfig={columnsConfig} />
          <PopupFilter
            filterConfig={filterConfig}
            filters={filters}
            setFilter={setFilter}
            removeFilter={removeFilter}
            clearFilters={clearFilters}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            hasFilters={hasFilters}
            buttonLabel="Table Filters"
          />
        </div>
        <div className="space-x-2">
          {selectedData?.length > 0 && (
            <ConfirmationPopup
              onClick={handleDelete}
              action="delete"
              loading={loading}
              title={deleteFormTitle}
            />
          )}
          {((selectedData?.length > 0 && multiEdit) ||
            selectedData?.length === 1) && (
            <PopupForm
              data={selectedData[0]}
              formFields={formFields}
              onSubmit={handleEdit}
              loading={loading}
              title={editFormTitle}
            />
          )}
          <PopupForm
            formFields={formFields}
            onSubmit={handleSubmit}
            loading={loading}
            title={createFormTitle}
          />
        </div>
      </div>
      <div
        ref={tableRef}
        className={`rounded-md overflow-auto border shadow-sm`}
        style={{
          maxHeight: tableHeight,
        }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.column.columnDef.meta?.width || "auto",
                        minWidth:
                          header.column.columnDef.meta?.minWidth || "100px",
                        maxWidth:
                          header.column.columnDef.meta?.maxWidth || "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      style={{
                        width: cell.column.columnDef.meta?.width || "auto",
                        minWidth:
                          cell.column.columnDef.meta?.minWidth || "100px",
                        maxWidth:
                          cell.column.columnDef.meta?.maxWidth || "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      key={cell.id}
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
                  className="h-24 text-center"
                >
                  <h2 className="text-lg font-bold">No Data.</h2>
                  <p className="text-sm text-muted-foreground">
                    Sorry, there is no data available at the moment.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getRowModel().rows?.length > 0 && (
        <div className="py-4 w-full flex justify-end">
          <Button onClick={handlePrint}>Print</Button>
        </div>
      )}
    </div>
  );
};

export default DataTableComponent;
