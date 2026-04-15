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
import { useMemo, useRef, useState, useEffect, useCallback, isValidElement, cloneElement } from "react";
import useTableColumns from "@/hooks/use-table-columns";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useDataFilter from "@/hooks/use-data-filter";
import dynamic from "next/dynamic";
import { Loader, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { capitalize, debounce } from "lodash";
import { Skeleton } from "./ui/skeleton";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyPrintStyles, removePrintStyles, formatDateForDisplay, cn, sortClasses } from "@/lib/utils";
import * as XLSX from "xlsx";
import PrintHeader from "@/components/PrintHeader";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import ColumnCustomization from "./ColumnCustomization";
import PopupFilter from "./PopupFilter";
import ConfirmationPopup from "./ConfirmationPopup";
import PopupForm from "./PopupForm";

// Dynamic imports removed to fix ChunkLoadError
// const PopupFilter = ...
// const ColumnCustomization = ... (already removed)
// const ConfirmationPopup = ...
// const PopupForm = ...

const getCellStyles = (meta) => ({
  width: meta?.width || "auto",
  minWidth: meta?.minWidth || "100px",
  maxWidth: meta?.maxWidth || "300px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const handleError = (error) => {
  // Safely handle error logging
  let message = "An error occurred";

  try {
    if (error && typeof error.message === 'string') {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
  } catch (e) {
    // Fallback if accessing property fails
    message = "Unknown error";
  }

  // Use console.log to avoid potential serialization issues in some environments
  console.log("Error handled:", message);

  if (!error?.details?.errors) {
    toast.error(message);
  } else {
    toast.error("Validation error. Check your input.");
  }
};

const DEFAULT_API_FILTERS = {};
const DEFAULT_ARRAY = [];
const DEFAULT_OBJECT = {};

const DataTableComponent = ({
  resource,
  apiEndpoint = "",
  initialData = DEFAULT_ARRAY,
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
  filterConfig = DEFAULT_ARRAY,
  multiEdit = false,
  limit = 20,
  apiFilters = DEFAULT_API_FILTERS,
  readOnly = false,
  filterTitle = "",
  filterType = "client",
  infiniteScrollThreshold = 0.3,
  printTitle,
  enableDelete = false,
  editFormFields = DEFAULT_ARRAY,
  additionalProps = DEFAULT_OBJECT,
  isFestival = false,
  multiEditFormFields = DEFAULT_ARRAY,
  enableCreate = true,
  enableSearch = false,
  printInReverse = false,
  dateRangeInPopup = false,
  enableMonthYearFilter = false,
  trailingToolbar = null,
  highlightHighest = null,
  mobileSplitLayout = false,
  mobileSearchPlaceholder = "Search...",
  rowLink = null,
  rowLinkKey = "_id",
  rowLinkSearchParams = "",
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
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [activeApiFilters, setActiveApiFilters] = useState(apiFilters);
  const [showLogo, setShowLogo] = useState(false);
  // Add state to track filter changes more precisely
  const [lastFilterHash, setLastFilterHash] = useState("");
  const [isFilterChanged, setIsFilterChanged] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => enableMonthYearFilter ? new Date().getMonth() + 1 : null);
  const [filterYear, setFilterYear] = useState(() => enableMonthYearFilter ? new Date().getFullYear() : null);
  const [toppersOnly, setToppersOnly] = useState(false);

  // Sync state to window as a fallback for dynamic toolbar components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__SET_TOPPERS__ = setToppersOnly;
      window.__TOPPERS_ONLY__ = toppersOnly;
    }
  }, [setToppersOnly, toppersOnly]);

  const tableRef = useRef(null);
  const isFetchingRef = useRef(false);
  const loaderRef = useRef(null);
  const router = useRouter();

  const isMobile = useIsMobile();

  // Sync activeApiFilters with prop
  useEffect(() => {
    setActiveApiFilters(apiFilters);
  }, [apiFilters]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  // Client-side filtering
  const initialFilters = useMemo(() => {
    const defaults = {};
    if (filterConfig) {
      filterConfig.forEach((f) => {
        if (f.defaultValue) {
          defaults[f.id] = { value: f.defaultValue };
          if (f.inputType === "dateRange") {
            // For dateRange, structure might need startDate/endDate if it's an object
            // But if we pass a string yyyy-mm-dd from URL, useDataFilter might expect specific structure ?
            // Let's assume for now simple value passing works, or logic needs adaptation
            defaults[f.id] = f.defaultValue;
          }
        }
      });
    }
    return defaults;
  }, [filterConfig]);

  const {
    filteredData,
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    globalFilter,
    setGlobalFilter,
    hasFilters,
  } = useDataFilter(data, initialFilters);

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

    if (enableMonthYearFilter && filterMonth && filterYear && !transformedFilters.startDate && !transformedFilters.endDate) {
      const startDateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
      const endDateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(new Date(filterYear, filterMonth, 0).getDate()).padStart(2, '0')}`;
      transformedFilters.startDate = startDateStr;
      transformedFilters.endDate = endDateStr;
    }

    return {
      ...activeApiFilters,
      ...transformedFilters,
      ...(globalFilter ? { global: globalFilter } : {}),
    };
  }, [isApiFiltering, activeApiFilters, filters, globalFilter, hasFilters, enableMonthYearFilter, filterMonth, filterYear]);

  // Create a hash of current filters to detect changes
  const currentFilterHash = useMemo(() => {
    return JSON.stringify({
      filters: combinedApiFilters,
      globalFilter,
      isApiFiltering,
    });
  }, [combinedApiFilters, globalFilter, isApiFiltering]);

  // Detect filter changes
  useEffect(() => {
    if (currentFilterHash !== lastFilterHash) {
      setIsFilterChanged(true);
      setLastFilterHash(currentFilterHash);
    }
  }, [currentFilterHash, lastFilterHash]);

  // API fetch with combined filters
  const fetchItemsQuery = useFetchItems(page, limit, combinedApiFilters, {
    retry: 2,
    retryDelay: 1000,
    refetchOnMount: "always",
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

  // FIXED: Process fetched data with better logic
  useEffect(() => {
    if (fetchItemsQuery.data) {
      const newItems = fetchItemsQuery.data[resource] || [];
      const pagination = fetchItemsQuery.data?.pagination || {};

      setTotalPages(pagination?.totalPages || 0);
      setDataCount(pagination?.total || 0);

      // FIXED: Better logic for when to reset vs append data
      const shouldResetData =
        isFilterChanged || // Filter changed
        page === 0 || // First page
        data.length === 0; // No existing data

      if (shouldResetData) {
        console.log("Resetting data:", {
          isFilterChanged,
          page,
          dataLength: data.length,
          newItemsLength: newItems.length,
        });
        setData(newItems);
        setIsFilterChanged(false);
      } else {
        // FIXED: More conservative duplicate handling for pagination
        setData((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const genuinelyNewItems = newItems.filter(
            (item) => !existingIds.has(item._id)
          );

          console.log("Appending data:", {
            prevLength: prev.length,
            newItemsLength: newItems.length,
            genuinelyNewLength: genuinelyNewItems.length,
            page,
          });

          // Only append if we actually have new items
          return genuinelyNewItems.length > 0
            ? [...prev, ...genuinelyNewItems]
            : prev;
        });
      }

      setHasNextPage(page < (pagination?.totalPages || 1) - 1);
      setIsFetchingNextPage(false);
      isFetchingRef.current = false;
    }
  }, [fetchItemsQuery.data, page, resource, isFilterChanged, data.length]);

  useEffect(() => {
    console.log("Page changed:", page, "Has next page:", hasNextPage);
  }, [page, hasNextPage]);

  // Loading states
  const isInitialLoading =
    fetchItemsQuery.isLoading && page === 0 && data.length === 0;

  const isLoadingMore =
    isFetchingNextPage || (fetchItemsQuery.isLoading && page > 0);

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isLoadingMore || isFetchingRef.current) {
      console.log("Skipping fetch:", {
        hasNextPage,
        isLoadingMore,
        isFetching: isFetchingRef.current,
      });
      return;
    }

    console.log(`Fetching next page: ${page + 1}`);
    isFetchingRef.current = true;
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

  // FIXED: More conservative client-side filter loading
  useEffect(() => {
    if (!isApiFiltering && hasNextPage && !isLoadingMore && hasFilters) {
      const displayedRows = filteredData.length;
      const minRequiredRows = Math.min(limit, 10); // Don't be too aggressive

      // Only fetch more if we have very few displayed rows
      if (displayedRows < minRequiredRows) {
        console.log("Fetching more for client filter:", {
          displayedRows,
          minRequiredRows,
        });
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
    isApiFiltering,
  ]);

  // FIXED: Handle API filtering with proper state reset
  const handleApiFilter = useCallback(() => {
    if (isApiFiltering) {
      console.log("Triggering API filter");
      setIsFilterChanged(true);
      setPage(0);
      setHasNextPage(true);
      setData([]);
      isFetchingRef.current = false;
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

  const handleExportExcel = () => {
    const exportData = table.getFilteredRowModel().rows.map(row => row.original);

    const excelData = exportData.map((row, index) => {
      const rowData = {};

      columnsConfig.forEach((col) => {
        if (col.id === "select" || col.type?.includes("checkbox") || col.type?.includes("avatar") || col.type?.includes("image") || col.id === "actions") {
          return;
        }

        const header = col.header || col.accessorKey || col.id;

        if (col.type?.includes("serialNo") || col.accessorKey === "serialNo") {
          rowData[header] = index + 1;
          return;
        }

        if (col.accessorKey) {
          const keys = col.accessorKey.split(".");
          let value = row;
          for (const key of keys) {
            if (value === null || value === undefined) break;
            value = value[key];
          }

          let valueStr = "";
          if (value !== null && value !== undefined) {
            if (col.type?.includes("date")) {
              valueStr = formatDateForDisplay(value);
            } else if (col.type?.includes("array") || Array.isArray(value)) {
              valueStr = Array.isArray(value) ? value.join(", ") : value;
            } else if (col.type?.includes("nestedObject") || typeof value === "object") {
              if (value.name) {
                valueStr = value.name;
              } else if (value.label) {
                valueStr = value.label;
              } else {
                const objVals = [];
                for (const key in value) {
                  if (typeof value[key] === "string" || typeof value[key] === "number") {
                    objVals.push(value[key]);
                  }
                }
                valueStr = objVals.join(", ");
              }
            } else {
              valueStr = value;
            }
          }
          rowData[header] = valueStr;
        }
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, printTitle || resource || "Sheet1");
    XLSX.writeFile(workbook, `${printTitle ? printTitle : resource}.xlsx`);
  };

  // Table columns
  const columns = useMemo(() => {
    return useTableColumns(columnsConfig);
  }, [columnsConfig]);

  // CRUD operations
  const addData = useAddItem();
  const updateData = useUpdateItem();
  const deleteData = useDeleteItem();


  // Highlight highest logic
  const highlightedRowIds = useMemo(() => {
    const tableData = isApiFiltering ? data : filteredData;
    if (!highlightHighest || !tableData.length) return new Set();

    const { accessorKey, type, totalKey, filterKey, filterValue, groupBy } = highlightHighest;
    const allIds = new Set();

    // Helper to get group key
    const getGroupKey = (item) => {
      if (!groupBy) return "single-group";
      if (typeof groupBy === "function") return groupBy(item);

      // Support nested keys like "attendanceRecords.0.className"
      const keys = groupBy.split(".");
      let val = item;
      for (const key of keys) {
        if (val === null || val === undefined) break;
        val = val[key];
      }
      return val || "no-group";
    };

    // Calculate max value for each group
    const groupStats = {}; // { groupKey: { maxVal, ids } }

    tableData.forEach((item) => {
      let val = -1;
      if (type === "percentage") {
        const records = item[totalKey] || [];
        const total = records.length;
        const present = records.filter(r => r[filterKey] === filterValue).length;
        val = total > 0 ? (present / total) * 100 : 0;
      } else {
        val = parseFloat(item[accessorKey]);
        if (isNaN(val)) val = -1;
      }

      const groupKey = getGroupKey(item);
      if (!groupStats[groupKey]) {
        groupStats[groupKey] = { maxVal: -Infinity, ids: new Set() };
      }

      const stats = groupStats[groupKey];
      if (val > stats.maxVal) {
        stats.maxVal = val;
        stats.ids = new Set([item._id]);
      } else if (val === stats.maxVal && val !== -Infinity && val !== -1) {
        stats.ids.add(item._id);
      }
    });

    // Collect all highlighted IDs from all groups
    Object.values(groupStats).forEach(stats => {
      if (stats.maxVal > 0) {
        stats.ids.forEach(id => allIds.add(id));
      }
    });

    return allIds;
  }, [data, filteredData, isApiFiltering, highlightHighest]);

  const tableDataForTable = useMemo(() => {
    let baseData = isApiFiltering ? data : filteredData;
    if (toppersOnly && highlightedRowIds.size > 0) {
      baseData = baseData.filter((item) => highlightedRowIds.has(item._id));

      // Sort by class name if highlightHighest.groupBy is available
      if (highlightHighest?.groupBy) {
        baseData = [...baseData].sort((a, b) => {
          const getName = (item) => {
            const keys = highlightHighest.groupBy.split(".");
            let val = item;
            for (const key of keys) {
              if (val === null || val === undefined) break;
              val = val[key];
            }
            return val;
          };
          return sortClasses(a, b, getName);
        });
      }
    } else if (baseData.length > 0) {
      // Default sort by _id descending so newest records appear first
      baseData = [...baseData].sort((a, b) => {
        return String(b._id).localeCompare(String(a._id), undefined, { numeric: true, sensitivity: 'base' });
      });
    }
    return baseData;
  }, [isApiFiltering, data, filteredData, toppersOnly, highlightedRowIds, highlightHighest]);

  // Initialize table
  const table = useReactTable({
    data: tableDataForTable,
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

  // Helper to remove UI components from API payload
  const getApiProps = (props) => {
    if (!props) return {};
    const { customActions, customToolbar, ...apiProps } = props;
    return apiProps;
  };

  // FIXED: Form submission handler with proper state management
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([_, value]) => Boolean(value))
      );

      await addData.mutateAsync({ ...filteredValues, ...getApiProps(additionalProps) });
      table.resetRowSelection();

      // FIXED: Proper data refresh
      setIsFilterChanged(true);
      setPage(0);
      setData([]);
      await fetchItemsQuery.refetch();
      router.refresh();
      toast.success(createSuccessMessage);
      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Edit handler with proper state management
  const handleEdit = async (values) => {
    try {
      setLoading(true);
      await updateData.mutateAsync({
        data: {
          ids: selectedData?.map((item) => item?._id),
          ...values,
          ...getApiProps(additionalProps),
        },
      });
      table.resetRowSelection();

      // FIXED: Proper data refresh
      setIsFilterChanged(true);
      setPage(0);
      setData([]);
      await fetchItemsQuery.refetch();
      router.refresh();

      toast.success(editSuccessMessage);
      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Delete handler with proper state management
  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteData.mutateAsync({
        data: {
          ids: selectedData?.map((item) => item?._id),
          ...getApiProps(additionalProps),
        },
      });
      table.resetRowSelection();

      // FIXED: Proper data refresh
      setIsFilterChanged(true);
      setPage(0);
      setData([]);
      await fetchItemsQuery.refetch();
      router.refresh();

      toast.success(deleteSuccessMessage);
      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Display current filter mode (only in development)
  const filterModeDisplay = useMemo(() => {
    return isApiFiltering ? "API Filtering" : "Client Filtering";
  }, [isApiFiltering]);

  // FIXED: Better data count display
  const displayedItemsCount = isApiFiltering
    ? data.length
    : filteredData.length;
  const totalItemsText =
    isApiFiltering && totalPages > 0 ? ` of ${dataCount} total` : "";
  // Shared action buttons (used in both layouts)
  const actionButtons = (
    <>
      {additionalProps?.customActions && (
        <div>{additionalProps.customActions}</div>
      )}
      {!!selectedData?.length && (!readOnly || enableDelete) && (
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
            formFields={
              selectedData.length > 1 && multiEditFormFields?.length > 0
                ? multiEditFormFields
                : editFormFields?.length > 0
                  ? editFormFields
                  : formFields
            }
            onSubmit={handleEdit}
            loading={loading}
            title={editFormTitle}
            apiKey={apiKey}
          />
        )}
      {!readOnly && enableCreate && (
        <PopupForm
          formFields={formFields}
          onSubmit={handleSubmit}
          loading={loading}
          title={createFormTitle}
          apiKey={apiKey}
        />
      )}
      {table.getRowModel().rows?.length > 0 && (
        <>
          <Button onClick={handleExportExcel} className="print:hidden bg-[#1D6F42] text-white hover:bg-[#1D6F42]/90">
            Excel
          </Button>
          {isMobile ? (
            <Button onClick={handleDownloadPDF} className="print:hidden bg-black text-white hover:bg-gray-800">
              Print
            </Button>
          ) : (
            <Button onClick={handlePrint} className="btn-print">Print</Button>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* ── Mobile Split Layout ── */}
      {isMobile && mobileSplitLayout ? (
        <div className="space-y-2">
          {/* Row 1: Full-width search bar */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={mobileSearchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => handleSetGlobalFilter(e.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>

          {/* Row 2: Column management + action buttons */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center">
              <ColumnCustomization table={table} columnsConfig={columnsConfig} />
              {additionalProps?.customToolbar && (
                <div className="ml-1">{additionalProps.customToolbar}</div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {actionButtons}
            </div>
          </div>

          {!!selectedData.length && (
            <div className="text-muted-foreground text-sm">
              {selectedData?.length} selected
            </div>
          )}
        </div>
      ) : (
        /* ── Default Layout (desktop + non-split mobile) ── */
        <>
          <div className="flex items-center justify-between">
            <div className="mr-auto space-x-2 flex items-center">
              {additionalProps?.customToolbar && !isMobile && (
                <div className="mr-2">{additionalProps.customToolbar}</div>
              )}
              <ColumnCustomization table={table} columnsConfig={columnsConfig} />

              <PopupFilter
                filterConfig={isMobile || dateRangeInPopup ? filterConfig : filterConfig.filter(f => f.inputType !== "dateRange")}
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

              {enableMonthYearFilter && (
                <div className="flex items-center space-x-2">
                  <Select value={filterYear?.toString()} onValueChange={(v) => {
                    setFilterYear(parseInt(v));
                    if (isApiFiltering) debouncedApiFilterUpdate();
                  }}>
                    <SelectTrigger className="w-[80px] h-8 text-xs">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterMonth?.toString()} onValueChange={(v) => {
                    setFilterMonth(parseInt(v));
                    if (isApiFiltering) debouncedApiFilterUpdate();
                  }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Trailing toolbar slot — renders after month/year selects */}
              {trailingToolbar && (
                <div className="flex items-center">
                  {isValidElement(trailingToolbar)
                    ? cloneElement(trailingToolbar, {
                      filterMonth,
                      filterYear,
                      apiKey,
                      toppersOnly,
                      setToppersOnly,
                      tableData: isApiFiltering ? data : filteredData,
                    })
                    : trailingToolbar}
                </div>
              )}

              {/* Desktop Date Range Filter */}
              {!isMobile && !dateRangeInPopup && filterConfig.find(f => f.inputType === "dateRange") && (
                <DateRangeFilter
                  value={(() => {
                    const filterState = filters[filterConfig.find(f => f.inputType === "dateRange").id];
                    return filterState?.value || filterState || {};
                  })()}
                  onChange={(val) => {
                    const config = filterConfig.find(f => f.inputType === "dateRange");
                    if (val.startDate || val.endDate) {
                      handleSetFilter(config.id, val, "dateRange", null);
                    } else {
                      handleRemoveFilter(config.id);
                    }
                  }}
                />
              )}

              {enableSearch && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID or Name..."
                    value={globalFilter ?? ""}
                    onChange={(e) => handleSetGlobalFilter(e.target.value)}
                    className="h-9 w-[180px] lg:w-[250px] pl-9"
                  />
                </div>
              )}
            </div>
            <div className="space-x-2 flex items-center">
              {actionButtons}
            </div>
          </div>

          {!!selectedData.length && (
            <div className="text-muted-foreground">
              {selectedData?.length} selected
            </div>
          )}
        </>
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
          subTitle={(() => {
            const dateFilterConfig = filterConfig.find(f => f.inputType === "dateRange");
            if (!dateFilterConfig) return null;
            const filterState = filters[dateFilterConfig.id];

            // Extract the actual value from the filter state
            const filterVal = filterState?.value || filterState;

            // Check if filter exists and has values
            if (filterVal) {
              // Handle object format {startDate, endDate}
              if (typeof filterVal === 'object' && !Array.isArray(filterVal)) {
                if (filterVal.startDate || filterVal.endDate) {
                  const start = filterVal.startDate ? formatDateForDisplay(filterVal.startDate) : "";
                  const end = filterVal.endDate ? formatDateForDisplay(filterVal.endDate) : "";

                  if (start && end) return `Date: ${start} to ${end}`;
                  if (start) return `Date: From ${start}`;
                  if (end) return `Date: Up to ${end}`;
                }
              }
              // Handle string format "startDate,endDate" (if used essentially)
              else if (typeof filterVal === 'string' && filterVal.includes(',')) {
                const [start, end] = filterVal.split(',');
                return `Date: ${formatDateForDisplay(start)} to ${formatDateForDisplay(end)}`;
              }
            }
            return null;
          })()}
          displayOnScreen={showLogo}
          isFestival={isFestival}
        />
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={getCellStyles(header.column.columnDef.meta)}
                    className={`${header.id === "select" ? "print:hidden" : ""} ${header.column.columnDef.meta?.className || ""
                      }`}
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
          <TableBody className={printInReverse ? "print:hidden" : ""}>
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
                  className={cn(
                    "break-inside-avoid",
                    highlightedRowIds.has(row.original._id) && highlightHighest?.className,
                    rowLink && "cursor-pointer hover:bg-muted/60 active:bg-muted transition-colors"
                  )}
                  onClick={rowLink ? (e) => {
                    // Don't navigate if clicking a checkbox or interactive element
                    if (e.target.closest('input, button, a, [role="checkbox"]')) return;
                    const id = row.original[rowLinkKey];
                    const params = rowLinkSearchParams ? `?${rowLinkSearchParams}` : "";
                    router.push(`${rowLink}/${id}${params}`);
                  } : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      style={getCellStyles(cell.column.columnDef.meta)}
                      key={cell.id}
                      className={`${cell.column.id === "select" ? "print:hidden" : ""} ${cell.column.columnDef.meta?.className || ""
                        }`}
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
          {printInReverse && table.getRowModel().rows?.length > 0 && (
            <TableBody className="hidden print:table-row-group">
              {[...table.getRowModel().rows].reverse().map((row) => (
                <TableRow
                  key={`print-${row.id}`}
                  className="break-inside-avoid"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      style={getCellStyles(cell.column.columnDef.meta)}
                      key={`print-${cell.id}`}
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
          )}
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
          Showing {displayedItemsCount} items{totalItemsText}
          {process.env.NODE_ENV === "development" && (
            <span className="ml-2 px-2 py-1 bg-muted rounded-full text-xs">
              {filterModeDisplay} | Page: {page} | HasNext:{" "}
              {hasNextPage.toString()}
            </span>
          )}
        </div>
      </div>
    </div >
  );
};

export default DataTableComponent;
