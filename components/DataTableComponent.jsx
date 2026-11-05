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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState, useEffect, useCallback, isValidElement, cloneElement } from "react";
import useTableColumns from "@/hooks/use-table-columns";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useDataFilter from "@/hooks/use-data-filter";
import dynamic from "next/dynamic";
import { Loader, Search, X, Trophy, FileSpreadsheet, Printer, CheckCircle2, Star, UserCheck, UserX, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { capitalize, debounce } from "lodash";
import { Skeleton } from "./ui/skeleton";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyPrintStyles, removePrintStyles, formatDateForDisplay, formatDateMonthYear, formatTime12Hour, cn, sortClasses } from "@/lib/utils";
import PrintHeader from "@/components/PrintHeader";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import ColumnCustomization from "./ColumnCustomization";
import PopupFilter from "./PopupFilter";
import ConfirmationPopup from "./ConfirmationPopup";
import PopupForm from "./PopupForm";
import StarOfTheMonthModal from "./StarOfTheMonthModal";

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
  filterDescription = "",
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
  desktopSearchPlaceholder = "Search by ID or Name...",
  rowLink = null,
  rowLinkKey = "_id",
  rowLinkSearchParams = "",
  enableDefaultSort = true,
  filterMaxWidthClass,
  defaultSorting = DEFAULT_ARRAY,
  createButtonClass = "",
  createButtonText = "",
  onSuccess = null,
  onDataFetched = null,
  formClassName = "",
  onCellClick = null,
  enableClickToEdit = false,
  clickToEditExcludeColumns = ["_id", "select", "serialNo", "actions"],
  refetchInterval = 0,
  capitalizeInputs = false,
  customTopRightButtons = null,
  searchBarClassName = "",
  extraSearchFields = DEFAULT_ARRAY,
  activeRole = "",
  inlineFiltersOnDesktop = false,
}) => {
  const isApiFiltering = filterType === "api";
  const [sorting, setSorting] = useState(defaultSorting);
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
  const [filterMonth, setFilterMonth] = useState(() => enableMonthYearFilter ? new Date().getMonth() + 1 : null);
  const [filterYear, setFilterYear] = useState(() => enableMonthYearFilter ? new Date().getFullYear() : null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toppersOnly, setToppersOnly] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ title: "", message: "" });
  const lastSuccessShowRef = useRef(0);

  const triggerSuccessPopup = useCallback((title, message) => {
    const now = Date.now();
    if (now - lastSuccessShowRef.current < 2000) {
      console.log("[SuccessPopup] Ignored duplicate trigger within 2 seconds");
      return;
    }
    lastSuccessShowRef.current = now;
    setSuccessConfig({ title, message });
    setShowSuccess(true);
  }, []);

  // State for cell detail drill-down
  const [detailView, setDetailView] = useState(null); // { student, col, title }
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailedRecords, setDetailedRecords] = useState([]);
  const [subjectDrilldown, setSubjectDrilldown] = useState(null); // { subjectName, filterType, records, className }

  const handleToggleToppers = useCallback((targetVal) => {
    setToppersOnly((prev) => {
      const newVal = typeof targetVal === "boolean" ? targetVal : !prev;
      if (isApiFiltering) {
        setIsFilterChanged(true);
        setPage(0);
        setHasNextPage(true);
        setData([]);
      }
      return newVal;
    });
  }, [isApiFiltering]);

  // Sync state to window as a fallback for dynamic toolbar components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__SET_TOPPERS__ = handleToggleToppers;
      window.__TOPPERS_ONLY__ = toppersOnly;
    }
  }, [handleToggleToppers, toppersOnly]);

  const searchInputRef = useRef(null);

  const popupRef = useRef(null);
  const detailPrintRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `Detailed_Records.jpeg`);

  const tableRef = useRef(null);
  const isFetchingRef = useRef(false);
  const loaderRef = useRef(null);
  const router = useRouter();
  const mutationLockRef = useRef(false);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const isMobile = useIsMobile();
  const isDateRangeInPopupMobile = dateRangeInPopup === true || dateRangeInPopup === "mobileOnly";
  const isDateRangeInPopupDesktop = dateRangeInPopup === true;

  // Sync activeApiFilters with prop
  useEffect(() => {
    setActiveApiFilters(apiFilters);
    // Reset state when filters (like refreshKey) change to ensure a clean reload
    setPage(0);
    setData([]);
    setIsFilterChanged(true);
  }, [apiFilters]);

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

  const searchableFields = useMemo(() => {
    const fromColumns = columnsConfig
      .filter(col => col.accessorKey && col.accessorKey !== "serialNo" && col.id !== "select")
      .map(col => col.accessorKey);
    return [...new Set([...fromColumns, ...extraSearchFields])];
  }, [columnsConfig, extraSearchFields]);

  const {
    filteredData,
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    globalFilter,
    setGlobalFilter,
    hasFilters,
  } = useDataFilter(data, initialFilters, searchableFields);

  const prevFiltersRef = useRef(JSON.stringify(filters));

  const [lastFilterHash, setLastFilterHash] = useState(() => JSON.stringify({
    filters: activeApiFilters,
    globalFilter,
    isApiFiltering: filterType === "api",
  }));
  const [isFilterChanged, setIsFilterChanged] = useState(false);

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    apiEndpoint ? apiEndpoint : resource,
    apiKey
  );

  // Determine if we should use API filtering (defined at component top level)
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
      ...(globalFilter ? (resource === "studentAttendances" ? { name: globalFilter } : { global: globalFilter }) : {}),
      ...(toppersOnly ? { toppersOnly: true } : {}),
    };
  }, [isApiFiltering, activeApiFilters, filters, globalFilter, hasFilters, enableMonthYearFilter, filterMonth, filterYear, toppersOnly]);

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
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
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

      // FIXED: Better logic for when to reset vs append/update data
      const isRefetch = page === 0 && data.length > 0 && !isFilterChanged;
      const shouldResetData =
        isFilterChanged ||
        (page === 0 && data.length === 0);

      if (shouldResetData) {
        setData(newItems);
        setIsFilterChanged(false);
      } else {
        // FIXED: Update existing items instead of just filtering them out
        setData((prev) => {
          const updatedData = [...prev];
          const newItemsToAppend = [];

          newItems.forEach(newItem => {
            const index = updatedData.findIndex(item => item._id === newItem._id);
            if (index !== -1) {
              // Update existing item
              updatedData[index] = { ...updatedData[index], ...newItem };
            } else {
              // Mark as new item to append
              newItemsToAppend.push(newItem);
            }
          });

          return isRefetch ? newItems : [...updatedData, ...newItemsToAppend];
        });
      }

      setHasNextPage(page < (pagination?.totalPages || 1) - 1);
      setIsFetchingNextPage(false);
      isFetchingRef.current = false;

      // Notify parent of fetched data (contains summary, pagination, etc.)
      if (onDataFetched) {
        onDataFetched(fetchItemsQuery.data);
      }
    }
  }, [fetchItemsQuery.data, page, resource, isFilterChanged, data.length]);



  // Loading states
  const isInitialLoading =
    fetchItemsQuery.isLoading && page === 0 && data.length === 0;

  const isLoadingMore =
    isFetchingNextPage || (fetchItemsQuery.isLoading && page > 0);

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isLoadingMore || isFetchingRef.current) {
      return;
    }

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
      const minRequiredRows = Math.min(limit, 10);

      if (displayedRows < minRequiredRows) {
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

  const generatedPrintTitle = useMemo(() => {
    if (toppersOnly && enableMonthYearFilter && filterMonth && filterYear) {
      return `Attendance Toppers - ${new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' })} ${filterYear}`;
    }

    let baseTitle = printTitle || resource;
    let activeFilterLabels = [];

    if (filters && filterConfig) {
      filterConfig.forEach(config => {
        const filterState = filters[config.id];
        const filterVal = filterState?.value !== undefined ? filterState.value : filterState;

        if (filterVal !== undefined && filterVal !== null && filterVal !== "") {
          if (config.inputType === "dateRange") return; // Date range is in subTitle

          if (config.options) {
            const opt = config.options.find(o => String(o.value) === String(filterVal));
            if (opt) {
              activeFilterLabels.push(opt.label);
            }
          } else {
            activeFilterLabels.push(String(filterVal));
          }
        }
      });
    }

    let fullTitle = baseTitle;
    if (activeFilterLabels.length > 0) {
      fullTitle += ` - ${activeFilterLabels.join(" - ")}`;
    }

    return fullTitle;
  }, [printTitle, resource, filters, filterConfig, toppersOnly, enableMonthYearFilter, filterMonth, filterYear]);

  const handlePrint = useReactToPrint({
    contentRef: tableRef,
    documentTitle: generatedPrintTitle,
    suppressErrors: true,
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
      filename: `${generatedPrintTitle}.pdf`,
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

  const handleExportExcel = async () => {
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
            } else if (col.type?.includes("time") || col.type?.includes("12Hours") || col.type?.includes("time12")) {
              valueStr = formatTime12Hour(value);
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

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, printTitle || resource || "Sheet1");
    XLSX.writeFile(workbook, `${generatedPrintTitle}.xlsx`);
  };

  // Table columns
  const handleCellClick = useCallback(async (row, col) => {
    // If an external click handler is provided, call it
    if (onCellClick) {
      onCellClick(row, col);
      return;
    }

    const arrayKey = col.valueKey || col.totalKey;

    // For "allRecords" viewType (Total Class), show ALL records with no filter
    let records;
    if (col.viewType === "allRecords") {
      records = row[arrayKey] || [];
    } else if (col.viewType === "subjectSummary") {
      const rawStats = row[arrayKey] || row.subjectStats || [];
      records = Array.isArray(rawStats)
        ? rawStats.flatMap((sub) => {
            const teachers = (Array.isArray(sub.teacherNames) && sub.teacherNames.length > 1)
              ? sub.teacherNames
              : (sub.teacherName && sub.teacherName.includes(",") ? sub.teacherName.split(",").map((t) => t.trim()).filter(Boolean) : null);
            if (teachers && teachers.length > 1 && Array.isArray(sub.records) && sub.records.length > 0) {
              return teachers.map((t) => {
                const tRecs = sub.records.filter((r) => r.teacherName?.trim() === t);
                const tTotal = tRecs.length;
                const tPresent = tRecs.filter((r) => r.present).length;
                const tAbsent = tRecs.filter((r) => !r.present).length;
                const tPerc = tTotal > 0 ? `${((tPresent / tTotal) * 100).toFixed(2)}%` : "0.00%";
                return {
                  ...sub,
                  teacherName: t,
                  teacherNames: [t],
                  totalClass: tTotal,
                  present: tPresent,
                  absent: tAbsent,
                  percentage: tPerc,
                  records: tRecs,
                };
              });
            }
            return [sub];
          })
        : [];
    } else {
      records = row[arrayKey]?.filter(
        (item) => !col.filterKey || item?.[col.filterKey || col.accessorKey] === col.filterValue
      ) || [];
    }

    // Sort detail records by Date and Period Number ascending order
    if (Array.isArray(records) && col.viewType !== "subjectSummary" && col.header !== "Absentees") {
      records = records.slice().sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (Number(a.periodNumber) || 0) - (Number(b.periodNumber) || 0);
      });
    }

    const extractHeaderText = (hdr) => {
      if (!hdr) return "";
      if (typeof hdr === "string") return hdr;
      if (typeof hdr === "number") return String(hdr);
      if (Array.isArray(hdr)) return hdr.map(extractHeaderText).join(" ").replace(/\s+/g, " ").trim();
      if (isValidElement(hdr)) {
        if (hdr.type === "br") return " ";
        return extractHeaderText(hdr.props?.children);
      }
      return "";
    };

    const headerText = col.popupHeader || col.headerText || extractHeaderText(col.header) || col.accessorKey;

    setDetailView({
      student: row,
      col: col,
      title: col.header === "Absentees"
        ? `Absent Students for ${formatDateForDisplay(row.date)}`
        : col.viewType === "subjectSummary"
        ? `Subject-wise Attendance for ${row.name || "Class"}`
        : `${headerText} for ${row.name || row.teamName || "Selected Item"}`,
      colHeader: col.viewType === "subjectSummary" ? "Subject-wise Attendance" : headerText,
      viewType: col.viewType || (col.header === "Absentees" ? "studentList" : "recordList")
    });
    setDetailedRecords(records);
  }, [onCellClick]);

  const columns = useMemo(() => {
    return useTableColumns(columnsConfig, handleCellClick);
  }, [columnsConfig, handleCellClick]);

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
      if (item?.className) return item.className;
      if (!groupBy) return "single-group";
      if (typeof groupBy === "function") return groupBy(item);

      // Support nested keys like "attendanceRecords.0.className"
      const keys = groupBy.split(".");
      let val = item;
      for (const key of keys) {
        if (val === null || val === undefined) break;
        val = val[key];
      }
      return val || item?.className || "no-group";
    };

    // Calculate max value for each group
    const groupStats = {}; // { groupKey: { maxVal, ids } }

    tableData.forEach((item) => {
      // Strictly exclude dropped out students from toppers
      if (item.status === "Dropped Out" || item.studentSpecificField?.status === "Dropped Out") {
        return;
      }

      let val = -1;
      if (item.percentage !== undefined && item.percentage !== null) {
        val = Number(item.percentage);
      } else if (type === "percentage") {
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
      baseData = baseData.filter((item) =>
        highlightedRowIds.has(item._id) &&
        item.status !== "Dropped Out" &&
        item.studentSpecificField?.status !== "Dropped Out"
      );

      // Sort by class name if highlightHighest.groupBy is available
      if (highlightHighest?.groupBy) {
        baseData = [...baseData].sort((a, b) => {
          const getName = (item) => {
            if (item?.className) return item.className;
            const keys = highlightHighest.groupBy.split(".");
            let val = item;
            for (const key of keys) {
              if (val === null || val === undefined) break;
              val = val[key];
            }
            return val || item?.className || "";
          };
          const classCompare = sortClasses(a, b, getName);
          if (classCompare !== 0) return classCompare;
          // Sort by student ID within class
          return String(a._id).localeCompare(String(b._id), undefined, { numeric: true });
        });
      }
    } else if (baseData.length > 0 && enableDefaultSort && sorting.length === 0) {
      if (resource === "studentAttendances" && highlightHighest?.groupBy) {
        // Sort by class then student ID ascending
        baseData = [...baseData].sort((a, b) => {
          const getName = (item) => {
            if (item?.className) return item.className;
            const keys = highlightHighest.groupBy.split(".");
            let val = item;
            for (const key of keys) {
              if (val === null || val === undefined) break;
              val = val[key];
            }
            return val || item?.className || "";
          };
          const classCompare = sortClasses(a, b, getName);
          if (classCompare !== 0) return classCompare;
          return String(a._id).localeCompare(String(b._id), undefined, { numeric: true });
        });
      } else if (resource === "classAttendances") {
        baseData = [...baseData].sort((a, b) => {
          const classCompare = sortClasses(a, b, (item) => item?.originalName || item?.name || "");
          if (classCompare !== 0) return classCompare;
          return String(a?.name || "").localeCompare(String(b?.name || ""));
        });
      } else if (resource === "users") {
        // Default sort by ID descending so newest/highest IDs appear first
        baseData = [...baseData].sort((a, b) => {
          return String(b._id).localeCompare(String(a._id), undefined, { numeric: true, sensitivity: 'base' });
        });
      } else if (resource === "teams") {
        if (apiFilters?.sortByPoints === true || apiFilters?.sortByPoints === "true") {
          baseData = [...baseData].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        } else {
          baseData = [...baseData].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (dateB !== dateA) return dateB - dateA;
            return String(b._id).localeCompare(String(a._id), undefined, { numeric: true, sensitivity: 'base' });
          });
        }
      } else if (resource === "participants") {
        if (apiFilters?.sortByPoints === true || apiFilters?.sortByPoints === "true") {
          baseData = [...baseData].sort((a, b) => {
            const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
            if (pointsDiff !== 0) return pointsDiff;
            return (a.chestNumber || 0) - (b.chestNumber || 0);
          });
        } else {
          // Sort participants by ID ascending
          baseData = [...baseData].sort((a, b) =>
            String(a._id).localeCompare(String(b._id), undefined, { numeric: true, sensitivity: 'base' })
          );
        }
      } else if (resource === "schedules") {
        // Sort schedules by date and time descending
        baseData = [...baseData].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;

          const timeA = a.startTime || "";
          const timeB = b.startTime || "";
          if (timeB !== timeA) return timeB.localeCompare(timeA);

          const stageA = a.stageNumber || 0;
          const stageB = b.stageNumber || 0;
          return stageA - stageB;
        });
      } else {
        // Default sort by createdAt descending so newest records appear first
        baseData = [...baseData].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return String(b._id).localeCompare(String(a._id), undefined, { numeric: true, sensitivity: 'base' });
        });
      }
    }
    return baseData;
  }, [isApiFiltering, data, filteredData, toppersOnly, highlightedRowIds, highlightHighest, sorting]);

  const groupedTopperRows = useMemo(() => {
    if (!toppersOnly) return [];

    const groups = {};
    tableDataForTable.forEach((row) => {
      const getName = (item) => {
        if (item?.className) return item.className;
        if (!highlightHighest?.groupBy) return "Other";
        const keys = highlightHighest.groupBy.split(".");
        let val = item;
        for (const key of keys) {
          if (val === null || val === undefined) break;
          val = val[key];
        }
        return val || item?.className || "Other";
      };

      const className = getName(row);
      // Strictly exclude dropped out students from toppers
      if (row.status === "Dropped Out" || row.studentSpecificField?.status === "Dropped Out") {
        return;
      }
      if (!groups[className]) groups[className] = { students: [], percentage: 0 };

      // Calculate percentage the same way highlightHighest does
      let percentage = 0;
      if (row.percentage !== undefined && row.percentage !== null) {
        percentage = Number(row.percentage);
      } else if (highlightHighest?.type === "percentage") {
        const records = row[highlightHighest.totalKey] || [];
        const total = records.length;
        const present = records.filter(r => r[highlightHighest.filterKey] === highlightHighest.filterValue).length;
        percentage = total > 0 ? (present / total) * 100 : 0;
      }

      groups[className].students.push({ id: row._id, name: row.name });
      groups[className].percentage = percentage;
    });

    return Object.entries(groups)
      .sort((a, b) => sortClasses(a[0], b[0], (x) => x))
      .map(([className, group]) => ({
        className,
        students: group.students.sort((a, b) =>
          String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
        ),
        percentage: group.percentage,
      }));
  }, [toppersOnly, tableDataForTable, highlightHighest]);

  // Initialize table
  const table = useReactTable({
    data: tableDataForTable,
    columns,
    sortingFns: {
      scheduleDate: (rowA, rowB) => {
        const a = rowA.original;
        const b = rowB.original;

        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;

        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        if (timeA !== timeB) return timeA.localeCompare(timeB);

        const stageA = a.stageNumber || 0;
        const stageB = b.stageNumber || 0;
        return stageA - stageB;
      }
    },
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
      globalFilter: undefined, // Handled externally by useDataFilter or API
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
    if (mutationLockRef.current) return false;
    try {
      mutationLockRef.current = true;
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
      if (onSuccess) onSuccess();

      // Close the create form immediately to prevent animation overlapping
      setIsCreateOpen(false);
      setTimeout(() => {
        triggerSuccessPopup("Success!", createSuccessMessage);
      }, 300);

      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
      mutationLockRef.current = false;
    }
  };

  // FIXED: Edit handler with proper state management
  const handleEdit = async (values) => {
    if (mutationLockRef.current) return false;
    try {
      mutationLockRef.current = true;
      setLoading(true);
      const payload = {
        data: {
          ids: selectedData?.map((item) => item?._id),
          ...values,
          ...getApiProps(additionalProps),
        },
      };

      await updateData.mutateAsync(payload);

      table.resetRowSelection();

      // FIXED: Force a deep refresh by clearing local state and refetching
      setIsFilterChanged(true);
      setPage(0);
      setData([]);

      await fetchItemsQuery.refetch();
      if (onSuccess) onSuccess();

      // Close the edit form immediately to prevent animation overlapping
      setIsEditOpen(false);
      setTimeout(() => {
        triggerSuccessPopup("Success!", editSuccessMessage);
      }, 300);

      return true;
    } catch (error) {
      console.error("Mutation Error:", error);
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
      mutationLockRef.current = false;
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
      if (onSuccess) onSuccess();

      // Delay success popup slightly so the delete confirmation dialog closes completely first
      setTimeout(() => {
        triggerSuccessPopup("Deleted!", deleteSuccessMessage);
      }, 300);

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
      {(selectedData.length === 1 ||
        (selectedData.length > 1 && multiEdit)) &&
        !readOnly && (
          <PopupForm
            data={selectedData[0]}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
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
            triggerVariant="outline"
            className={formClassName}
            capitalizeInputs={capitalizeInputs}
          />
        )}
      {!!selectedData?.length && (!readOnly || enableDelete) && (
        <ConfirmationPopup
          onClick={handleDelete}
          action="delete"
          loading={loading}
          title={deleteFormTitle}
          triggerClass="bg-red-600 hover:bg-red-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
        />
      )}
      {!readOnly && enableCreate && (
        <PopupForm
          formFields={formFields}
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={handleSubmit}
          loading={loading}
          title={createFormTitle}
          apiKey={apiKey}
          triggerClass="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
          triggerText=""
          className={formClassName}
          capitalizeInputs={capitalizeInputs}
        />
      )}
      {table.getRowModel().rows?.length > 0 && (
        <>
          {customTopRightButtons}
          <Button onClick={handleExportExcel} className="print:hidden bg-green-600 text-white hover:bg-green-700 h-9 px-3 gap-2 shrink-0">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden md:inline">Excel</span>
          </Button>
          <Button onClick={handlePrint} className="print:hidden btn-print h-9 px-3 gap-2 shrink-0">
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">Print</span>
          </Button>
        </>
      )}
    </>
  );

  return (
    <div className={cn("space-y-4", isMobile && "space-y-2")}>
      {/* ── Mobile Split Layout ── */}
      {isMobile ? (
        <div className="space-y-2">
          {/* Row 1: Custom Toolbar (Search/Scan) or Default Search */}
          <div className="w-full">
            {additionalProps?.customToolbar ? (
              <div className="w-full">{additionalProps.customToolbar}</div>
            ) : (
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={mobileSearchPlaceholder}
                  value={globalFilter ?? ""}
                  onChange={(e) => handleSetGlobalFilter(e.target.value)}
                  className="h-10 w-full pl-9 bg-background"
                />
              </div>
            )}
          </div>

          {/* Row 2: Icons (Columns, Filter, Trophy, Excel, Print) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar bg-card/50 p-1.5 rounded-lg">
            <ColumnCustomization table={table} columnsConfig={columnsConfig} />

            <PopupFilter
              filterConfig={isDateRangeInPopupMobile ? filterConfig : filterConfig.filter(f => f.inputType !== "dateRange")}
              filters={filters}
              setFilter={handleSetFilter}
              removeFilter={handleRemoveFilter}
              clearFilters={handleClearFilters}
              globalFilter={globalFilter}
              setGlobalFilter={handleSetGlobalFilter}
              hasFilters={hasFilters || Object.keys(filters).length > 0}
              title={filterTitle || capitalize(resource)}
              description={filterDescription}
              filterType={filterType}
              maxWidthClass={filterMaxWidthClass}
              inlineOnDesktop={additionalProps?.inlineFiltersOnDesktop || inlineFiltersOnDesktop}
            />

            {resource === "performance" && activeRole === "College Admin" && (
              <StarOfTheMonthModal classes={filterConfig?.find(f => f.id === "classId")?.options || []} />
            )}

            {/* Trophy Icon Toggle for Toppers */}
            {resource === "studentAttendances" && enableMonthYearFilter && (
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 transition-all duration-200",
                  toppersOnly
                    ? "bg-green-50 border-green-300 shadow-sm"
                    : "hover:bg-neutral-100"
                )}
                onClick={() => {
                  handleToggleToppers();
                }}
                title="Green Listed Students (Toppers)"
              >
                <Trophy
                  className={cn(
                    "h-4 w-4 transition-colors",
                    toppersOnly ? "text-green-500" : "text-black"
                  )}
                  fill={toppersOnly ? "currentColor" : "none"}
                  strokeWidth={2.5}
                />
              </Button>
            )}

            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {(selectedData.length === 1 || (selectedData.length > 1 && multiEdit)) && !readOnly && (
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
                  triggerClass="h-9 w-9 p-0 flex items-center justify-center shrink-0"
                  triggerVariant="outline"
                  className={formClassName}
                  capitalizeInputs={capitalizeInputs}
                />
              )}
              {!!selectedData?.length && (!readOnly || enableDelete) && (
                <ConfirmationPopup
                  onClick={handleDelete}
                  action="delete"
                  loading={loading}
                  title={deleteFormTitle}
                  triggerClass="bg-red-600 hover:bg-red-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
                />
              )}
              {additionalProps?.customActions && (
                <div className="shrink-0">{additionalProps.customActions}</div>
              )}

              {!readOnly && enableCreate && (
                <PopupForm
                  formFields={formFields}
                  onSubmit={handleSubmit}
                  loading={loading}
                  title={createFormTitle}
                  apiKey={apiKey}
                  triggerClass="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
                  triggerText=""
                  className={formClassName}
                  capitalizeInputs={capitalizeInputs}
                />
              )}

              {customTopRightButtons}

              <Button onClick={handleExportExcel} className="h-9 w-9 p-0 flex items-center justify-center bg-green-600 text-white hover:bg-green-700 border-0 shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </Button>

              <Button onClick={handleDownloadPDF} className="h-9 w-9 p-0 flex items-center justify-center btn-print border-0 shrink-0">
                <Printer className="h-4 w-4" />
              </Button>
            </div>

            {additionalProps?.customToolbar && !isMobile && (
              <div className="flex items-center">
                {additionalProps.customToolbar}
              </div>
            )}
          </div>

          {/* Row 3: Year and Month selectors */}
          {enableMonthYearFilter && (
            <div className="flex items-center justify-center gap-2 bg-muted/30 p-2 rounded-lg">
              <div className="flex items-center gap-1.5 w-full">
                <Select value={filterYear?.toString()} onValueChange={(v) => {
                  setFilterYear(parseInt(v));
                  if (isApiFiltering) debouncedApiFilterUpdate();
                }}>
                  <SelectTrigger className="flex-1 h-9 text-sm font-medium bg-background border-muted-foreground/20">
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
                  <SelectTrigger className="flex-1 h-9 text-sm font-medium bg-background border-muted-foreground/20">
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
            </div>
          )}


          {!!selectedData.length && (
            <div className="text-muted-foreground text-[10px] bg-muted/50 px-2 py-0.5 rounded-full inline-block">
              {selectedData?.length} selected
            </div>
          )}
        </div>
      ) : (
        /* ── Desktop Layout ── */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="mr-auto flex-1 min-w-0 flex items-center flex-wrap gap-2">
              {additionalProps?.customToolbar && (
                <div className="mr-2">{additionalProps.customToolbar}</div>
              )}
              <ColumnCustomization table={table} columnsConfig={columnsConfig} className={(additionalProps?.inlineFiltersOnDesktop || inlineFiltersOnDesktop) ? "h-10 w-10" : ""} />

              <PopupFilter
                filterConfig={isDateRangeInPopupDesktop ? filterConfig : filterConfig.filter(f => f.inputType !== "dateRange")}
                filters={filters}
                setFilter={handleSetFilter}
                removeFilter={handleRemoveFilter}
                clearFilters={handleClearFilters}
                globalFilter={globalFilter}
                setGlobalFilter={handleSetGlobalFilter}
                hasFilters={hasFilters || Object.keys(filters).length > 0}
                title={filterTitle || capitalize(resource)}
                description={filterDescription}
                filterType={filterType}
                maxWidthClass={filterMaxWidthClass}
                inlineOnDesktop={additionalProps?.inlineFiltersOnDesktop || inlineFiltersOnDesktop}
              />

              {resource === "performance" && activeRole === "College Admin" && (
                <StarOfTheMonthModal classes={filterConfig?.find(f => f.id === "classId")?.options || []} />
              )}

              {/* Desktop Date Range Filter */}
              {!isDateRangeInPopupDesktop && filterConfig.find(f => f.inputType === "dateRange") && (
                <div className="flex items-center gap-2">
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
                </div>
              )}

              {enableSearch && (
                <div className={cn("relative", (searchBarClassName?.includes("w-full") || searchBarClassName?.includes("flex-1")) ? "flex-1 min-w-[200px]" : "")}>
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={desktopSearchPlaceholder}
                    value={globalFilter ?? ""}
                    onChange={(e) => handleSetGlobalFilter(e.target.value)}
                    className={cn((additionalProps?.inlineFiltersOnDesktop || inlineFiltersOnDesktop) ? "h-10 pl-9" : "h-9 pl-9", searchBarClassName || "w-[180px] lg:w-[280px] xl:w-[320px]")}
                  />
                </div>
              )}

              {enableMonthYearFilter && (
                <div className="flex items-center space-x-2">
                  <Select value={filterYear?.toString()} onValueChange={(v) => {
                    setFilterYear(parseInt(v));
                    if (isApiFiltering) debouncedApiFilterUpdate();
                  }}>
                    <SelectTrigger className="w-[80px] h-9 text-xs">
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
                    <SelectTrigger className="w-[120px] h-9 text-xs">
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

              {trailingToolbar && (
                <div className="flex items-center">
                  {isValidElement(trailingToolbar)
                    ? cloneElement(trailingToolbar, {
                      filterMonth,
                      filterYear,
                      apiKey,
                      toppersOnly,
                      setToppersOnly: handleToggleToppers,
                      tableData: isApiFiltering ? data : filteredData,
                    })
                    : trailingToolbar}
                </div>
              )}
            </div>
            <div className="space-x-2 flex items-center">
              {actionButtons}
            </div>
          </div>

          {!!selectedData.length && (
            <div className="text-muted-foreground text-sm">
              {selectedData?.length} selected
            </div>
          )}
        </div>
      )}
      <div
        ref={tableRef}
        className="rounded-md border overflow-auto shadow-sm table-print relative "
        style={{
          maxHeight: (isMobile || tableHeight === "auto") ? "none" : tableHeight,
        }}
      >
        <PrintHeader
          apiKey={apiKey}
          title={generatedPrintTitle}
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
        <Table className={cn(toppersOnly ? "print:hidden" : "")}>
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
                      className={cn(
                        cell.column.id === "select" ? "print:hidden" : "",
                        cell.column.columnDef.meta?.className || "",
                        enableClickToEdit && !readOnly && !clickToEditExcludeColumns.includes(cell.column.id) && "cursor-pointer hover:bg-muted/60 transition-colors"
                      )}
                      onClick={(e) => {
                        if (
                          enableClickToEdit &&
                          !readOnly &&
                          !clickToEditExcludeColumns.includes(cell.column.id)
                        ) {
                          // Don't trigger if clicking an interactive element
                          if (e.target.closest('input, button, a, [role="checkbox"]')) return;

                          // Select only this row and open edit form
                          table.setRowSelection({ [row.id]: true });
                          setIsEditOpen(true);
                        }
                      }}
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
                      className={cn(
                        cell.column.id === "select" ? "print:hidden" : "",
                        cell.column.columnDef.meta?.className || ""
                      )}
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

        {/* Grouped Toppers Table (Only visible during print when toppersOnly is active) */}
        {toppersOnly && (
          <div className="hidden print:block w-full">
            <Table className="print:table w-full border-collapse">
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="w-[80px] border text-center font-bold">Sl.No.</TableHead>
                  <TableHead className="w-[180px] border font-bold">Class</TableHead>
                  <TableHead className="border font-bold">Toppers</TableHead>
                  <TableHead className="w-[100px] border text-right font-bold">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedTopperRows.map((group, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center border py-2 align-middle">{idx + 1}</TableCell>
                    <TableCell className="font-bold border bg-muted/5 py-2 uppercase align-middle">
                      {group.className}
                    </TableCell>
                    <TableCell className="border leading-relaxed py-2 font-normal text-foreground text-left align-middle">
                      <div className="flex flex-col gap-1 h-full justify-center">
                        {group.students.map((student, sIdx) => (
                          <div key={sIdx} className="whitespace-nowrap text-left">
                            {sIdx + 1}. [{student.id}] {student.name}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right border font-bold py-2 px-4 shadow-none align-middle">
                      {group.percentage.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
      {/* Detail View Modal for drill-down */}
      <Dialog open={!!detailView} onOpenChange={(open) => { if (!open) { setDetailView(null); setSubjectDrilldown(null); } }}>
        <DialogContent
          ref={popupRef}
          data-html2canvas-popup="true"
          className={cn(
            "rounded-2xl sm:rounded-2xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0",
            resource === "studentMasjidAttendances"
              ? "max-w-md sm:max-w-md"
              : detailView?.viewType === "subjectSummary"
                ? "max-w-3xl"
                : (detailView?.colHeader === "Present" || detailView?.colHeader === "Absent" || detailView?.colHeader === "Percentage" || (subjectDrilldown && subjectDrilldown.filterType !== "total"))
                  ? "max-w-md sm:max-w-md"
                  : "max-w-lg sm:max-w-lg"
          )}
        >
          <DialogHeader className={`flex flex-col gap-0 mx-0 px-4 sm:px-5 pt-4 pb-3 border-b space-y-0 sticky top-0 z-20 backdrop-blur-md shrink-0 bg-background/95 ${(subjectDrilldown?.filterType === "present" || detailView?.colHeader === "Present") ? "bg-green-50 dark:bg-green-950/20" : (subjectDrilldown?.filterType === "absent" || detailView?.colHeader === "Absent") ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/50 dark:bg-muted/20"}`}>
            {/* Top row: icon + title/meta + print + close */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`p-2 rounded-lg transition-colors focus:outline-none cursor-pointer shrink-0 self-center ${(subjectDrilldown?.filterType === "present" || detailView?.colHeader === "Present") ? "bg-green-100 dark:bg-green-900/30 hover:bg-green-200" : (subjectDrilldown?.filterType === "absent" || detailView?.colHeader === "Absent") ? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200" : "bg-primary/10 hover:bg-primary/20"}`}
                onClick={handleDownload}
                title="Download Image"
                data-html2canvas-ignore="true"
              >
                {(subjectDrilldown?.filterType === "present" || detailView?.colHeader === "Present") ? (
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-500" />
                ) : (subjectDrilldown?.filterType === "absent" || detailView?.colHeader === "Absent") ? (
                  <UserX className="h-5 w-5 text-red-500" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                )}
              </button>
              <div className="flex-1 text-left min-w-0">
                <DialogTitle className={`text-xl font-bold m-0 leading-tight whitespace-nowrap ${subjectDrilldown ? (subjectDrilldown.filterType === "present" ? "text-green-600 dark:text-green-400" : subjectDrilldown.filterType === "absent" ? "text-red-600 dark:text-red-400" : "") : (detailView?.colHeader === "Present" ? "text-green-600 dark:text-green-400" : detailView?.colHeader === "Absent" ? "text-red-600 dark:text-red-400" : "")}`}>
                  {subjectDrilldown ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSubjectDrilldown(null)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors inline-flex items-center"
                        title="Back to Subjects"
                        data-html2canvas-ignore="true"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <span>
                        {subjectDrilldown.filterType === "total"
                          ? "Total Records"
                          : subjectDrilldown.filterType === "present"
                          ? "Present Records"
                          : "Absent Records"}
                      </span>
                      <span className="ml-1 text-base font-semibold text-muted-foreground">
                        ({subjectDrilldown.records.length})
                      </span>
                    </span>
                  ) : detailView?.viewType === "subjectSummary" ? (
                    "Subject-wise Attendance"
                  ) : (
                    <>
                      {`${detailView?.colHeader} Records`}
                      <span className="ml-1.5 text-base font-semibold text-muted-foreground">
                        ({detailedRecords.length})
                      </span>
                    </>
                  )}
                </DialogTitle>
                <div className="m-0 flex flex-col mt-0.5 min-w-0">
                  {subjectDrilldown ? (
                    <>
                      <DialogDescription className="font-semibold text-foreground m-0 text-sm leading-tight truncate">
                        {subjectDrilldown.subjectName}
                        {subjectDrilldown.className && (
                          <span className="text-muted-foreground font-normal text-xs ml-1.5">
                            ({subjectDrilldown.className})
                          </span>
                        )}
                      </DialogDescription>
                      {subjectDrilldown.teacherName && (
                        <span className="text-xs text-muted-foreground font-normal leading-tight mt-0.5">
                          {subjectDrilldown.teacherName}
                        </span>
                      )}
                      {filterMonth && filterYear && (
                        <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                          {new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' })} {filterYear}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <DialogDescription className="font-medium text-foreground m-0 text-sm leading-tight truncate">
                        {detailView?.student?.name}
                        {resource === "studentAttendances" &&
                          detailView?.viewType !== "allRecords" &&
                          detailView?.viewType !== "subjectSummary" &&
                          detailView?.student?._id &&
                          !['cls', 'tch'].includes(String(detailView.student._id).split('-')[0].toLowerCase()) &&
                          ` (${detailView.student._id})`}
                      </DialogDescription>
                      {(detailView?.viewType === "allRecords" || detailView?.viewType === "subjectSummary") && filterMonth && filterYear && (
                        <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                          {new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' })} {filterYear}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {/* Print button — desktop inline, mobile below close */}
              {(detailView?.viewType === "allRecords" || detailView?.viewType === "subjectSummary") && (
                <button
                  type="button"
                  data-html2canvas-ignore="true"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 transition-colors focus:outline-none cursor-pointer shrink-0"
                  onClick={() => {
                    const name = detailView?.student?.name || '';
                    if (subjectDrilldown) {
                      const name = detailView?.student?.name || '';
                      const monthLabel = filterMonth ? new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' }) : '';
                      const yearLabel = filterYear || '';
                      const filterHeading = subjectDrilldown.filterType === "total"
                        ? "Total Records"
                        : subjectDrilldown.filterType === "present"
                        ? "Present Records"
                        : "Absent Records";
                      const showStatus = subjectDrilldown.filterType === "total";

                      const tableRows = subjectDrilldown.records.map((rec, idx) => {
                        const isPresent = rec.present === true;
                        const isAbsent = rec.present === false;
                        const rowBg = isPresent ? 'background:#f0fdf4;' : isAbsent ? 'background:#fef2f2;' : '';
                        const dateStr = rec.date ? new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                        const dayStr = rec.date ? new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long' }) : '';
                        const period = rec.periodNumber ? `Period #${rec.periodNumber}` : '—';
                        const teacher = rec.teacherName || '—';
                        const reasonHtml = (isAbsent && rec.leaveReason) ? `<div style="font-size:11px;color:#dc2626;margin-top:2px;font-weight:500;">${rec.leaveReason}</div>` : '';
                        const statusBg = isPresent ? 'background:#dcfce7;color:#15803d;' : isAbsent ? 'background:#fee2e2;color:#b91c1c;' : '';
                        const statusText = isPresent ? 'Present' : isAbsent ? 'Absent' : '—';
                        const statusTd = showStatus ? `<td style="text-align:center;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;${statusBg}">${statusText}</span></td>` : '';

                        return `<tr style="${rowBg}">
                          <td style="text-align:center;">${idx + 1}</td>
                          <td><div style="font-weight:600;font-size:13px;">${dateStr}</div><div style="font-size:11px;color:#6b7280;">${dayStr}</div></td>
                          <td><div style="font-weight:600;font-size:13px;">${period}</div>${reasonHtml}</td>
                          ${statusTd}
                        </tr>`;
                      }).join('');

                      const teacherHtml = subjectDrilldown.teacherName
                        ? `<div style="font-size:12px;font-weight:400;color:#6b7280;margin-top:2px;">${subjectDrilldown.teacherName}</div>`
                        : '';

                      const html = `<!DOCTYPE html><html><head><title>${subjectDrilldown.subjectName} – ${filterHeading}</title>
                      <link rel="preconnect" href="https://fonts.googleapis.com" />
                      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                      <style>
                        *{box-sizing:border-box;margin:0;padding:0;}
                        body{font-family:'Montserrat',sans-serif;font-size:13px;color:#111;padding:24px 32px;}
                        .header{margin-bottom:20px;border-bottom:2px solid #e5e7eb;padding-bottom:14px;text-align:center;}
                        .title{font-size:20px;font-weight:800;color:#111;letter-spacing:-0.5px;text-transform:uppercase;}
                        .subtitle{font-size:14px;font-weight:700;color:#4f46e5;margin-top:4px;}
                        .date-badge{font-size:12px;font-weight:600;color:#6b7280;margin-top:2px;}
                        table{width:100%;border-collapse:collapse;margin-top:14px;}
                        th{background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;padding:9px 12px;border:1px solid #d1d5db;}
                        td{padding:8px 12px;border:1px solid #e5e7eb;}
                        @media print{body{padding:10px;}}
                      </style></head><body>
                      <div class="header">
                        <div class="title">${filterHeading} (${subjectDrilldown.records.length})</div>
                        <div class="subtitle">${subjectDrilldown.subjectName}${name ? ` (${name})` : ''}</div>
                        ${teacherHtml}
                        ${monthLabel && yearLabel ? `<div class="date-badge">📅 ${monthLabel} ${yearLabel}</div>` : ''}
                      </div>
                      <table>
                        <thead><tr>
                          <th style="width:50px;text-align:center;">Sl.No.</th>
                          <th style="width:130px;text-align:left;">Date &amp; Day</th>
                          <th style="text-align:left;">Period</th>
                          ${showStatus ? '<th style="width:100px;text-align:center;">Status</th>' : ''}
                        </tr></thead>
                        <tbody>${tableRows}</tbody>
                      </table></body></html>`;

                      const iframe = document.createElement('iframe');
                      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
                      document.body.appendChild(iframe);
                      iframe.contentDocument.open();
                      iframe.contentDocument.write(html);
                      iframe.contentDocument.close();
                      setTimeout(() => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        setTimeout(() => document.body.removeChild(iframe), 500);
                      }, 400);
                      return;
                    }
                    if (detailView?.viewType === "subjectSummary") {
                      const monthLabel = filterMonth ? new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' }) : '';
                      const yearLabel = filterYear || '';
                      const totalClassSum = detailedRecords.reduce((sum, s) => sum + (s.totalClass ?? s.total ?? 0), 0);
                      const presentSum = detailedRecords.reduce((sum, s) => sum + (s.present ?? 0), 0);
                      const absentSum = detailedRecords.reduce((sum, s) => sum + (s.absent ?? 0), 0);
                      const totalPerc = totalClassSum > 0 ? ((presentSum / totalClassSum) * 100).toFixed(2) + '%' : '0.00%';

                      const tableRows = detailedRecords.map((sub, idx) => {
                        const teachers = Array.isArray(sub.teacherNames) && sub.teacherNames.length > 0
                          ? sub.teacherNames
                          : (sub.teacherName ? sub.teacherName.split(',').map(t => t.trim()).filter(Boolean) : []);
                        const teachersHtml = teachers.length > 1
                          ? `<div style="margin-top:2px;display:flex;flex-direction:column;gap:1px;">${teachers.map(t => `<div style="font-size:11px;color:#6b7280;font-weight:400;">• ${t}</div>`).join('')}</div>`
                          : (teachers[0] ? `<div style="font-size:11px;color:#6b7280;font-weight:400;margin-top:2px;">${teachers[0]}</div>` : '');

                        return `<tr>
                          <td style="text-align:center;">${idx + 1}</td>
                          <td style="font-weight:600;"><div>${sub.subjectName || '—'}</div>${teachersHtml}</td>
                          <td style="text-align:center;">${sub.totalClass ?? sub.total ?? 0}</td>
                          <td style="text-align:center;color:#15803d;font-weight:600;">${sub.present ?? 0}</td>
                          <td style="text-align:center;color:#b91c1c;font-weight:600;">${sub.absent ?? 0}</td>
                          <td style="text-align:center;font-weight:700;color:#4f46e5;">${sub.percentage || (sub.totalClass ? `${((sub.present / sub.totalClass) * 100).toFixed(2)}%` : '0.00%')}</td>
                        </tr>`;
                      }).join('');

                      const footerRow = `<tr style="font-weight:bold;background:#f3f4f6;">
                        <td colspan="2" style="text-align:center;">TOTAL</td>
                        <td style="text-align:center;">${totalClassSum}</td>
                        <td style="text-align:center;color:#15803d;">${presentSum}</td>
                        <td style="text-align:center;color:#b91c1c;">${absentSum}</td>
                        <td style="text-align:center;color:#4f46e5;">${totalPerc}</td>
                      </tr>`;

                      const html = `<!DOCTYPE html><html><head><title>Subject-wise Attendance – ${name}</title>
                      <link rel="preconnect" href="https://fonts.googleapis.com" />
                      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                      <style>
                        *{box-sizing:border-box;margin:0;padding:0;}
                        body{font-family:'Montserrat',sans-serif;font-size:13px;color:#111;padding:24px 32px;}
                        .header{margin-bottom:20px;border-bottom:2px solid #e5e7eb;padding-bottom:14px;text-align:center;}
                        .title{font-size:20px;font-weight:800;color:#111;letter-spacing:-0.5px;}
                        .subtitle{font-size:14px;font-weight:700;color:#4f46e5;margin-top:4px;text-transform:uppercase;}
                        .date-badge{font-size:12px;font-weight:600;color:#6b7280;margin-top:2px;}
                        table{width:100%;border-collapse:collapse;margin-top:14px;}
                        th{background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;padding:9px 12px;border:1px solid #d1d5db;}
                        td{padding:8px 12px;border:1px solid #e5e7eb;}
                        @media print{body{padding:10px;}}
                      </style></head><body>
                      <div class="header">
                        <div class="title">SUBJECT-WISE ATTENDANCE REPORT</div>
                        <div class="subtitle">${name}</div>
                        ${monthLabel && yearLabel ? `<div class="date-badge">📅 ${monthLabel} ${yearLabel}</div>` : ''}
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th style="width:50px;text-align:center;">Sl.No.</th>
                            <th style="text-align:left;">Subject</th>
                            <th style="text-align:center;">Total Class</th>
                            <th style="text-align:center;">Present</th>
                            <th style="text-align:center;">Absent</th>
                            <th style="text-align:center;">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>${tableRows}${footerRow}</tbody>
                      </table></body></html>`;

                      const iframe = document.createElement('iframe');
                      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
                      document.body.appendChild(iframe);
                      iframe.contentDocument.open();
                      iframe.contentDocument.write(html);
                      iframe.contentDocument.close();
                      setTimeout(() => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        setTimeout(() => document.body.removeChild(iframe), 500);
                      }, 400);
                      return;
                    }
                    const id = detailView?.student?._id || '';
                    const totalCount = detailedRecords.length;
                    const className = detailedRecords?.[0]?.className || '';
                    const presentCount = detailedRecords.filter(r => r.present === true).length;
                    const absentCount = detailedRecords.filter(r => r.present === false).length;
                    const monthLabel = filterMonth ? new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' }) : '';
                    const yearLabel = filterYear || '';
                    const isTeacher = resource === 'teacherAttendances';
                    const isMasjid = resource === 'studentMasjidAttendances';
                    const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;
                    const tableRows = detailedRecords.map(rec => {
                      const isPresent = rec.present === true;
                      const isAbsent = rec.present === false;
                      const rowBg = isPresent ? 'background:#f0fdf4;' : isAbsent ? 'background:#fef2f2;' : '';
                      const dateStr = rec.date ? new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                      const dayStr = rec.date ? new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long' }) : '';
                      const subject = rec.prayer || rec.subjectName || '—';
                      const period = rec.periodNumber ? `#${rec.periodNumber} - ` : '';
                      const classTeacher = isTeacher ? (rec.className || '—') : (rec.teacherName || '—');
                      const statusBg = isPresent ? 'background:#dcfce7;color:#15803d;' : isAbsent ? 'background:#fee2e2;color:#b91c1c;' : '';
                      const statusText = isPresent ? 'Present' : isAbsent ? 'Absent' : '—';
                      const leaveReasonHtml = (isAbsent && rec.leaveReason) ? `<div style="font-size:10px;color:#ea580c;margin-top:4px;font-weight:600;line-height:1.2;">${rec.leaveReason}</div>` : '';
                      return `<tr style="${rowBg}">
                        <td><div style="font-weight:600;font-size:13px;">${dateStr}</div><div style="font-size:11px;color:#6b7280;">${dayStr}</div></td>
                        <td><div style="font-weight:600;font-size:13px;white-space:nowrap;">${period}${subject}</div></td>
                        ${!isMasjid ? `<td style="font-size:13px;color:#374151;">${classTeacher}</td>` : ''}
                        <td style="text-align:center;"><span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;${statusBg}">${statusText}</span>${leaveReasonHtml}</td>
                      </tr>`;
                    }).join('');
                    const html = `<!DOCTYPE html><html><head><title>Attendance Records – ${name}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                    <style>
                      *{box-sizing:border-box;margin:0;padding:0;}
                      body{font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:20px;color:#111;}
                      .header{text-align:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;}
                      .header h1{font-size:15px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;}
                      .header h2{font-size:20px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;}
                      .header .meta{font-size:12px;color:#6b7280;display:flex;justify-content:center;gap:20px;flex-wrap:wrap;}
                      .header .meta span{font-weight:600;}
                      .stats{display:flex;justify-content:space-between;gap:10px;margin-bottom:16px;width:100%;}
                      .stat{flex:1;text-align:center;border-radius:8px;border:1px solid #e5e7eb;padding:8px 4px;}
                      .stat .num{font-size:20px;font-weight:800;display:block;}
                      .stat .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-top:2px;color:#6b7280;}
                      .stat.total{background:#f9fafb;}
                      .stat.present{background:#f0fdf4;border-color:#bbf7d0;}.stat.present .num{color:#16a34a;}.stat.present .lbl{color:#15803d;}
                      .stat.absent{background:#fef2f2;border-color:#fecaca;}.stat.absent .num{color:#dc2626;}.stat.absent .lbl{color:#b91c1c;}
                      .stat.percent{background:#eff6ff;border-color:#bfdbfe;}.stat.percent .num{color:#2563eb;}.stat.percent .lbl{color:#1d4ed8;}
                      table{border-collapse:collapse;width:100%;margin-top:4px;}
                      th{background:#f3f4f6;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:8px 10px;border:1px solid #d1d5db;text-align:left;font-family:'Montserrat',sans-serif;}
                      td{border:1px solid #e5e7eb;padding:7px 10px;vertical-align:middle;font-family:'Montserrat',sans-serif;}
                      tr:nth-child(even) td{background:#fafafa;}
                      @media print{body{padding:10px;}@page{margin:10mm;}}
                    </style></head>
                    <body>
                      <div class="header">
                        <h1 style="color:#111;font-size:18px;letter-spacing:0.05em;margin-bottom:8px;">${isMasjid ? 'GENERAL ATTENDANCE RECORDS' : 'TOTAL CLASS RECORDS'}</h1>
                        <div class="meta" style="margin-bottom:12px;">
                          <span style="font-size:14px;color:#111;">📅 ${monthLabel} ${yearLabel}</span>
                        </div>
                        <div style="font-size:14px;font-weight:700;text-transform:uppercase;color:#374151;line-height:1.5;">
                          <div>${id} - ${name}</div>
                          ${!isTeacher && className ? `<div>${className}</div>` : ''}
                        </div>
                      </div>
                      <div class="stats">
                        <div class="stat total"><span class="num">${totalCount}</span><span class="lbl">Total</span></div>
                        <div class="stat present"><span class="num">${presentCount}</span><span class="lbl">Present</span></div>
                        <div class="stat absent"><span class="num">${absentCount}</span><span class="lbl">Absent</span></div>
                        <div class="stat percent"><span class="num">${percentage}</span><span class="lbl">Percent</span></div>
                      </div>
                      <table>
                        <thead><tr>
                          <th style="width:110px;">Date &amp; Day</th>
                          <th style="min-width:180px;">${isMasjid ? 'Prayer / Session' : 'Subject'}</th>
                          ${!isMasjid ? `<th style="min-width:140px;">${isTeacher ? 'Class' : 'Teacher'}</th>` : ''}
                          <th style="width:90px;text-align:center;">Status</th>
                        </tr></thead>
                        <tbody>${tableRows}</tbody>
                      </table>
                    </body></html>`;
                    const iframe = document.createElement('iframe');
                    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
                    document.body.appendChild(iframe);
                    iframe.contentDocument.open();
                    iframe.contentDocument.write(html);
                    iframe.contentDocument.close();
                    setTimeout(() => {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                      setTimeout(() => document.body.removeChild(iframe), 500);
                    }, 400);
                  }}
                  title="Print Records"
                >
                  <Printer className="h-4 w-4" />
                  <span className="text-sm font-semibold">Print</span>
                </button>
              )}
              <div className="flex flex-col gap-2 shrink-0">
                <DialogClose className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" onClick={() => { setDetailView(null); setSubjectDrilldown(null); }} data-html2canvas-ignore="true">
                  <X className="h-5 w-5" />
                </DialogClose>
                {/* Mobile-only: print button row below close */}
                {(detailView?.viewType === "allRecords" || detailView?.viewType === "subjectSummary") && (
                  <button
                    type="button"
                    data-html2canvas-ignore="true"
                    className="sm:hidden flex items-center justify-center p-1.5 rounded-lg bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 transition-colors focus:outline-none cursor-pointer"
                    onClick={() => {
                      const name = detailView?.student?.name || '';
                    if (subjectDrilldown) {
                      const name = detailView?.student?.name || '';
                      const monthLabel = filterMonth ? new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' }) : '';
                      const yearLabel = filterYear || '';
                      const filterHeading = subjectDrilldown.filterType === "total"
                        ? "Total Records"
                        : subjectDrilldown.filterType === "present"
                        ? "Present Records"
                        : "Absent Records";
                      const showStatus = subjectDrilldown.filterType === "total";

                      const tableRows = subjectDrilldown.records.map((rec, idx) => {
                        const isPresent = rec.present === true;
                        const isAbsent = rec.present === false;
                        const rowBg = isPresent ? 'background:#f0fdf4;' : isAbsent ? 'background:#fef2f2;' : '';
                        const dateStr = rec.date ? new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                        const dayStr = rec.date ? new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long' }) : '';
                        const period = rec.periodNumber ? `Period #${rec.periodNumber}` : '—';
                        const teacher = rec.teacherName || '—';
                        const reasonHtml = (isAbsent && rec.leaveReason) ? `<div style="font-size:11px;color:#dc2626;margin-top:2px;font-weight:500;">${rec.leaveReason}</div>` : '';
                        const statusBg = isPresent ? 'background:#dcfce7;color:#15803d;' : isAbsent ? 'background:#fee2e2;color:#b91c1c;' : '';
                        const statusText = isPresent ? 'Present' : isAbsent ? 'Absent' : '—';
                        const statusTd = showStatus ? `<td style="text-align:center;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;${statusBg}">${statusText}</span></td>` : '';

                        return `<tr style="${rowBg}">
                          <td style="text-align:center;">${idx + 1}</td>
                          <td><div style="font-weight:600;font-size:13px;">${dateStr}</div><div style="font-size:11px;color:#6b7280;">${dayStr}</div></td>
                          <td><div style="font-weight:600;font-size:13px;">${period}</div>${reasonHtml}</td>
                          ${statusTd}
                        </tr>`;
                      }).join('');

                      const teacherHtml = subjectDrilldown.teacherName
                        ? `<div style="font-size:12px;font-weight:400;color:#6b7280;margin-top:2px;">${subjectDrilldown.teacherName}</div>`
                        : '';

                      const html = `<!DOCTYPE html><html><head><title>${subjectDrilldown.subjectName} – ${filterHeading}</title>
                      <link rel="preconnect" href="https://fonts.googleapis.com" />
                      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                      <style>
                        *{box-sizing:border-box;margin:0;padding:0;}
                        body{font-family:'Montserrat',sans-serif;font-size:13px;color:#111;padding:24px 32px;}
                        .header{margin-bottom:20px;border-bottom:2px solid #e5e7eb;padding-bottom:14px;text-align:center;}
                        .title{font-size:20px;font-weight:800;color:#111;letter-spacing:-0.5px;text-transform:uppercase;}
                        .subtitle{font-size:14px;font-weight:700;color:#4f46e5;margin-top:4px;}
                        .date-badge{font-size:12px;font-weight:600;color:#6b7280;margin-top:2px;}
                        table{width:100%;border-collapse:collapse;margin-top:14px;}
                        th{background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;padding:9px 12px;border:1px solid #d1d5db;}
                        td{padding:8px 12px;border:1px solid #e5e7eb;}
                        @media print{body{padding:10px;}}
                      </style></head><body>
                      <div class="header">
                        <div class="title">${filterHeading} (${subjectDrilldown.records.length})</div>
                        <div class="subtitle">${subjectDrilldown.subjectName}${name ? ` (${name})` : ''}</div>
                        ${teacherHtml}
                        ${monthLabel && yearLabel ? `<div class="date-badge">📅 ${monthLabel} ${yearLabel}</div>` : ''}
                      </div>
                      <table>
                        <thead><tr>
                          <th style="width:50px;text-align:center;">Sl.No.</th>
                          <th style="width:130px;text-align:left;">Date &amp; Day</th>
                          <th style="text-align:left;">Period</th>
                          ${showStatus ? '<th style="width:100px;text-align:center;">Status</th>' : ''}
                        </tr></thead>
                        <tbody>${tableRows}</tbody>
                      </table></body></html>`;

                      const iframe = document.createElement('iframe');
                      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
                      document.body.appendChild(iframe);
                      iframe.contentDocument.open();
                      iframe.contentDocument.write(html);
                      iframe.contentDocument.close();
                      setTimeout(() => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        setTimeout(() => document.body.removeChild(iframe), 500);
                      }, 400);
                      return;
                    }
                      if (detailView?.viewType === "subjectSummary") {
                        const monthLabel = filterMonth ? new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' }) : '';
                        const yearLabel = filterYear || '';
                        const totalClassSum = detailedRecords.reduce((sum, s) => sum + (s.totalClass ?? s.total ?? 0), 0);
                        const presentSum = detailedRecords.reduce((sum, s) => sum + (s.present ?? 0), 0);
                        const absentSum = detailedRecords.reduce((sum, s) => sum + (s.absent ?? 0), 0);
                        const totalPerc = totalClassSum > 0 ? ((presentSum / totalClassSum) * 100).toFixed(2) + '%' : '0.00%';

                        const tableRows = detailedRecords.map((sub, idx) => {
                          const teachers = Array.isArray(sub.teacherNames) && sub.teacherNames.length > 0
                            ? sub.teacherNames
                            : (sub.teacherName ? sub.teacherName.split(',').map(t => t.trim()).filter(Boolean) : []);
                          const teachersHtml = teachers.length > 1
                            ? `<div style="margin-top:2px;display:flex;flex-direction:column;gap:1px;">${teachers.map(t => `<div style="font-size:11px;color:#6b7280;font-weight:400;">• ${t}</div>`).join('')}</div>`
                            : (teachers[0] ? `<div style="font-size:11px;color:#6b7280;font-weight:400;margin-top:2px;">${teachers[0]}</div>` : '');

                          return `<tr>
                            <td style="text-align:center;">${idx + 1}</td>
                            <td style="font-weight:600;"><div>${sub.subjectName || '—'}</div>${teachersHtml}</td>
                            <td style="text-align:center;">${sub.totalClass ?? sub.total ?? 0}</td>
                            <td style="text-align:center;color:#15803d;font-weight:600;">${sub.present ?? 0}</td>
                            <td style="text-align:center;color:#b91c1c;font-weight:600;">${sub.absent ?? 0}</td>
                            <td style="text-align:center;font-weight:700;color:#4f46e5;">${sub.percentage || (sub.totalClass ? `${((sub.present / sub.totalClass) * 100).toFixed(2)}%` : '0.00%')}</td>
                          </tr>`;
                        }).join('');

                        const footerRow = `<tr style="font-weight:bold;background:#f3f4f6;">
                          <td colspan="2" style="text-align:center;">TOTAL</td>
                          <td style="text-align:center;">${totalClassSum}</td>
                          <td style="text-align:center;color:#15803d;">${presentSum}</td>
                          <td style="text-align:center;color:#b91c1c;">${absentSum}</td>
                          <td style="text-align:center;color:#4f46e5;">${totalPerc}</td>
                        </tr>`;

                        const html = `<!DOCTYPE html><html><head><title>Subject-wise Attendance – ${name}</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                        <style>
                          *{box-sizing:border-box;margin:0;padding:0;}
                          body{font-family:'Montserrat',sans-serif;font-size:13px;color:#111;padding:24px 32px;}
                          .header{margin-bottom:20px;border-bottom:2px solid #e5e7eb;padding-bottom:14px;text-align:center;}
                          .title{font-size:20px;font-weight:800;color:#111;letter-spacing:-0.5px;}
                          .subtitle{font-size:14px;font-weight:700;color:#4f46e5;margin-top:4px;text-transform:uppercase;}
                          .date-badge{font-size:12px;font-weight:600;color:#6b7280;margin-top:2px;}
                          table{width:100%;border-collapse:collapse;margin-top:14px;}
                          th{background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#374151;padding:9px 12px;border:1px solid #d1d5db;}
                          td{padding:8px 12px;border:1px solid #e5e7eb;}
                          @media print{body{padding:10px;}}
                        </style></head><body>
                        <div class="header">
                          <div class="title">SUBJECT-WISE ATTENDANCE REPORT</div>
                          <div class="subtitle">${name}</div>
                          ${monthLabel && yearLabel ? `<div class="date-badge">📅 ${monthLabel} ${yearLabel}</div>` : ''}
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th style="width:50px;text-align:center;">Sl.No.</th>
                              <th style="text-align:left;">Subject</th>
                              <th style="text-align:center;">Total Class</th>
                              <th style="text-align:center;">Present</th>
                              <th style="text-align:center;">Absent</th>
                              <th style="text-align:center;">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>${tableRows}${footerRow}</tbody>
                        </table></body></html>`;

                        const iframe = document.createElement('iframe');
                        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
                        document.body.appendChild(iframe);
                        iframe.contentDocument.open();
                        iframe.contentDocument.write(html);
                        iframe.contentDocument.close();
                        setTimeout(() => {
                          iframe.contentWindow.focus();
                          iframe.contentWindow.print();
                          setTimeout(() => document.body.removeChild(iframe), 500);
                        }, 400);
                        return;
                      }
                      const id = detailView?.student?._id || '';
                      const totalCount = detailedRecords.length;
                      const className = detailedRecords?.[0]?.className || '';
                      const presentCount = detailedRecords.filter(r => r.present === true).length;
                      const absentCount = detailedRecords.filter(r => r.present === false).length;
                      const monthLabel = filterMonth ? new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' }) : '';
                      const yearLabel = filterYear || '';
                      const isTeacher = resource === 'teacherAttendances';
                      const isMasjid = resource === 'studentMasjidAttendances';
                      const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;
                      const tableRows = detailedRecords.map(rec => {
                        const isPresent = rec.present === true;
                        const isAbsent = rec.present === false;
                        const rowBg = isPresent ? 'background:#f0fdf4;' : isAbsent ? 'background:#fef2f2;' : '';
                        const dateStr = rec.date ? new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                        const dayStr = rec.date ? new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long' }) : '';
                        const subject = rec.prayer || rec.subjectName || '—';
                        const period = rec.periodNumber ? `#${rec.periodNumber} - ` : '';
                        const classTeacher = isTeacher ? (rec.className || '—') : (rec.teacherName || '—');
                        const statusBg = isPresent ? 'background:#dcfce7;color:#15803d;' : isAbsent ? 'background:#fee2e2;color:#b91c1c;' : '';
                        const statusText = isPresent ? 'Present' : isAbsent ? 'Absent' : '—';
                        const leaveReasonHtml = (isAbsent && rec.leaveReason) ? `<div style="font-size:10px;color:#ea580c;margin-top:4px;font-weight:600;line-height:1.2;">${rec.leaveReason}</div>` : '';
                        return `<tr style="${rowBg}">
                          <td><div style="font-weight:600;font-size:13px;">${dateStr}</div><div style="font-size:11px;color:#6b7280;">${dayStr}</div></td>
                          <td><div style="font-weight:600;font-size:13px;white-space:nowrap;">${period}${subject}</div></td>
                          ${!isMasjid ? `<td style="font-size:13px;color:#374151;">${classTeacher}</td>` : ''}
                          <td style="text-align:center;"><span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;${statusBg}">${statusText}</span>${leaveReasonHtml}</td>
                        </tr>`;
                      }).join('');
                      const html = `<!DOCTYPE html><html><head><title>Attendance Records – ${name}</title>
                      <link rel="preconnect" href="https://fonts.googleapis.com" />
                      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                      <style>
                        *{box-sizing:border-box;margin:0;padding:0;}
                        body{font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:20px;color:#111;}
                        .header{text-align:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;}
                        .header h1{font-size:15px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;}
                        .header h2{font-size:20px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;}
                        .header .meta{font-size:12px;color:#6b7280;display:flex;justify-content:center;gap:20px;flex-wrap:wrap;}
                        .header .meta span{font-weight:600;}
                        .stats{display:flex;justify-content:space-between;gap:10px;margin-bottom:16px;width:100%;}
                        .stat{flex:1;text-align:center;border-radius:8px;border:1px solid #e5e7eb;padding:8px 4px;}
                        .stat .num{font-size:20px;font-weight:800;display:block;}
                        .stat .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-top:2px;color:#6b7280;}
                        .stat.total{background:#f9fafb;}
                        .stat.present{background:#f0fdf4;border-color:#bbf7d0;}.stat.present .num{color:#16a34a;}.stat.present .lbl{color:#15803d;}
                        .stat.absent{background:#fef2f2;border-color:#fecaca;}.stat.absent .num{color:#dc2626;}.stat.absent .lbl{color:#b91c1c;}
                        .stat.percent{background:#eff6ff;border-color:#bfdbfe;}.stat.percent .num{color:#2563eb;}.stat.percent .lbl{color:#1d4ed8;}
                        table{border-collapse:collapse;width:100%;margin-top:4px;}
                        th{background:#f3f4f6;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:8px 10px;border:1px solid #d1d5db;text-align:left;font-family:'Montserrat',sans-serif;}
                        td{border:1px solid #e5e7eb;padding:7px 10px;vertical-align:middle;font-family:'Montserrat',sans-serif;}
                        tr:nth-child(even) td{background:#fafafa;}
                        @media print{body{padding:10px;}@page{margin:10mm;}}
                      </style></head>
                      <body>
                        <div class="header">
                          <h1 style="color:#111;font-size:18px;letter-spacing:0.05em;margin-bottom:8px;">${isMasjid ? 'GENERAL ATTENDANCE RECORDS' : 'TOTAL CLASS RECORDS'}</h1>
                          <div class="meta" style="margin-bottom:12px;">
                            <span style="font-size:14px;color:#111;">📅 ${monthLabel} ${yearLabel}</span>
                          </div>
                          <div style="font-size:14px;font-weight:700;text-transform:uppercase;color:#374151;line-height:1.5;">
                            <div>${id} - ${name}</div>
                            ${!isTeacher && className ? `<div>${className}</div>` : ''}
                          </div>
                        </div>
                        <div class="stats">
                          <div class="stat total"><span class="num">${totalCount}</span><span class="lbl">Total</span></div>
                          <div class="stat present"><span class="num">${presentCount}</span><span class="lbl">Present</span></div>
                          <div class="stat absent"><span class="num">${absentCount}</span><span class="lbl">Absent</span></div>
                          <div class="stat percent"><span class="num">${percentage}</span><span class="lbl">Percent</span></div>
                        </div>
                        <table>
                          <thead><tr>
                            <th style="width:110px;">Date &amp; Day</th>
                            <th style="min-width:180px;">${isMasjid ? 'Prayer / Session' : 'Subject'}</th>
                            ${!isMasjid ? `<th style="min-width:140px;">${isTeacher ? 'Class' : 'Teacher'}</th>` : ''}
                            <th style="width:90px;text-align:center;">Status</th>
                          </tr></thead>
                          <tbody>${tableRows}</tbody>
                        </table>
                      </body></html>`;
                      const iframe = document.createElement('iframe');
                      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
                      document.body.appendChild(iframe);
                      iframe.contentDocument.open();
                      iframe.contentDocument.write(html);
                      iframe.contentDocument.close();
                      setTimeout(() => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        setTimeout(() => document.body.removeChild(iframe), 500);
                      }, 400);
                    }}
                    title="Print Records"
                  >
                    <Printer className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div
            className={cn(
              "px-2",
              resource === "studentMasjidAttendances" ? "py-4 sm:p-4" : "py-5 sm:p-5"
            )}
            ref={detailView?.viewType === "allRecords" ? detailPrintRef : null}
          >
            {/* Summary stats for Total Class popup */}
            {detailView?.viewType === "allRecords" && detailedRecords.length > 0 && (() => {
              const totalCount = detailedRecords.length;
              const presentCount = detailedRecords.filter(r => r.present === true).length;
              const absentCount = detailedRecords.filter(r => r.present === false).length;
              return (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="flex flex-col items-center justify-center rounded-lg border p-2 bg-muted/30">
                    <span className="text-xl font-extrabold text-foreground">{totalCount}</span>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground mt-0.5 tracking-wide">Total</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <span className="text-xl font-extrabold text-green-600 dark:text-green-400">{presentCount}</span>
                    <span className="text-[10px] font-semibold uppercase text-green-600/70 dark:text-green-400/70 mt-0.5 tracking-wide">Present</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{absentCount}</span>
                    <span className="text-[10px] font-semibold uppercase text-red-600/70 dark:text-red-400/70 mt-0.5 tracking-wide">Absent</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-2 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                      {totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-blue-600/70 dark:text-blue-400/70 mt-0.5 tracking-wide">Percent</span>
                  </div>
                </div>
              );
            })()}
            {detailsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-70" />
                <div className="space-y-1 text-center">
                  <p className="text-base font-semibold text-foreground">Loading Records</p>
                  <p className="text-sm text-muted-foreground animate-pulse">Syncing teacher details and subjects...</p>
                </div>
              </div>
            ) : detailedRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg bg-background">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Search className="h-8 w-8 opacity-40" />
                </div>
                <p className="text-lg font-medium">No records found</p>
                <p className="text-sm">There are no matching entries for the selected filter.</p>
              </div>
            ) : subjectDrilldown ? (
              <div>
                {subjectDrilldown.records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-background">
                    <p className="text-sm font-medium">No records found</p>
                  </div>
                ) : (
                  <div className="border rounded-md sm:rounded-lg shadow-sm bg-background overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-[60px] font-bold text-center">Sl. No.</TableHead>
                          <TableHead className="w-[110px] sm:w-[130px] px-2 sm:px-4 font-bold whitespace-nowrap">Date &amp; Day</TableHead>
                          <TableHead className="min-w-[100px] sm:min-w-[140px] px-2 sm:px-4 font-bold whitespace-nowrap">Period</TableHead>
                          {subjectDrilldown.filterType === "total" && (
                            <TableHead className="min-w-[110px] sm:min-w-[140px] px-2 sm:px-4 font-bold text-center">Status</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectDrilldown.records.map((rec, idx) => {
                          const isAbsent = rec.present === false;
                          return (
                            <TableRow
                              key={idx}
                              className={cn(
                                "transition-colors",
                                isAbsent ? "bg-red-50/40 hover:bg-red-50/60 dark:bg-red-950/10 dark:hover:bg-red-950/20" : "hover:bg-muted/30"
                              )}
                            >
                              <TableCell className="text-center font-medium text-muted-foreground py-3">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap py-3 px-2 sm:px-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long' })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-2 sm:px-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm whitespace-nowrap">
                                    {rec.periodNumber ? `Period #${rec.periodNumber}` : "Scheduled Period"}
                                  </span>
                                  {subjectDrilldown.filterType === "absent" && isAbsent && rec.leaveReason && (
                                    <span className="text-xs text-red-500 dark:text-red-400 font-medium mt-1 leading-tight">
                                      {rec.leaveReason}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              {subjectDrilldown.filterType === "total" && (
                                <TableCell className="text-center py-3 px-2 sm:px-4">
                                  {rec.present === true ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      <UserCheck className="h-3 w-3" /> Present
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1 items-center">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        <UserX className="h-3 w-3" /> Absent
                                      </span>
                                      {rec.leaveReason && (
                                        <span className="text-xs text-red-500 dark:text-red-400 font-medium leading-tight">
                                          {rec.leaveReason}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-md sm:rounded-lg shadow-sm bg-background overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      {detailView?.viewType === "studentList" && (
                        <TableHead className="w-[60px] font-bold text-center">Sl. No.</TableHead>
                      )}
                      {detailView?.viewType === "subjectSummary" ? (
                        <>
                          <TableHead className="w-[60px] font-bold text-center">Sl. No.</TableHead>
                          <TableHead className="font-bold">Subject Name</TableHead>
                          <TableHead className="text-center font-normal">Total Class</TableHead>
                          <TableHead className="text-center font-normal">Present</TableHead>
                          <TableHead className="text-center font-normal">Absent</TableHead>
                          <TableHead className="text-center font-normal">Percentage</TableHead>
                        </>
                      ) : detailView?.viewType === "studentList" ? (
                        <>
                          <TableHead className="w-[120px] font-bold">Student ID</TableHead>
                          <TableHead className="font-bold">Name</TableHead>
                          <TableHead className="font-bold">Class</TableHead>
                        </>
                      ) : detailView?.viewType === "programsList" ? (
                        <>
                          <TableHead className="w-[60px] font-bold text-center">Sl. No.</TableHead>
                          <TableHead className="font-bold">Program</TableHead>
                          <TableHead className="font-bold text-center">Grade</TableHead>
                          <TableHead className="font-bold text-center">Rank</TableHead>
                          <TableHead className="font-bold text-center">Points</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="w-[85px] sm:w-[100px] px-2 sm:px-4 font-bold whitespace-nowrap">Date & Day</TableHead>
                          <TableHead className={cn(
                            "px-2 sm:px-4 font-bold whitespace-nowrap",
                            resource === "studentMasjidAttendances" ? "min-w-[100px] sm:min-w-[130px]" : "min-w-[130px] sm:min-w-[180px]"
                          )}>
                            {resource === "studentMasjidAttendances" ? "Prayer / Session" : "Subject"}
                          </TableHead>
                          {(resource === "studentAttendances" || resource === "teacherAttendances" || resource === "classAttendances") &&
                           detailView?.colHeader !== "Present" &&
                           detailView?.colHeader !== "Absent" &&
                           detailView?.colHeader !== "Percentage" && (
                            <TableHead className="min-w-[100px] sm:min-w-[120px] px-2 sm:px-4 font-bold">
                              Status
                            </TableHead>
                          )}
                          {detailView?.viewType === "allRecords" && resource === "studentMasjidAttendances" && (
                            <TableHead className="font-bold text-center w-[100px]">Status</TableHead>
                          )}
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedRecords.map((rec, i) => {
                      const isAbsent = rec.present === false;
                      return (
                        <TableRow
                          key={i}
                          className={cn(
                            "transition-colors",
                            isAbsent ? "bg-red-50/40 hover:bg-red-50/60 dark:bg-red-950/10 dark:hover:bg-red-950/20" : "hover:bg-muted/30"
                          )}
                        >
                          {detailView?.viewType === "studentList" && (
                            <TableCell className="text-center font-medium text-muted-foreground py-3">
                              {i + 1}
                            </TableCell>
                          )}
                          {detailView?.viewType === "subjectSummary" ? (
                            <>
                              <TableCell className="text-center font-medium text-muted-foreground py-3">
                                {i + 1}
                              </TableCell>
                              <TableCell className="font-bold text-sm py-3">
                                <div className="flex flex-col">
                                  <span>{rec.subjectName || "—"}</span>
                                  {(() => {
                                    const teachers = Array.isArray(rec.teacherNames) && rec.teacherNames.length > 0
                                      ? rec.teacherNames
                                      : (rec.teacherName ? rec.teacherName.split(",").map((t) => t.trim()).filter(Boolean) : []);
                                    if (teachers.length === 0) return null;
                                    if (teachers.length === 1) {
                                      return (
                                        <span className="text-xs text-muted-foreground font-normal mt-0.5">
                                          {teachers[0]}
                                        </span>
                                      );
                                    }
                                    return (
                                      <div className="flex flex-col gap-0.5 mt-1">
                                        {teachers.map((teacher, idx) => (
                                          <span key={idx} className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                            <span>{teacher}</span>
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-normal text-sm py-3">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 rounded-md hover:bg-muted font-normal text-foreground cursor-pointer transition-colors"
                                  onClick={() => {
                                    const subRecs = (rec.records || []).slice().sort((a, b) => {
                                      const timeA = a.date ? new Date(a.date).getTime() : 0;
                                      const timeB = b.date ? new Date(b.date).getTime() : 0;
                                      if (timeA !== timeB) return timeA - timeB;
                                      return (Number(a.periodNumber) || 0) - (Number(b.periodNumber) || 0);
                                    });
                                    setSubjectDrilldown({
                                      subjectName: rec.subjectName || "—",
                                      teacherName: (Array.isArray(rec.teacherNames) && rec.teacherNames.length > 0)
                                        ? rec.teacherNames.join(", ")
                                        : (rec.teacherName || ""),
                                      filterType: "total",
                                      records: subRecs,
                                      className: detailView?.student?.name || "",
                                    });
                                  }}
                                  title="View all dates"
                                >
                                  {rec.totalClass ?? rec.total ?? 0}
                                </button>
                              </TableCell>
                              <TableCell className="text-center font-normal text-sm py-3 text-green-600 dark:text-green-400">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 font-normal text-green-600 dark:text-green-400 cursor-pointer transition-colors"
                                  onClick={() => {
                                    const subRecs = (rec.records || []).filter((r) => r.present === true).slice().sort((a, b) => {
                                      const timeA = a.date ? new Date(a.date).getTime() : 0;
                                      const timeB = b.date ? new Date(b.date).getTime() : 0;
                                      if (timeA !== timeB) return timeA - timeB;
                                      return (Number(a.periodNumber) || 0) - (Number(b.periodNumber) || 0);
                                    });
                                    setSubjectDrilldown({
                                      subjectName: rec.subjectName || "—",
                                      teacherName: (Array.isArray(rec.teacherNames) && rec.teacherNames.length > 0)
                                        ? rec.teacherNames.join(", ")
                                        : (rec.teacherName || ""),
                                      filterType: "present",
                                      records: subRecs,
                                      className: detailView?.student?.name || "",
                                    });
                                  }}
                                  title="View present dates"
                                >
                                  {rec.present ?? 0}
                                </button>
                              </TableCell>
                              <TableCell className="text-center font-normal text-sm py-3 text-red-600 dark:text-red-400">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 font-normal text-red-600 dark:text-red-400 cursor-pointer transition-colors"
                                  onClick={() => {
                                    const subRecs = (rec.records || []).filter((r) => r.present === false).slice().sort((a, b) => {
                                      const timeA = a.date ? new Date(a.date).getTime() : 0;
                                      const timeB = b.date ? new Date(b.date).getTime() : 0;
                                      if (timeA !== timeB) return timeA - timeB;
                                      return (Number(a.periodNumber) || 0) - (Number(b.periodNumber) || 0);
                                    });
                                    setSubjectDrilldown({
                                      subjectName: rec.subjectName || "—",
                                      teacherName: (Array.isArray(rec.teacherNames) && rec.teacherNames.length > 0)
                                        ? rec.teacherNames.join(", ")
                                        : (rec.teacherName || ""),
                                      filterType: "absent",
                                      records: subRecs,
                                      className: detailView?.student?.name || "",
                                    });
                                  }}
                                  title="View absent dates"
                                >
                                  {rec.absent ?? 0}
                                </button>
                              </TableCell>
                              <TableCell className="text-center font-normal text-sm py-3 text-indigo-600 dark:text-indigo-400">
                                {rec.percentage || (rec.totalClass ? `${((rec.present / rec.totalClass) * 100).toFixed(2)}%` : "0.00%")}
                              </TableCell>
                            </>
                          ) : detailView?.viewType === "studentList" ? (
                            <>
                              <TableCell className="font-mono text-xs py-3">{rec.studentId || "—"}</TableCell>
                              <TableCell className="font-bold text-sm py-3 uppercase">{rec.studentName || rec.name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm py-3 font-medium">{rec.className || "—"}</TableCell>
                            </>
                          ) : detailView?.viewType === "programsList" ? (
                            <>
                              <TableCell className="text-center font-medium text-muted-foreground py-3">
                                {i + 1}
                              </TableCell>
                              <TableCell className="font-bold text-sm py-3 uppercase">
                                {rec.name || "—"}
                                {(rec.type || rec.participantName) && (
                                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                                    {rec.type} {rec.participantName && `• ${rec.participantName}`}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-sm py-3 font-medium text-indigo-600">
                                {(!rec.grade || rec.grade.toLowerCase() === 'f') ? "—" : rec.grade}
                              </TableCell>
                              <TableCell className="text-center text-sm py-3 font-medium">
                                {rec.rank || "—"}
                              </TableCell>
                              <TableCell className="text-center text-sm py-3 font-bold text-green-600">
                                {rec.points || 0}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium whitespace-nowrap py-3 px-2 sm:px-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long' })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className={cn(
                                "py-3 px-2 sm:px-4",
                                resource === "studentMasjidAttendances" ? "min-w-[100px] sm:min-w-[130px]" : "min-w-[130px] sm:min-w-[180px]"
                              )}>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm whitespace-nowrap">
                                    {rec.periodNumber ? `#${rec.periodNumber} - ` : ""}
                                    {rec.prayer || rec.subjectName || "—"}
                                  </span>
                                  {(resource === "studentAttendances" || resource === "teacherAttendances" || resource === "classAttendances") && (
                                    <span className="text-xs text-muted-foreground mt-0.5 whitespace-normal md:whitespace-nowrap">
                                      {resource === "teacherAttendances" ? (rec.className || "—") : (rec.teacherName || "—")}
                                    </span>
                                  )}
                                  {rec.status === "LEAVE" && (
                                    <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium leading-tight mt-0.5">
                                      On Leave
                                    </span>
                                  )}
                                  {detailView?.colHeader === "Absent" && isAbsent && rec.leaveReason && (
                                    <span className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5 leading-tight">
                                      {rec.leaveReason}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              {(resource === "studentAttendances" || resource === "teacherAttendances" || resource === "classAttendances") &&
                               detailView?.colHeader !== "Present" &&
                               detailView?.colHeader !== "Absent" &&
                               detailView?.colHeader !== "Percentage" && (
                                <TableCell className="text-muted-foreground text-sm py-3 px-2 sm:px-4">
                                  {resource === "teacherAttendances" ? (
                                    <div className="flex flex-col items-start gap-1.5">
                                      {detailView?.viewType === "allRecords" && (
                                        rec.present === true ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            <UserCheck className="h-3 w-3" /> Present
                                          </span>
                                        ) : rec.present === false ? (
                                          <div className="flex flex-col gap-1 items-start">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                              <UserX className="h-3 w-3" /> Absent
                                            </span>
                                            {rec.leaveReason && (
                                              <span className="text-xs text-red-500 dark:text-red-400 font-medium leading-tight">
                                                {rec.leaveReason}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">—</span>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-start gap-1.5">
                                      {detailView?.viewType === "allRecords" && (
                                        rec.present === true ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            <UserCheck className="h-3 w-3" /> Present
                                          </span>
                                        ) : rec.present === false ? (
                                          <div className="flex flex-col gap-1 items-start">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                              <UserX className="h-3 w-3" /> Absent
                                            </span>
                                            {rec.leaveReason && (
                                              <span className="text-xs text-red-500 dark:text-red-400 font-medium leading-tight">
                                                {rec.leaveReason}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">—</span>
                                        )
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              )}
                              {detailView?.viewType === "allRecords" && resource === "studentMasjidAttendances" && (
                                <TableCell className="text-center py-3">
                                  {rec.present === true ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      <UserCheck className="h-3 w-3" /> Present
                                    </span>
                                  ) : rec.present === false ? (
                                    <div className="flex flex-col gap-1 items-center">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        <UserX className="h-3 w-3" /> Absent
                                      </span>
                                      {rec.leaveReason && (
                                        <span className="text-[10px] text-orange-500 font-semibold leading-tight bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/50">
                                          {rec.leaveReason}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </TableCell>
                              )}
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Success Popup */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent
          className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md [&>button.absolute]:hidden flex flex-col p-0 gap-0"
        >
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div
              className={`p-2 rounded-lg ${successConfig.message?.toLowerCase().includes("delet") || successConfig.message?.toLowerCase().includes("remov") || successConfig.message?.toLowerCase().includes("reset")
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30"
                }`}
            >
              <CheckCircle2 className={`h-5 w-5 ${successConfig.message?.toLowerCase().includes("delet") || successConfig.message?.toLowerCase().includes("remov") || successConfig.message?.toLowerCase().includes("reset")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
                }`} />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className={`text-xl font-bold m-0 ${successConfig.message?.toLowerCase().includes("delet") || successConfig.message?.toLowerCase().includes("remov") || successConfig.message?.toLowerCase().includes("reset")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
                }`}>
                {successConfig.title || "Success"}
              </DialogTitle>
              <DialogDescription className="m-0 text-xs text-muted-foreground whitespace-pre-wrap">
                {successConfig.message}
              </DialogDescription>
            </div>
            <DialogClose
              className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataTableComponent;
