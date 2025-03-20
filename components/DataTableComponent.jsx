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
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import usePrint from "@/hooks/use-print";
import useTableColumns from "@/hooks/use-table-columns";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useDataFilter from "@/hooks/use-data-filter";
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

const getCellStyles = (meta) => ({
  width: meta?.width || "auto",
  minWidth: meta?.minWidth || "100px",
  maxWidth: meta?.maxWidth || "300px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const handleError = (error) => {
  console.error(error.message);
  toast.error(error.message || "Something went wrong. Please try again later.");
};

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
  limit = 20,
}) => {
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(0);
  const [data, setData] = useState(initialData);
  const [hasNextPage, setHasNextPage] = useState(true);

  const tableRef = useRef(null);
  const loaderRef = useRef(null);
  const router = useRouter();

  const {
    filteredData,
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    globalFilter,
    setGlobalFilter,
    hasFilters,
  } = useDataFilter(data);

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    resource,
    token
  );

  const fetchItemsQuery = useFetchItems(
    page,
    limit,
    {},
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

  useEffect(() => {
    if (fetchItemsQuery.error) {
      toast.error(
        fetchItemsQuery.error.message ||
          "Failed to fetch data. Please try again."
      );
    }
  }, [fetchItemsQuery.error]);

  useEffect(() => {
    if (fetchItemsQuery.data) {
      const newItems = fetchItemsQuery.data[resource] || [];

      if (page === 0) {
        setData(newItems);
      } else {
        setData((prev) => [...prev, ...newItems]);
      }

      setHasNextPage(newItems.length === limit);
    }
  }, [fetchItemsQuery.data, page, resource, limit]);

  const isInitialLoading =
    fetchItemsQuery.isLoading && page === 0 && !data.length;

  const isLoadingMore = fetchItemsQuery.isLoading && page > 0;

  const fetchNextPage = useCallback(() => {
    if (hasNextPage && !isLoadingMore && !fetchItemsQuery.isLoading) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [hasNextPage, isLoadingMore, fetchItemsQuery.isLoading]);

  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) fetchNextPage();
    },
    [hasNextPage, isLoadingMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  // Auto fetch more data if filtered data is less
  useEffect(() => {
    if (filteredData.length < limit) fetchNextPage();
  }, [
    filteredData,
    hasNextPage,
    isLoadingMore,
    fetchItemsQuery.isLoading,
    limit,
  ]);

  const handlePrint = usePrint({
    content: () => tableRef.current,
  });

  const columns = useMemo(() => {
    return useTableColumns(columnsConfig);
  }, [columnsConfig]);

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
    [rowSelection, table]
  );

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      await addData.mutateAsync(values);
      table.resetRowSelection();
      toast.success(createSuccessMessage);
      setPage(0);
      router.refresh();
    } catch (error) {
      handleError(error);
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
      setPage(0);
      router.refresh();
      toast.success(editSuccessMessage);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteData.mutateAsync(selectedData?.map((item) => item._id));
      table.resetRowSelection();
      setPage(0);
      toast.success(deleteSuccessMessage);
      router.refresh();
    } catch (error) {
      handleError(error);
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
            hasFilters={hasFilters || Object.keys(filters).length > 0}
            buttonLabel={resource}
          />
        </div>
        <div className="space-x-2">
          {!!selectedData?.length && (
            <ConfirmationPopup
              onClick={handleDelete}
              action="delete"
              loading={loading}
              title={deleteFormTitle}
            />
          )}
          {(selectedData.length === 1 ||
            (selectedData.length > 1 && multiEdit)) && (
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
      {!!selectedData.length && (
        <div className="mb-2 text-muted-foreground">
          {selectedData?.length} selected
        </div>
      )}
      <div
        ref={tableRef}
        className={`rounded-md overflow-auto border shadow-sm table-print`}
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
                      style={getCellStyles(header.column.columnDef.meta)}
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
            {isInitialLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex justify-center">
                    <Loader2 className="animate-spin" size={24} />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      style={getCellStyles(cell.column.columnDef.meta)}
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
                    {hasFilters || Object.keys(filters).length > 0
                      ? "No matching records found."
                      : "Sorry, there is no data available at the moment."}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {hasNextPage && table.getRowModel().rows?.length > 0 && (
          <div ref={loaderRef} className="w-full p-4 text-center print:hidden">
            {isLoadingMore ? (
              <div className="flex justify-center">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="h-8" />
            )}
          </div>
        )}
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
