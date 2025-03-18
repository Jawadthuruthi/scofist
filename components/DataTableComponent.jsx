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
import { useCrud } from "@/hooks/use-crud";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useDataFilter } from "@/hooks/use-data-filter";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { debounce } from "lodash";

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
  limit = 20, // Default limit for infinite loading
}) => {
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(0);
  const [data, setData] = useState(initialData);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Server-side filter state
  const [apiFilters, setApiFilters] = useState({});
  const [isFilterRefetching, setIsFilterRefetching] = useState(false);

  const tableRef = useRef(null);
  const loaderRef = useRef(null);
  const router = useRouter();

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    resource,
    token
  );

  // Use the fetchItems hook with pagination parameters and server-side filters
  const fetchItemsQuery = useFetchItems(page, limit, apiFilters);

  // Update data state when query data changes
  // Update data state when query data changes
  useEffect(() => {
    if (fetchItemsQuery.data) {
      const newItems = fetchItemsQuery.data[resource] || [];

      if (page === 0 || isFilterRefetching) {
        setData(newItems);
        setIsFilterRefetching(false);
      } else {
        // Append new items to existing data
        setData((prev) => [...prev, ...newItems]);
      }

      // Check if we've reached the end of available data
      setHasNextPage(newItems.length === limit);
    }
  }, [fetchItemsQuery.data, page, resource, limit, isFilterRefetching]);

  // Intersection Observer setup
  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage &&
        !fetchItemsQuery.isLoading &&
        !isFilterRefetching
      ) {
        setIsFetchingNextPage(true);
        setPage((prevPage) => prevPage + 1);
        setIsFetchingNextPage(false);
      }
    },
    [
      hasNextPage,
      isFetchingNextPage,
      fetchItemsQuery.isLoading,
      isFilterRefetching,
    ]
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

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [handleObserver]);

  // Client-side filtering for additional filtering options
  const {
    filteredData,
    filters,
    setFilter: setClientFilter,
    removeFilter: removeClientFilter,
    clearFilters: clearClientFilters,
    globalFilter,
    setGlobalFilter,
    hasFilters,
  } = useDataFilter(data);

  // Convert client-side filter to API filter format and trigger refetch
  const setFilter = useCallback(
    debounce((field, value) => {
      setClientFilter(field, value);
      setApiFilters((prev) => {
        const apiFilter = { ...prev };
        if (!value) delete apiFilter[field];
        else apiFilter[field] = value;
        return apiFilter;
      });
      setPage(0);
      setIsFilterRefetching(true);
    }, 300),
    [setClientFilter]
  );

  // Handle filter removal with API updates
  const removeFilter = useCallback(
    (field) => {
      removeClientFilter(field);

      // Remove from API filters
      setApiFilters((prev) => {
        const apiFilter = { ...prev };

        // Remove all variants of this field filter
        Object.keys(apiFilter).forEach((key) => {
          if (key === field || key.startsWith(`${field}_`)) {
            delete apiFilter[key];
          }
        });

        return apiFilter;
      });

      // Reset to first page and refetch
      setPage(0);
      setIsFilterRefetching(true);
    },
    [removeClientFilter]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    clearClientFilters();
    setApiFilters({});
    setPage(0);
    setIsFilterRefetching(true);
  }, [clearClientFilters]);

  // Handle global filter
  useEffect(() => {
    if (globalFilter) {
      setApiFilters((prev) => ({
        ...prev,
        search: globalFilter,
      }));
    } else {
      setApiFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters.search;
        return newFilters;
      });
    }

    if (globalFilter !== undefined) {
      setPage(0);
      setIsFilterRefetching(true);
    }
  }, [globalFilter]);

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
    [rowSelection, table]
  );

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      await addData.mutateAsync(values);
      table.resetRowSelection();
      toast.success(createSuccessMessage);
      // Reset page to ensure fresh data is loaded
      setPage(0);
      setIsFilterRefetching(true);
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
      // Reset page to ensure fresh data is loaded
      setPage(0);
      setIsFilterRefetching(true);
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
      // Reset page to ensure fresh data is loaded
      setPage(0);
      setIsFilterRefetching(true);
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

  // Single loading state approach
  const isLoading = fetchItemsQuery.isLoading && page === 0 && !data.length;
  const isLoadingMore = isFetchingNextPage || fetchItemsQuery.isLoading;
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
            {isLoading ? (
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
                    {hasFilters
                      ? "No matching records found."
                      : "Sorry, there is no data available at the moment."}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Intersection Observer Target */}
        {hasNextPage && table.getRowModel().rows?.length > 0 && (
          <div ref={loaderRef} className="w-full p-4 text-center">
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
