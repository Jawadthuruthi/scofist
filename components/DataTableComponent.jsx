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
import { useMemo, useRef, useState, useEffect, useCallback, use } from "react";
import useTableColumns from "@/hooks/use-table-columns";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useDataFilter from "@/hooks/use-data-filter";
import dynamic from "next/dynamic";
import { Loader } from "lucide-react";
import { capitalize, debounce } from "lodash";
import { Skeleton } from "./ui/skeleton";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyPrintStyles, removePrintStyles } from "@/lib/utils";

const PopupFilter = dynamic(() => import("./PopupFilter"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader />
    </Button>
  ),
});
const ColumnCustomization = dynamic(() => import("./ColumnCustomization"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader />
    </Button>
  ),
});
const ConfirmationPopup = dynamic(() => import("./ConfirmationPopup"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader />
    </Button>
  ),
});
const PopupForm = dynamic(() => import("./PopupForm"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      <Loader />
    </Button>
  ),
});
const PrintHeader = dynamic(() => import("./PrintHeader"), {
  ssr: false,
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
  if (!error.details?.errors) {
    toast.error(
      error.message || "Something went wrong. Please try again later."
    );
  } else {
    toast.error("Validation error. Check your input.");
  }
};

const DataTableComponent = ({
  resource,
  apiEndpoint = "",
  initialData = [],
  columnsConfig,
  tableHeight = "calc(100vh - 312px)",
  formFields,
  createSuccessMessage = "Item added successfully!",
  editSuccessMessage = "Item Updated successfully!",
  deleteSuccessMessage = "Item deleted successfully!",
  apiKey,
  createFormTitle = "Add New Item",
  editFormTitle = "Edit Item",
  deleteFormTitle = "Delete Item",
  filterConfig = [],
  multiEdit = false,
  limit = 20,
  apiFilters = {},
  readOnly = false,
  filterTitle = "",
  filterType = "client",
  infiniteScrollThreshold = 0.3,
  printTitle,
}) => {
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(0);
  const [data, setData] = useState(initialData);
  const [dataCount, setDataCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isManualFiltering, setIsManualFiltering] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [activeApiFilters, setActiveApiFilters] = useState(apiFilters);
  const [showLogo, setShowLogo] = useState(false);

  const tableRef = useRef(null);
  const isFetchingRef = useRef(false);
  const loaderRef = useRef(null);
  const router = useRouter();

  const isMobile = useIsMobile();
  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  // Client-side filtering
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
    apiEndpoint ? apiEndpoint : resource,
    apiKey
  );

  // Determine if we should use API filtering
  const isApiFiltering = filterType === "api";

  // Create a memoized combined filters object for API calls
  const combinedApiFilters = useMemo(() => {
    if (!isApiFiltering) return activeApiFilters;

    const transformedFilters = {};

    if (hasFilters) {
      Object.entries(filters).forEach(([key, filterObj]) => {
        const value = filterObj?.value;

        if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.assign(transformedFilters, value);
        } else if (value !== undefined) {
          transformedFilters[key] = value;
        } else if (filterObj !== undefined) {
          transformedFilters[key] = filterObj;
        }
      });
    }

    return {
      ...activeApiFilters,
      ...transformedFilters,
      ...(globalFilter ? { global: globalFilter } : {}),
    };
  }, [isApiFiltering, activeApiFilters, filters, globalFilter, hasFilters]);

  // API fetch with combined filters
  const fetchItemsQuery = useFetchItems(page, limit, combinedApiFilters, {
    retry: 2,
    retryDelay: 1000,
  });

  // Handle fetch errors
  useEffect(() => {
    if (fetchItemsQuery.error) {
      toast.error(
        fetchItemsQuery.error.message ||
          "Failed to fetch data. Please try again."
      );
    }
  }, [fetchItemsQuery.error]);

  // Process fetched data
  useEffect(() => {
    if (fetchItemsQuery.data) {
      const newItems = fetchItemsQuery.data[resource] || [];
      const pagination = fetchItemsQuery.data?.pagination || {};

      setTotalPages(pagination?.totalPages || 0);
      setDataCount(pagination?.total || 0);

      // Reset data if filters changed or on initial load
      if (isManualFiltering || (page === 0 && !initialData.length)) {
        setData(newItems);
        setIsManualFiltering(false);
      } else {
        // Append data for pagination
        setData((prev) => {
          // Filter out duplicates based on _id
          const existingIds = new Set(prev.map((item) => item._id));
          const uniqueNewItems = newItems.filter(
            (item) => !existingIds.has(item._id)
          );
          return [...prev, ...uniqueNewItems];
        });
      }
      setHasNextPage(page < (pagination?.totalPages || 1) - 1);
      setIsFetchingNextPage(false);
      isFetchingRef.current = false;
    }
  }, [
    fetchItemsQuery.data,
    page,
    resource,
    limit,
    isManualFiltering,
    initialData.length,
  ]);

  useEffect(() => {
    console.log("Page changed:", page);
  }, [page]);

  // Loading states
  const isInitialLoading =
    fetchItemsQuery.isLoading && page === 0 && !data.length;

  const isLoadingMore =
    isFetchingNextPage || (fetchItemsQuery.isLoading && page > 0);

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isLoadingMore || isFetchingRef.current) {
      console.log("Skipping fetch: already fetching or no more pages");
      return;
    }

    console.log(`Fetching next page: ${page + 1}`);
    isFetchingRef.current = true; // lock

    setIsFetchingNextPage(true);
    setPage((prevPage) => prevPage + 1);
  }, [hasNextPage, isLoadingMore, page]);

  // Improved IntersectionObserver handler
  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoadingMore && hasNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, isLoadingMore, hasNextPage]
  );

  // Enhanced scroll handling with debounce
  const handleScroll = useCallback(
    debounce(() => {
      if (!tableRef.current || isLoadingMore || !hasNextPage) return;

      const container = tableRef.current;
      const scrollPosition = container.scrollTop + container.clientHeight;
      const scrollThreshold = container.scrollHeight * infiniteScrollThreshold;

      // Load more data before reaching the bottom
      if (scrollPosition >= scrollThreshold) {
        fetchNextPage();
      }
    }, 100),
    [fetchNextPage, isLoadingMore, hasNextPage, infiniteScrollThreshold]
  );

  // Set up the intersection observer for the loader element
  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: tableRef.current,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  // Set up scroll event for table body
  useEffect(() => {
    const tableBody = tableRef.current;
    if (tableBody) {
      tableBody.addEventListener("scroll", handleScroll);
      return () => tableBody.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Check if we need to load more data for client-side filtering
  useEffect(() => {
    if (!isApiFiltering && hasNextPage && !isLoadingMore) {
      const displayedRows = filteredData.length;
      const targetRowCount = limit * (page + 1);

      // If we're filtering and don't have enough displayed data, fetch more
      if (hasFilters && displayedRows < targetRowCount) {
        fetchNextPage();
      }
    }
  }, [
    filteredData.length,
    hasFilters,
    fetchNextPage,
    hasNextPage,
    isLoadingMore,
    limit,
    page,
    isApiFiltering,
  ]);

  // Handle API filtering
  const handleApiFilter = useCallback(() => {
    if (isApiFiltering) {
      setIsManualFiltering(true);
      setPage(0);
      setHasNextPage(true);
      setData([]);
      fetchItemsQuery.refetch();
    }
  }, [isApiFiltering, fetchItemsQuery]);

  // Update filters with debounce for API filtering
  const debouncedApiFilterUpdate = useCallback(
    debounce(() => {
      handleApiFilter();
    }, 300),
    [handleApiFilter]
  );

  // Intercept filter changes for API filtering
  const handleSetFilter = useCallback(
    (key, value, operator, nestedArrayField) => {
      setFilter(key, value, operator, nestedArrayField);
      if (isApiFiltering) {
        debouncedApiFilterUpdate();
      }
    },
    [setFilter, isApiFiltering, debouncedApiFilterUpdate]
  );

  const handleRemoveFilter = useCallback(
    (key) => {
      removeFilter(key);
      if (isApiFiltering) {
        debouncedApiFilterUpdate();
      }
    },
    [removeFilter, isApiFiltering, debouncedApiFilterUpdate]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    if (isApiFiltering) {
      debouncedApiFilterUpdate();
    }
  }, [clearFilters, isApiFiltering, debouncedApiFilterUpdate]);

  const handleSetGlobalFilter = useCallback(
    (value) => {
      setGlobalFilter(value);
      if (isApiFiltering) {
        debouncedApiFilterUpdate();
      }
    },
    [setGlobalFilter, isApiFiltering, debouncedApiFilterUpdate]
  );

  const handlePrint = useReactToPrint({
    contentRef: tableRef,
    documentTitle: printTitle ? printTitle : resource,
  });

  const handleDownloadPDF = async () => {
    applyPrintStyles();
    const html2pdf = (await import("html2pdf.js")).default;

    const element = tableRef.current;
    const images = element.querySelectorAll("img");
    const imagePromises = Array.from(images).map((img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = resolve;
          img.onerror = resolve;
        }
      });
    });

    await Promise.all(imagePromises);
    const options = {
      filename: `${printTitle ? printTitle : resource}.pdf`,
      margin: 0.5,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: "portrait",
      },
    };

    await html2pdf().set(options).from(element).save();
    removePrintStyles();
  };

  // Table columns
  const columns = useMemo(() => {
    return useTableColumns(columnsConfig);
  }, [columnsConfig]);

  // CRUD operations
  const addData = useAddItem();
  const updateData = useUpdateItem();
  const deleteData = useDeleteItem();

  // Initialize table
  const table = useReactTable({
    data: isApiFiltering ? data : filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    manualFiltering: isApiFiltering,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: isApiFiltering ? undefined : globalFilter,
    },
  });

  // Selected rows data
  const selectedData = useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
    [table, rowSelection]
  );

  // Form submission handler
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([_, value]) => Boolean(value))
      );

      await addData.mutateAsync(filteredValues);
      table.resetRowSelection();
      await fetchItemsQuery.refetch();
      toast.success(createSuccessMessage);
      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
      setIsManualFiltering(false);
    }
  };

  // Edit handler
  const handleEdit = async (values) => {
    try {
      setLoading(true);
      await updateData.mutateAsync({
        data: {
          ids: selectedData?.map((item) => item?._id),
          ...values,
        },
      });
      table.resetRowSelection();
      await fetchItemsQuery.refetch();
      toast.success(editSuccessMessage);
      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
      setIsManualFiltering(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteData.mutateAsync(selectedData?.map((item) => item?._id));
      table.resetRowSelection();
      await fetchItemsQuery.refetch();
      toast.success(deleteSuccessMessage);
      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
      setIsManualFiltering(false);
    }
  };

  // Display current filter mode (only in development)
  const filterModeDisplay = useMemo(() => {
    return isApiFiltering ? "API Filtering" : "Client Filtering";
  }, [isApiFiltering]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="mr-auto space-x-2 flex">
          <ColumnCustomization table={table} columnsConfig={columnsConfig} />
          <PopupFilter
            filterConfig={filterConfig}
            filters={filters}
            setFilter={handleSetFilter}
            removeFilter={handleRemoveFilter}
            clearFilters={handleClearFilters}
            globalFilter={globalFilter}
            setGlobalFilter={handleSetGlobalFilter}
            hasFilters={hasFilters || Object.keys(filters).length > 0}
            title={filterTitle || capitalize(resource)}
            filterType={filterType}
          />
        </div>
        <div className="space-x-2">
          {!!selectedData?.length && !readOnly && (
            <ConfirmationPopup
              onClick={handleDelete}
              action="delete"
              loading={loading}
              title={deleteFormTitle}
            />
          )}
          {(selectedData.length === 1 ||
            (selectedData.length > 1 && multiEdit)) &&
            !readOnly && (
              <PopupForm
                data={selectedData[0]}
                formFields={formFields}
                onSubmit={handleEdit}
                loading={loading}
                title={editFormTitle}
                apiKey={apiKey}
              />
            )}
          {!readOnly && (
            <PopupForm
              formFields={formFields}
              onSubmit={handleSubmit}
              loading={loading}
              title={createFormTitle}
              apiKey={apiKey}
            />
          )}
        </div>
      </div>
      {!!selectedData.length && (
        <div className="text-muted-foreground">
          {selectedData?.length} selected
        </div>
      )}
      <div
        ref={tableRef}
        className="rounded-md border overflow-auto shadow-sm table-print relative "
        style={{
          maxHeight: tableHeight,
        }}
      >
        <PrintHeader
          apiKey={apiKey}
          title={printTitle ? printTitle : resource}
          displayOnScreen={showLogo}
        />
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
            {isInitialLoading ? (
              Array(3)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={columns.length} className="h-12">
                      <Skeleton className="w-full h-full rounded" />
                    </TableCell>
                  </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
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
                <Loader className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="h-8" />
            )}
          </div>
        )}
      </div>
      <div className="w-full flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} items
          {isApiFiltering && totalPages > 0 && ` of ${dataCount}+ total`}
          {process.env.NODE_ENV === "development" && (
            <span className="ml-2 px-2 py-1 bg-muted rounded-full text-xs">
              {filterModeDisplay}
            </span>
          )}
        </div>
        {table.getRowModel().rows?.length > 0 && (
          <>
            {isMobile ? (
              <Button onClick={handleDownloadPDF} className="print:hidden">
                Download PDF
              </Button>
            ) : (
              <Button onClick={handlePrint}>Print</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DataTableComponent;
