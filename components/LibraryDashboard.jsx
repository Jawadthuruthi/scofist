"use client";

import { useState } from "react";
import Header from "@/components/Header";
import TableComponent from "@/components/TableComponent";
import PopupForm from "@/components/PopupForm";
import BestReaderCard from "./BestReaderCard";
import MostReadBookCard from "./MostReadBookCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, BookOpen, AlertCircle, Trash2, FileSpreadsheet, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import BarcodeSheet from "./BarcodeSheet";
import { Search, Scan, IdCard, Book as BookIcon, ScanBarcode, Edit } from "lucide-react";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    ),
});
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EMPTY_ARRAY = [];

// Normalize common category misspellings
const normalizeCategoryName = (name) => {
    if (!name) return name;
    const upper = name.toUpperCase().trim();
    const corrections = {
        "TRAVELOUGUE": "TRAVELOGUE",
        "TRAVELOUGE": "TRAVELOGUE",
        "TRAVLOGUE": "TRAVELOGUE",
        "TRAVELOG": "TRAVELOGUE",
    };
    return corrections[upper] ?? upper;
};

export default function LibraryDashboard({
    view,
    counts,
    categories,
    languages,
    initialBooks = EMPTY_ARRAY,
    initialRentals = EMPTY_ARRAY,
    initialPendingRentals = EMPTY_ARRAY,
    initialPendingRequests = EMPTY_ARRAY,
    classes = EMPTY_ARRAY,
    activeRole = "",
    apiKey = "",
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [rowSelection, setRowSelection] = useState({});
    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [duplicateIdsOpen, setDuplicateIdsOpen] = useState(false);
    const barcodeSheetRef = useRef(null);
    const tableRef = useRef(null);

    // --- Local optimistic state ---
    const sortBooks = (books) => {
        return books.map(b => ({
            ...b,
            language: b.language ? b.language.toUpperCase() : b.language,
            category: b.category ? b.category.toUpperCase() : b.category
        })).sort((a, b) => {
            const idA = String(a.id || "");
            const idB = String(b.id || "");
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
    };

    const [localBooks, setLocalBooks] = useState(sortBooks(initialBooks));
    const [activeFilters, setActiveFilters] = useState([]);

    useEffect(() => { 
        setLocalBooks(sortBooks(initialBooks)); 
    }, [initialBooks]);

    // --- Popup State ---
    const [categoriesPopupOpen, setCategoriesPopupOpen] = useState(false);
    const [languagesPopupOpen, setLanguagesPopupOpen] = useState(false);
    const [pendingRentalsPopupOpen, setPendingRentalsPopupOpen] = useState(false);
    const [totalBooksPopupOpen, setTotalBooksPopupOpen] = useState(false);
    const [availableBooksPopupOpen, setAvailableBooksPopupOpen] = useState(false);
    const [deleteErrorPopupOpen, setDeleteErrorPopupOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

    // --- Book Requests state ---
    const [localRequests, setLocalRequests] = useState(Array.isArray(initialPendingRequests) ? initialPendingRequests : []);
    const [requestsPopupOpen, setRequestsPopupOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rentalFromRequestOpen, setRentalFromRequestOpen] = useState(false);
    const [requestsLoading, setRequestsLoading] = useState(false);

    const fetchRequests = async () => {
        setRequestsLoading(true);
        try {
            const res = await fetch("/api/library/requests");
            const result = await res.json();
            if (result.success) setLocalRequests(result.data || []);
        } catch {/* silent */} finally {
            setRequestsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRejectRequest = async (requestId) => {
        if (!confirm("Reject this request?")) return;
        try {
            const res = await fetch("/api/library/requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: requestId, status: "Rejected" }),
            });
            if (res.ok) { toast.success("Request rejected"); fetchRequests(); }
        } catch { toast.error("Failed to reject"); }
    };

    const handleApproveRequest = async (data) => {
        try {
            const response = await fetch("/api/rental", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                if (selectedRequest) {
                    await fetch("/api/library/requests", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ _id: selectedRequest._id, status: "Approved" }),
                    });
                }
                toast.success("Rental created and request approved");
                fetchRequests();
                setRentalFromRequestOpen(false);
                return true;
            } else {
                const err = await response.json();
                toast.error(err.msg || "Failed to create rental");
                return false;
            }
        } catch { toast.error("An error occurred"); return false; }
    };

    const pendingRequestsCount = localRequests.filter(r => r.status === "Pending").length;

    // --- Lookup State ---
    const [studentSearchId, setStudentSearchId] = useState("");
    const [bookSearchId, setBookSearchId] = useState("");
    const [lookupStudent, setLookupStudent] = useState(null);
    const [lookupBook, setLookupBook] = useState(null);
    const [studentHistory, setStudentHistory] = useState([]);
    const [bookHistory, setBookHistory] = useState([]);
    const [studentPopupOpen, setStudentPopupOpen] = useState(false);
    const [bookPopupOpen, setBookPopupOpen] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [showStudentScanner, setShowStudentScanner] = useState(false);
    const [showBookScanner, setShowBookScanner] = useState(false);
    const [returnBookRental, setReturnBookRental] = useState(null);
    const [quickRentalBook, setQuickRentalBook] = useState(null);

    const selectedIds = Object.keys(rowSelection);
    const selectedBook = useMemo(
        () => view === "books" && selectedIds.length === 1
            ? localBooks.find(b => b._id === selectedIds[0])
            : null,
        [view, selectedIds, localBooks]
    );

    const selectedRental = view === "rentals" && selectedIds.length === 1
        ? initialRentals.find(r => r._id === selectedIds[0])
        : null;

    // --- Duplicate ID detection ---
    const duplicateIdGroups = useMemo(() => {
        const idMap = {};
        localBooks.forEach(b => {
            const key = String(b.id || "").trim().toUpperCase();
            if (!key) return;
            if (!idMap[key]) idMap[key] = [];
            idMap[key].push(b);
        });
        return Object.entries(idMap)
            .filter(([, books]) => books.length > 1)
            .map(([id, books]) => {
                // Safe to merge = all books have identical name, author, language, category
                const norm = b => ([
                    (b.name || "").trim().toUpperCase(),
                    (b.author || "").trim().toUpperCase(),
                    (b.language || "").trim().toUpperCase(),
                    normalizeCategoryName(b.category),
                ].join("|"));
                const firstSig = norm(books[0]);
                const isSafe = books.every(b => norm(b) === firstSig);
                return { id, books, isSafe };
            })
            .sort((a, b) => a.id.localeCompare(b.id));
    }, [localBooks]);

    const handleMergeDuplicates = async (books) => {
        const toDelete = books.slice(1);

        setLoading(true);
        try {
            for (const book of toDelete) {
                await fetch(`/api/library/books?id=${book._id}`, { method: "DELETE" });
            }
            setLocalBooks(prev => {
                const idsToRemove = new Set(toDelete.map(b => b._id));
                return prev.filter(b => !idsToRemove.has(b._id));
            });
            toast.success(`Merged: kept 1, deleted ${toDelete.length} duplicate${toDelete.length > 1 ? "s" : ""}`);
            router.refresh();
        } catch {
            toast.error("Failed to merge duplicates");
        } finally {
            setLoading(false);
        }
    };

    const handleMergeAllSafe = async () => {
        const safeGroups = duplicateIdGroups.filter(g => g.isSafe);
        if (!safeGroups.length) return;
        const allToDelete = safeGroups.flatMap(g => g.books.slice(1));
        setLoading(true);
        try {
            for (const book of allToDelete) {
                await fetch(`/api/library/books?id=${book._id}`, { method: "DELETE" });
            }
            setLocalBooks(prev => {
                const idsToRemove = new Set(allToDelete.map(b => b._id));
                return prev.filter(b => !idsToRemove.has(b._id));
            });
            toast.success(
                `Merged ${safeGroups.length} group${safeGroups.length > 1 ? "s" : ""}: deleted ${allToDelete.length} duplicate${allToDelete.length > 1 ? "s" : ""}`
            );
            router.refresh();
        } catch {
            toast.error("Failed to merge all safe duplicates");
        } finally {
            setLoading(false);
        }
    };

    // --- Dynamic Options ---
    const dynamicLanguages = useMemo(() => {
        const fromBooks = localBooks.map(b => b.language?.toUpperCase()).filter(Boolean);
        const fromApi = Array.isArray(languages) ? languages.map(l => l.language?.toUpperCase()) : (languages || []).map(l => typeof l === 'string' ? l.toUpperCase() : l);
        const all = new Set([...fromApi, ...fromBooks]);
        return Array.from(all).sort();
    }, [languages, localBooks]);

    const dynamicCategories = useMemo(() => {
        const selectedLanguage = activeFilters.find(f => f.id === 'language')?.value;
        let booksToExtract = localBooks;
        if (selectedLanguage) {
            if (Array.isArray(selectedLanguage)) {
                const selectedUpper = selectedLanguage.map(l => typeof l === 'string' ? l.toUpperCase() : String(l).toUpperCase());
                booksToExtract = localBooks.filter(b => selectedUpper.includes(b.language?.toUpperCase()));
            } else {
                booksToExtract = localBooks.filter(b => b.language?.toUpperCase() === String(selectedLanguage).toUpperCase());
            }
        }
        
        const fromBooks = booksToExtract.map(b => normalizeCategoryName(b.category)).filter(Boolean);
        const fromApi = selectedLanguage ? [] : (Array.isArray(categories) ? categories.map(c => normalizeCategoryName(c.category)) : (categories || []).map(c => typeof c === 'string' ? normalizeCategoryName(c) : c));
        const all = new Set([...fromApi, ...fromBooks]);
        return Array.from(all).sort();
    }, [categories, localBooks, activeFilters]);

    const uniqueCategories = useMemo(() => {
        if (!categories || !categories.length) return [];
        return Object.values(
            categories.reduce((acc, cat) => {
                const key = normalizeCategoryName(cat.category);
                if (!key) return acc;
                if (acc[key]) {
                    acc[key].count += cat.count || 0;
                } else {
                    let prefix = "-";
                    const book = localBooks.find(b => normalizeCategoryName(b.category) === key && b.id);
                    if (book && book.id) {
                        const match = String(book.id).match(/^[A-Za-z]+/);
                        if (match) prefix = match[0].toUpperCase();
                    }
                    acc[key] = { category: key, count: cat.count || 0, prefix };
                }
                return acc;
            }, {})
        ).sort((a, b) => a.category.localeCompare(b.category));
    }, [categories, localBooks]);

    const uniqueLanguages = useMemo(() => {
        if (!languages || !languages.length) return [];
        return Object.values(
            languages.reduce((acc, lang) => {
                const key = (lang.language || "").toUpperCase();
                if (!key) return acc;
                if (acc[key]) {
                    acc[key].count += lang.count || 0;
                } else {
                    acc[key] = { language: key, count: lang.count || 0 };
                }
                return acc;
            }, {})
        ).sort((a, b) => a.language.localeCompare(b.language));
    }, [languages]);

    // --- Configurations ---

    const bookFields = [
        {
            name: "id",
            label: "Book ID",
            inputType: "text",
            type: "text",
            required: true,
            enableScanner: true,
        },
        {
            name: "name",
            label: "Book Name",
            inputType: "text",
            required: true,
        },
        {
            name: "author",
            label: "Author",
            inputType: "text",
            required: true,
        },
        {
            name: "language",
            label: "Language",
            inputType: "select",
            options: dynamicLanguages.map((l) => ({ value: l, label: l })),
            freeSolo: true,
            required: true,
        },
        {
            name: "category",
            label: "Category",
            inputType: "select",
            options: dynamicCategories.map((c) => ({ value: c, label: c })),
            freeSolo: true,
            required: true,
        },
        {
            name: "publication",
            label: "Publication",
            inputType: "text",
        },
        {
            name: "price",
            label: "Price",
            inputType: "number",
            type: "number",
        },
    ];

    const rentalFields = [
        {
            name: "rentedDate",
            label: "Rented Date",
            inputType: "date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
        },
        {
            name: "bookId",
            label: "Book ID",
            inputType: "async-text",
            asyncProps: {
                endpoint: "/api/library/books",
                queryKey: "number",
                displayKey: "name",
                responseKey: "data"
            },
            autoFocus: true,
            required: true,
            enableScanner: true,
        },
        {
            name: "studentId",
            label: "Student ID",
            inputType: "async-text",
            asyncProps: {
                endpoint: "/api/users",
                queryKey: "_id",
                displayKey: "name",
                responseKey: "users"
            },
            enableScanner: true,
        },
        {
            name: "classId",
            label: "Class (Optional)",
            inputType: "select",
            options: Array.isArray(classes) ? classes.map(c => ({ value: c._id, label: c.name })) : [],
            disableSearch: false,
        },
        {
            name: "studentSelect",
            label: "Select Student (Optional)",
            inputType: "select",
            resource: "users",
            apiFilters: { roles: "Student" },
            labelKey: ["studentSpecificField.admissionNumber|_id", "name"],
            valueKey: "_id",
            disableSearch: false,
            filter: {
                key: "classId",
                dependentField: "classId"
            }
        },
        {
            name: "receivedDate",
            label: "Received Date",
            inputType: "date",
            type: "date",
        },
    ];

    const returnFormFields = [
        {
            name: "receivedDate",
            label: "Returned Date",
            type: "date",
            inputType: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
            className: "md:col-span-2",
        }
    ];

    const bookColumns = useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex flex-col items-center gap-0.5">
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                    {selectedIds.length > 0 && (
                        <span className="text-[10px] font-bold text-primary leading-none">
                            {selectedIds.length}
                        </span>
                    )}
                </div>
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            meta: {
                width: "1px",
                padding: "0px 4px",
                textAlign: "center",
                className: "tight-column",
            },
        },
        {
            id: "serial",
            header: "Sl No",
            cell: ({ row, table }) => table.getSortedRowModel().rows.indexOf(row) + 1,
            meta: {
                width: "1px",
                whiteSpace: "nowrap",
                padding: "0px 8px",
                textAlign: "center",
                className: "tight-column",
                fontSize: "0.875rem",
            },
        },
        {
            accessorKey: "id",
            sortingFn: "alphanumeric",
            header: "Book ID",
            cell: ({ row }) => (
                <button
                    type="button"
                    className="font-bold text-primary hover:underline cursor-pointer bg-transparent border-none p-0 uppercase"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Select only this row
                        setRowSelection({ [row.id]: true });
                        // Open edit popup immediately
                        setEditPopupOpen(true);
                    }}
                >
                    {row.original.id}
                </button>
            ),
            meta: {
                width: "100px",
                whiteSpace: "nowrap",
                padding: "0px 8px",
                fontSize: "0.875rem",
            }
        },
        {
            accessorKey: "name",
            header: "Book Name",
            cell: ({ row }) => <span className="book-text-font">{row.getValue("name")}</span>,
            meta: {
                width: "200px",
                whiteSpace: "normal",
                fontSize: "0.875rem",
            }
        },
        {
            accessorKey: "author",
            header: "Author",
            cell: ({ row }) => <span className="uppercase book-text-font">{row.getValue("author")}</span>,
            meta: {
                width: "150px",
                whiteSpace: "normal",
                fontSize: "0.875rem",
            }
        },
        {
            accessorKey: "language",
            header: "Language",
            filterFn: (row, columnId, filterValue) => {
                if (!filterValue || filterValue.length === 0) return true;
                const rowValue = row.getValue(columnId);
                const filterArr = Array.isArray(filterValue) ? filterValue : [filterValue];
                return filterArr.some(val => String(val).toLowerCase() === String(rowValue).toLowerCase());
            },
            cell: ({ row }) => <span className="uppercase">{row.getValue("language")}</span>,
            meta: {
                width: "1%",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
            }
        },
        {
            accessorKey: "category",
            header: "Category",
            filterFn: (row, columnId, filterValue) => {
                if (!filterValue || filterValue.length === 0) return true;
                const rowValue = normalizeCategoryName(row.getValue(columnId));
                const filterArr = Array.isArray(filterValue) ? filterValue : [filterValue];
                return filterArr.some(val => normalizeCategoryName(val) === rowValue);
            },
            cell: ({ row }) => <span className="uppercase">{normalizeCategoryName(row.getValue("category"))}</span>,
            meta: {
                width: "1%",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
            }
        },
        {
            accessorKey: "publication",
            header: "Publication",
            cell: ({ row }) => <span className="uppercase book-text-font">{row.getValue("publication")}</span>,
            meta: {
                width: "120px",
                whiteSpace: "normal",
                fontSize: "0.875rem",
            }
        },
        {
            accessorKey: "price",
            header: "Price",
            meta: {
                width: "1%",
                whiteSpace: "nowrap",
                padding: "4px 4px",
                fontSize: "0.875rem",
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            filterFn: (row, columnId, filterValue) => {
                if (!filterValue || filterValue.length === 0) return true;
                const status = row.getValue(columnId);
                const displayStatus = (status === "Pending" || status === "Rented") ? "Rented" : (status || "Unknown");
                const filterArr = Array.isArray(filterValue) ? filterValue : [filterValue];
                return filterArr.includes(displayStatus) || filterArr.includes(status);
            },
            cell: ({ row }) => {
                const status = row.getValue("status");
                const displayStatus = (status === "Pending" || status === "Rented") ? "Rented" : (status || "Unknown");
                const color = displayStatus === "Available" ? "text-green-600" : "text-red-600";
                return <span className={`font-medium ${color}`}>{displayStatus}</span>;
            },
            meta: { padding: "4px 4px", fontSize: "0.875rem" }
        },
        ...(activeRole === "Librarian" ? [{
            id: "register",
            header: "Register",
            cell: ({ row }) => {
                const book = row.original;
                const isAvailable = book.status === "Available";
                return (
                    <Button
                        size="sm"
                        variant={isAvailable ? "default" : "outline"}
                        className={`h-7 px-2 text-xs font-semibold ${
                            isAvailable
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                : "text-muted-foreground cursor-not-allowed opacity-60"
                        }`}
                        disabled={!isAvailable}
                        title={isAvailable ? `Register rental for ${book.name}` : "Book is not available"}
                        onClick={(e) => {
                            e.stopPropagation();
                            setQuickRentalBook(book);
                        }}
                    >
                        Register
                    </Button>
                );
            },
            meta: {
                width: "90px",
                whiteSpace: "nowrap",
                padding: "4px 8px",
                className: "print:hidden",
            }
        }] : []),
        {
            id: "barcode",
            header: "Barcode",
            cell: ({ row }) => (
                <div className="flex flex-col items-center justify-center p-1 space-y-1">
                    {row.original.id && /^[\x20-\x7E]+$/.test(String(row.original.id)) ? (
                        <>
                            <ScanBarcode className="h-6 w-6 text-muted-foreground" />
                            <span className="font-mono text-[10px] uppercase tracking-widest">{row.original.id}</span>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground py-2">Invalid</span>
                    )}
                </div>
            ),
            meta: {
                width: "130px",
                padding: "2px",
            }
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [selectedIds.length]);

    const rentalColumns = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            meta: {
                width: "1px",
                padding: "0px 8px",
                textAlign: "center",
                verticalAlign: "middle",
                className: "tight-column",
            },
        },
        {
            id: "serial",
            header: "Sl No",
            cell: ({ row }) => row.index + 1,
            meta: {
                width: "1px",
                whiteSpace: "nowrap",
                padding: "0px 8px",
                textAlign: "center",
                verticalAlign: "middle",
                className: "tight-column",
            },
        },
        {
            accessorKey: "bookId.id",
            sortingFn: "alphanumeric",
            header: "Book ID",
            meta: {
                width: "1%",
                minWidth: "auto",
                whiteSpace: "nowrap",
                padding: "0px 8px",
                verticalAlign: "middle",
            }
        },
        {
            accessorKey: "bookId.name",
            header: "Book Name",
            cell: ({ row }) => <span className="book-text-font">{row.original.bookId?.name || "Unknown Book"}</span>,
            meta: {
                whiteSpace: "nowrap"
            }
        },
        {
            accessorKey: "studentId", // Accessing object populated by backend
            header: "Student Name (ID)",
            cell: ({ row }) => {
                // If studentId is populated (which it should be now), show Name (ID)
                // Fallback to name if it's just an ID string or simple object field if not populated correctly for some reason?
                // Backend sends object { _id: "...", name: "..." }
                const student = row.original.studentId;
                if (student && typeof student === 'object') {
                    return `${student.name || "Unknown"} (${student._id || "?"})`;
                }
                // Fallback for logic if not populated or old data
                return row.original.studentName || row.original.studentId || "Unknown";
            },
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
        {
            id: "batchClass",
            header: "Batch & Class",
            cell: ({ row }) => {
                const student = row.original.studentId;
                if (!student || typeof student !== 'object') return <span className="text-muted-foreground text-xs">–</span>;
                const batch = student.batchName;
                const cls = student.className;
                if (!batch && !cls) return <span className="text-muted-foreground text-xs">–</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        {batch && <span className="text-xs font-medium text-foreground">{batch}</span>}
                        {cls && <span className="text-[11px] text-muted-foreground">{cls}</span>}
                    </div>
                );
            },
            meta: {
                width: "1%",
                whiteSpace: "nowrap",
            }
        },
        {
            accessorKey: "rentedDate",
            header: "Rented On",
            cell: ({ row }) => row.original.rentedDate ? format(new Date(row.original.rentedDate), "PPP") : "-",
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
        {
            accessorKey: "receivedDate",
            header: "Returned On",
            cell: ({ row }) => {
                const rental = row.original;
                return rental.receivedDate ? (
                    format(new Date(rental.receivedDate), "PPP")
                ) : (
                    <span 
                        className="text-red-500 font-bold hover:underline cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setReturnBookRental(rental);
                        }}
                    >
                        Pending
                    </span>
                );
            },
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
    ];



    const filterConfig = [
        {
            id: "language",
            label: "Language",
            inputType: "multiSelect",
            options: dynamicLanguages.map((l) => ({ value: l, label: l })),
        },
        {
            id: "category",
            label: "Category",
            inputType: "multiSelect",
            options: dynamicCategories.map((c) => ({ value: c, label: c })),
        },
        {
            id: "status",
            label: "Status",
            inputType: "multiSelect",
            options: [
                { value: "Available", label: "Available" },
                { value: "Rented", label: "Rented" },
                { value: "Not Available", label: "Not Available" },
            ],
        },
    ];


    // --- Excel Export ---
    const handleExportExcel = () => {
        const headers = ["Book ID", "Book Name", "Author", "Language", "Category", "Publication", "Price", "Status"];
        const booksToExport = tableRef.current ? tableRef.current.getFilteredData() : localBooks;
        const rows = booksToExport.map(b => [
            b.id ?? "",
            b.name ?? "",
            b.author ?? "",
            b.language ?? "",
            b.category ?? "",
            b.publication ?? "",
            b.price ?? "",
            (b.status === "Pending" || b.status === "Rented") ? "Rented" : (b.status || "Available"),
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\r\n");

        let filterLabels = [];
        const filters = tableRef.current?.getFilters ? tableRef.current.getFilters() : [];
        if (filters && filters.length > 0) {
            filters.forEach(f => {
                if (['category', 'language', 'status'].includes(f.id) && f.value) {
                    filterLabels.push(String(f.value).replace(/[^a-zA-Z0-9]/g, '_'));
                }
            });
        }
        
        let filename = "books.csv";
        if (filterLabels.length > 0) {
            filename = `books_${filterLabels.join('_')}.csv`;
        }

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Print Logic ---
    const handlePrintBarcodes = useReactToPrint({
        contentRef: barcodeSheetRef,
        documentTitle: "Book Barcodes",
    });


    // --- Handlers ---

    const handleCreateBook = async (data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/library/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const json = await res.json();
                // Optimistic update: prepend new book to local list
                if (json.data) {
                    setLocalBooks(prev => [json.data, ...prev]);
                }
                toast.success("Book created successfully");
                router.refresh(); // Background sync
                return true;
            } else {
                const errorData = await res.json();
                toast.error(errorData.msg || "Failed to create book");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while creating the book");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBook = async (id, data) => {
        setLoading(true);
        // Optimistic update: patch the book in local list immediately
        setLocalBooks(prev => prev.map(b => b._id === id ? { ...b, ...data } : b));
        try {
            const res = await fetch("/api/library/books", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: id, ...data }),
            });
            if (res.ok) {
                toast.success("Book updated successfully");
                setEditPopupOpen(false);
                router.refresh(); // Background sync
                return true;
            } else {
                // Revert on failure
                setLocalBooks(initialBooks);
                const errorData = await res.json();
                toast.error(errorData.msg || "Failed to update book");
            }
        } catch (error) {
            setLocalBooks(initialBooks);
            console.error(error);
            toast.error("An error occurred while updating the book");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBook = (id) => {
        setConfirmDialog({
            open: true,
            title: "Delete Book",
            message: "Are you sure you want to delete this book?",
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/library/books?id=${id}`, { method: "DELETE" });
                    if (res.ok) router.refresh();
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleBulkDelete = () => {
        setConfirmDialog({
            open: true,
            title: "Delete Books",
            message: `Are you sure you want to delete ${selectedIds.length} books?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch(`/api/library/books?id=${id}`, { method: "DELETE" });
                    }
                    router.refresh();
                    setRowSelection({});
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleBulkMarkNotAvailable = () => {
        setConfirmDialog({
            open: true,
            title: "Mark Not Available",
            message: `Are you sure you want to mark ${selectedIds.length} books as Not Available?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch("/api/library/books", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ _id: id, status: "Not Available" }),
                        });
                    }
                    toast.success(`Marked ${selectedIds.length} books as Not Available`);
                    router.refresh();
                    setRowSelection({});
                } catch (error) {
                    toast.error("Failed to update status");
                } finally {
                    setLoading(false);
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleBulkMarkAvailable = () => {
        setConfirmDialog({
            open: true,
            title: "Mark Available",
            message: `Are you sure you want to mark ${selectedIds.length} books as Available?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch("/api/library/books", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ _id: id, status: "Available" }),
                        });
                    }
                    toast.success(`Marked ${selectedIds.length} books as Available`);
                    router.refresh();
                    setRowSelection({});
                } catch (error) {
                    toast.error("Failed to update status");
                } finally {
                    setLoading(false);
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleBulkDeleteRental = () => {
        const hasPending = selectedIds.some((id) => {
            const rental = initialRentals.find((r) => r._id === id);
            return rental && !rental.receivedDate;
        });

        if (hasPending) {
            setDeleteErrorPopupOpen(true);
            return;
        }

        setConfirmDialog({
            open: true,
            title: "Delete Rentals",
            message: `Are you sure you want to delete ${selectedIds.length} rentals?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch(`/api/rental?id=${id}`, { method: "DELETE" });
                    }
                    router.refresh();
                    setRowSelection({});
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleBulkReturn = () => {
        setConfirmDialog({
            open: true,
            title: "Return Items",
            message: `Are you sure you want to return ${selectedIds.length} items?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch("/api/rental", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ _id: id, receivedDate: new Date() }),
                        });
                    }
                    router.refresh();
                    setRowSelection({});
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleCreateRental = async (data) => {
        setLoading(true);
        // Needed: Student Name. PopupForm returns ID if using resource.
        // If resource is used, we might need to fetch the name or rely on the backend to populate it?
        // The backend logic I wrote just saves the body.
        // I should probably enhance the backend to fetch student name if rental schema requires it AND it's not passed,
        // OR I can try to find the selected option label in the form values? PopupForm passes values.
        // For now, I will let the backend or simplifier handle it. 
        // Wait, Schema has `studentName`. If I don't send it, it will be null.
        // I will assume for now we might need to update API to fetch name, or just store ID.
        // Let's rely on ID for now and updated API later if needed.

        if (data.studentSelect && !data.studentId) {
            data.studentId = data.studentSelect;
        }

        if (!data.studentId) {
            toast.error("Please provide a Student ID or select a Student");
            setLoading(false);
            return false;
        }

        try {
            const res = await fetch("/api/rental", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                toast.success("Rental created successfully");
                router.refresh();
                return true;
            } else {
                const errorData = await res.json();
                toast.error(errorData.msg || "Failed to create rental");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while creating the rental");
        } finally {
            setLoading(false);
        }
    };

    const handleReturnBook = async (rental) => {
        // Set receivedDate to today
        setLoading(true);
        try {
            const res = await fetch("/api/rental", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: rental._id, receivedDate: new Date() }),
            });
            if (res.ok) {
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveReturnBook = async (rentalId, data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/rental", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: rentalId, receivedDate: data.receivedDate }),
            });
            if (res.ok) {
                toast.success("Book returned successfully");
                setStudentHistory(prev => prev.map(r => r._id === rentalId ? { ...r, receivedDate: data.receivedDate } : r));
                setBookHistory(prev => prev.map(r => r._id === rentalId ? { ...r, receivedDate: data.receivedDate } : r));
                router.refresh();
                return true;
            } else {
                toast.error("Failed to return book");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error returning book");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRental = async (data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/rental", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: selectedRental._id, ...data }),
            });
            if (res.ok) {
                router.refresh();
                setRowSelection({}); // Clear selection after update
                return true;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRental = (id) => {
        const rental = initialRentals.find((r) => r._id === id);
        if (rental && !rental.receivedDate) {
            setDeleteErrorPopupOpen(true);
            return;
        }

        setConfirmDialog({
            open: true,
            title: "Delete Rental",
            message: "Are you sure you want to delete this rental?",
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/rental?id=${id}`, { method: "DELETE" });
                    if (res.ok) router.refresh();
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    // --- Lookup Handlers ---

    const handleStudentLookup = async (e, directId) => {
        if (e && e.key && e.key !== 'Enter') return;
        const id = directId || studentSearchId;
        if (!id) return;

        setLookupLoading(true);
        try {
            // First fetch student details
            const userRes = await fetch(`/api/users?_id=${id}`);
            const userData = await userRes.json();

            if (userData.users && userData.users.length > 0) {
                const student = userData.users[0];
                setLookupStudent(student);

                // Then fetch rental history
                const rentalRes = await fetch(`/api/rental?studentId=${student._id}`);
                const rentalData = await rentalRes.json();
                setStudentHistory(rentalData.data || []);

                setStudentPopupOpen(true);
                setStudentSearchId(""); // Clear input
            } else {
                toast.error("Student not found");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch student data");
        } finally {
            setLookupLoading(false);
        }
    };

    const handleBookLookup = async (e, directId) => {
        if (e && e.key && e.key !== 'Enter') return;
        const id = directId || bookSearchId;
        if (!id) return;

        setLookupLoading(true);
        try {
            // Find book by number
            const bookRes = await fetch(`/api/library/books?number=${encodeURIComponent(id.trim())}`);
            const bookData = await bookRes.json();
            const book = bookData.data && bookData.data.length > 0 ? bookData.data[0] : null;

            if (book) {
                setLookupBook(book);

                // Fetch rental history for this book
                const rentalRes = await fetch(`/api/rental?bookId=${book._id}`);
                const rentalData = await rentalRes.json();
                setBookHistory(rentalData.data || []);

                setBookPopupOpen(true);
                setBookSearchId(""); // Clear input
            } else {
                toast.error("Book not found");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch book data");
        } finally {
            setLookupLoading(false);
        }
    };

    // --- Views ---

    const renderConfirmDialog = () => (
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
            <DialogContent className="sm:max-w-md text-center">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold">
                        {confirmDialog.title}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-6 text-center">
                    <p className="text-muted-foreground text-lg">{confirmDialog.message}</p>
                </div>
                <div className="flex justify-center gap-4 pb-2">
                    <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} disabled={loading} className="w-24">
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => {
                        if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                    }} disabled={loading} className="w-24">
                        {loading ? "..." : "Confirm"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );

    if (view === "dashboard") {
        return (
            <div className="space-y-6">
                <Header title="LIBRARY DASHBOARD" subTitle="Overview of library stats" />

                {/* Lookup Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-primary/20 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <IdCard className="h-4 w-4 text-primary" />
                                STUDENT LOOKUP
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Enter Student ID..."
                                        className="pl-10"
                                        value={studentSearchId}
                                        onChange={(e) => setStudentSearchId(e.target.value)}
                                        onKeyDown={handleStudentLookup}
                                        disabled={lookupLoading}
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant={studentSearchId ? "default" : "outline"}
                                    onClick={() => studentSearchId ? handleStudentLookup() : setShowStudentScanner(true)}
                                    disabled={lookupLoading}
                                    className={!studentSearchId ? "bg-foreground text-background hover:bg-foreground/90 border-none" : "px-3 w-auto"}
                                >
                                    {lookupLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : studentSearchId ? (
                                        <Search className="h-4 w-4 sm:mr-2" />
                                    ) : (
                                        <ScanBarcode className="h-4 w-4" />
                                    )}
                                    {studentSearchId && <span className="hidden sm:inline">Search</span>}
                                </Button>
                            </div>

                            <Dialog open={showStudentScanner} onOpenChange={setShowStudentScanner}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Scan Student Card</DialogTitle>
                                    </DialogHeader>
                                    <BarcodeScanner
                                        onScan={(result) => {
                                            setStudentSearchId(result);
                                            setShowStudentScanner(false);
                                            handleStudentLookup(null, result);
                                        }}
                                        onClose={() => setShowStudentScanner(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <BookIcon className="h-4 w-4 text-primary" />
                                BOOK LOOKUP
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Enter Book ID..."
                                        className="pl-10"
                                        value={bookSearchId}
                                        onChange={(e) => setBookSearchId(e.target.value)}
                                        onKeyDown={handleBookLookup}
                                        disabled={lookupLoading}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant={bookSearchId ? "default" : "outline"}
                                    onClick={() => bookSearchId ? handleBookLookup() : setShowBookScanner(true)}
                                    disabled={lookupLoading}
                                    className={!bookSearchId ? "bg-foreground text-background hover:bg-foreground/90 border-none" : "px-3 w-auto"}
                                >
                                    {lookupLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : bookSearchId ? (
                                        <Search className="h-4 w-4 sm:mr-2" />
                                    ) : (
                                        <ScanBarcode className="h-4 w-4" />
                                    )}
                                    {bookSearchId && <span className="hidden sm:inline">Search</span>}
                                </Button>
                            </div>

                            <Dialog open={showBookScanner} onOpenChange={setShowBookScanner}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Scan Book Barcode</DialogTitle>
                                    </DialogHeader>
                                    <BarcodeScanner
                                        onScan={(result) => {
                                            setBookSearchId(result);
                                            setShowBookScanner(false);
                                            handleBookLookup(null, result);
                                        }}
                                        onClose={() => setShowBookScanner(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </div >

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setTotalBooksPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                            <Book className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{initialBooks.length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setAvailableBooksPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Available Books</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{initialBooks.filter(b => b.status === "Available").length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setPendingRentalsPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Books</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{initialPendingRentals.length || 0}</div>
                        </CardContent>
                    </Card>

                    <Card

                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setCategoriesPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Categories</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{uniqueCategories.length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setLanguagesPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Languages</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{uniqueLanguages.length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98] relative"
                        onClick={() => { fetchRequests(); setRequestsPopupOpen(true); }}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                Book Requests
                                {pendingRequestsCount > 0 && (
                                    <span className="inline-flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full w-4 h-4">
                                        {pendingRequestsCount}
                                    </span>
                                )}
                            </CardTitle>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{localRequests.length}</div>
                            {pendingRequestsCount > 0 && (
                                <p className="text-xs text-destructive font-medium mt-1">{pendingRequestsCount} pending</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BestReaderCard />
                    <MostReadBookCard />
                </div>

                {/* Student Popup */}
                <Dialog open={studentPopupOpen} onOpenChange={setStudentPopupOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Student Library Profile</DialogTitle>
                        </DialogHeader>
                        {lookupStudent && (
                            <div className="space-y-6 py-4">
                                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                                    <Avatar className="h-32 w-32 border-4 border-primary/10">
                                        <AvatarImage src={lookupStudent.profilePic?.url} />
                                        <AvatarFallback className="text-2xl">{lookupStudent.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-2 flex-1">
                                        <h2 className="text-2xl font-bold text-primary">{lookupStudent.name}</h2>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-medium">Student ID: <span className="text-muted-foreground">{lookupStudent._id}</span></div>
                                            {lookupStudent.className && (
                                                <div className="text-sm font-medium">Class: <span className="text-muted-foreground">{lookupStudent.className}</span></div>
                                            )}
                                            <div className="text-sm font-medium">Batch: <span className="text-muted-foreground">{lookupStudent.batchName || "N/A"}</span></div>
                                            <div className="text-sm font-medium">Status: <span className={`font-bold ${lookupStudent.studentStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`}>{lookupStudent.studentStatus || "N/A"}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        Rental History
                                    </h3>
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Book ID</TableHead>
                                                    <TableHead>Book Name</TableHead>
                                                    <TableHead>Rented Date</TableHead>
                                                    <TableHead>Returned Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {studentHistory.length > 0 ? (
                                                    studentHistory.map((rental) => (
                                                        <TableRow key={rental._id}>
                                                            <TableCell className="font-medium">{rental.bookId?.id}</TableCell>
                                                            <TableCell className="book-text-font">{rental.bookId?.name}</TableCell>
                                                            <TableCell>{rental.rentedDate ? format(new Date(rental.rentedDate), "PP") : "-"}</TableCell>
                                                            <TableCell>
                                                                {rental.receivedDate ? (
                                                                    <span className="text-green-600 font-medium">
                                                                        {format(new Date(rental.receivedDate), "PP")}
                                                                    </span>
                                                                ) : (
                                                                    <span 
                                                                        className="text-red-500 font-bold hover:underline cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setReturnBookRental(rental);
                                                                        }}
                                                                    >
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                            No rental history found
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Book Popup */}
                <Dialog open={bookPopupOpen} onOpenChange={setBookPopupOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Book Details & History</DialogTitle>
                        </DialogHeader>
                        {lookupBook && (
                            <div className="space-y-6 py-4">
                                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                    <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex items-center justify-center">
                                        <BookIcon className="h-24 w-24 text-primary" />
                                    </div>
                                    <div className="space-y-1 flex-1 text-center md:text-left">
                                        <h2 className="text-2xl font-bold text-primary book-text-font">{lookupBook.name}</h2>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-medium">Book ID: <span className="text-muted-foreground font-bold">{lookupBook.id}</span></div>
                                            <div className="text-sm font-medium">Author: <span className="text-muted-foreground uppercase book-text-font">{lookupBook.author}</span></div>
                                            <div className="text-sm font-medium">Category: <span className="text-muted-foreground">{lookupBook.category}</span></div>
                                            <div className="text-sm font-medium">Language: <span className="text-muted-foreground">{lookupBook.language}</span></div>
                                            <div className="text-sm font-medium">Status:
                                                <span className={`ml-1 font-bold ${lookupBook.status === 'Available' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {lookupBook.status || 'Available'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        Rental History (Students)
                                    </h3>
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Student ID</TableHead>
                                                    <TableHead>Student Name</TableHead>
                                                    <TableHead>Rented Date</TableHead>
                                                    <TableHead>Returned Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bookHistory.length > 0 ? (
                                                    bookHistory.map((rental) => (
                                                        <TableRow key={rental._id}>
                                                            <TableCell className="font-medium">{rental.studentId?._id || rental.studentId}</TableCell>
                                                            <TableCell>{rental.studentId?.name || rental.studentName || "Unknown"}</TableCell>
                                                            <TableCell>{rental.rentedDate ? format(new Date(rental.rentedDate), "PP") : "-"}</TableCell>
                                                            <TableCell>
                                                                {rental.receivedDate ? (
                                                                    <span className="text-green-600 font-medium">
                                                                        {format(new Date(rental.receivedDate), "PP")}
                                                                    </span>
                                                                ) : (
                                                                    <span 
                                                                        className="text-red-500 font-bold hover:underline cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setReturnBookRental(rental);
                                                                        }}
                                                                    >
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                            No rental history found for this book
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Pending Rentals Popup */}
                <Dialog open={pendingRentalsPopupOpen} onOpenChange={setPendingRentalsPopupOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Pending Books (Currently Rented)</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Book ID</TableHead>
                                        <TableHead>Book Name</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Rented Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialPendingRentals.length > 0 ? (
                                        initialPendingRentals.map((rental, index) => (
                                            <TableRow key={rental._id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-medium">{rental.bookId?.id}</TableCell>
                                                <TableCell className="book-text-font">{rental.bookId?.name}</TableCell>
                                                <TableCell className="book-text-font">{rental.studentId?.name || rental.studentName}</TableCell>
                                                <TableCell>{rental.rentedDate ? format(new Date(rental.rentedDate), "PP") : "-"}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No pending books
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Book Requests Popup */}
                <Dialog open={requestsPopupOpen} onOpenChange={setRequestsPopupOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                Book Requests
                                {pendingRequestsCount > 0 && (
                                    <span className="text-xs font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
                                        {pendingRequestsCount} pending
                                    </span>
                                )}
                            </DialogTitle>
                        </DialogHeader>
                        {requestsLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                        ) : localRequests.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12">No book requests found.</div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[30px] text-center">#</TableHead>
                                            <TableHead>Book Details</TableHead>
                                            <TableHead>Student Details</TableHead>
                                            <TableHead>Requested On</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {localRequests.map((req, i) => (
                                            <TableRow key={req._id}>
                                                <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm book-text-font">{req.bookId?.name || "N/A"}</span>
                                                        <span className="text-xs text-muted-foreground">ID: {req.bookId?.id || "N/A"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm">{req.studentId?.name || "N/A"}</span>
                                                        <span className="text-xs text-muted-foreground">ID: {req.studentId?._id || "N/A"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {req.createdAt ? format(new Date(req.createdAt), "PPP") : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        req.status === "Pending"
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                            : req.status === "Approved"
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {req.status === "Pending" && (
                                                        <div className="flex gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                                                onClick={() => {
                                                                    setSelectedRequest(req);
                                                                    setRentalFromRequestOpen(true);
                                                                }}
                                                            >
                                                                <Check className="h-3 w-3 mr-1" /> Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => handleRejectRequest(req._id)}
                                                            >
                                                                <X className="h-3 w-3 mr-1" /> Reject
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approve Request → Create Rental popup */}
                {rentalFromRequestOpen && selectedRequest && (
                    <PopupForm
                        title="Process Rental"
                        description={`Creating rental for ${selectedRequest.studentId?.name} — ${selectedRequest.bookId?.name}`}
                        formFields={[
                            {
                                name: "bookId",
                                label: "Book ID",
                                inputType: "async-text",
                                asyncProps: {
                                    endpoint: "/api/library/books",
                                    queryKey: "number",
                                    displayKey: "name",
                                    responseKey: "data"
                                },
                                required: true,
                                enableScanner: true,
                                defaultValue: selectedRequest.bookId?.id,
                            },
                            {
                                name: "studentId",
                                label: "Student ID",
                                inputType: "async-text",
                                asyncProps: {
                                    endpoint: "/api/users",
                                    queryKey: "_id",
                                    displayKey: "name",
                                    responseKey: "users"
                                },
                                required: true,
                                enableScanner: true,
                                defaultValue: selectedRequest.studentId?._id,
                            },
                            {
                                name: "rentedDate",
                                label: "Rented Date",
                                inputType: "date",
                                type: "date",
                                required: true,
                                defaultValue: new Date().toISOString().split("T")[0],
                            },
                        ]}
                        data={{
                            bookId: selectedRequest.bookId?.id,
                            studentId: selectedRequest.studentId?._id,
                            rentedDate: new Date().toISOString().split("T")[0],
                        }}
                        open={rentalFromRequestOpen}
                        onOpenChange={setRentalFromRequestOpen}
                        onSubmit={handleApproveRequest}
                        hideButton={true}
                        loading={loading}
                    />
                )}

                {/* Categories Popup */}
                <Dialog open={categoriesPopupOpen} onOpenChange={setCategoriesPopupOpen}>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Books by Category</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Books Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {uniqueCategories.length > 0 ? (
                                        uniqueCategories.map((cat, index) => (
                                            <TableRow key={cat.category}>
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="font-bold text-primary">{cat.prefix}</TableCell>
                                                <TableCell className="font-bold uppercase">{cat.category}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-bold">
                                                        {cat.count}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No categories found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Languages Popup */}
                <Dialog open={languagesPopupOpen} onOpenChange={setLanguagesPopupOpen}>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Books by Language</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Language</TableHead>
                                        <TableHead className="text-right">Books Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {uniqueLanguages.length > 0 ? (
                                        uniqueLanguages.map((lang, index) => (
                                            <TableRow key={lang.language}>
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="font-bold uppercase">{lang.language}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-bold">
                                                        {lang.count}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No languages found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Total Books Popup */}
                <Dialog open={totalBooksPopupOpen} onOpenChange={setTotalBooksPopupOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Total Books Inventory</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Book ID</TableHead>
                                        <TableHead>Book Name</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialBooks.length > 0 ? (
                                        initialBooks.map((book, index) => (
                                            <TableRow key={book._id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-medium text-primary">{book.id}</TableCell>
                                                <TableCell className="book-text-font">{book.name}</TableCell>
                                                <TableCell className="uppercase book-text-font">{book.author}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${book.status === 'Available' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                        {book.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No books available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Available Books Popup */}
                <Dialog open={availableBooksPopupOpen} onOpenChange={setAvailableBooksPopupOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Available Books</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Book ID</TableHead>
                                        <TableHead>Book Name</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Category</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialBooks.filter(b => b.status === "Available").length > 0 ? (
                                        initialBooks.filter(b => b.status === "Available").map((book, index) => (
                                            <TableRow key={book._id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-medium text-primary">{book.id}</TableCell>
                                                <TableCell className="book-text-font">{book.name}</TableCell>
                                                <TableCell className="uppercase book-text-font">{book.author}</TableCell>
                                                <TableCell>{book.category}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No books available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
                {renderConfirmDialog()}
                {returnBookRental && (
                    <PopupForm
                        title="Return Book"
                        description="Select the returned date"
                        formFields={returnFormFields}
                        data={returnBookRental}
                        open={!!returnBookRental}
                        onOpenChange={(open) => !open && setReturnBookRental(null)}
                        onSubmit={async (data) => {
                            const success = await handleSaveReturnBook(returnBookRental._id, data);
                            if (success) setReturnBookRental(null);
                            return success;
                        }}
                        hideButton={true}
                        className="sm:max-w-[250px]"
                        submitButtonClass="w-full"
                        buttonContainerClass="md:col-span-2"
                    />
                )}
            </div>
        );
    }

    if (view === "books") {
        return (
            <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Header
                        title="BOOKS MANAGEMENT"
                        subTitle="Manage library books inventory"
                    />
                </div>
                <TableComponent
                    ref={tableRef}
                    data={localBooks}
                    columnsConfig={bookColumns}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(originalRow) => originalRow._id}
                    filterConfig={filterConfig}
                    onFiltersChange={setActiveFilters}
                    enableGrid={true}
                    showTotalCount={true}
                    totalCountLabel="TOTAL NUMBER OF BOOKS"
                    searchPlaceholder="Search Book (Name, ID)..."
                    printTitle="LIBRARY BOOKS"
                    apiKey={apiKey}
                    renderGridItem={(row) => {
                        const book = row.original;
                        return (
                            <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                                <CardContent className="p-4 flex gap-4 items-start">
                                    <div className="flex-shrink-0 flex flex-col items-center gap-2 w-28">
                                        <div className="bg-primary/10 p-3 rounded-md flex items-center justify-center h-24 w-24">
                                            <BookOpen className="h-10 w-10 text-primary" />
                                        </div>
                                        <div className="text-center w-full space-y-1">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 py-0.5 rounded">ID: {book.id}</div>
                                            <div className="flex justify-center items-center w-full h-[38px] overflow-hidden bg-white rounded p-1 border border-border/50 shadow-sm">
                                                {book.id && /^[\x20-\x7E]+$/.test(String(book.id)) ? (
                                                    <Barcode
                                                        value={String(book.id)}
                                                        width={0.8}
                                                        height={22}
                                                        fontSize={0}
                                                        margin={0}
                                                        displayValue={false}
                                                        background="transparent"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Invalid</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1 min-w-0 py-1 flex flex-col h-full">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg leading-tight break-words mb-1" title={book.name}>{book.name}</h3>
                                            <div className="text-sm text-muted-foreground break-words" title={book.author}>Author: <span className="text-foreground font-medium">{book.author}</span></div>
                                            {book.publication && <div className="text-sm text-muted-foreground break-words" title={book.publication}>Publication: <span className="text-foreground">{book.publication}</span></div>}
                                            <div className="text-sm text-muted-foreground">Language: <span className="text-foreground">{book.language}</span></div>
                                            <div className="text-sm text-muted-foreground">Category: <span className="text-foreground">{book.category}</span></div>
                                        </div>

                                        <div className="pt-1 flex flex-col items-start gap-1 mt-auto">
                                            <div className="font-bold text-sm text-primary">₹{book.price?.toFixed(2) || "0.00"}</div>
                                            <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${book.status === 'Available' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                                {(book.status === 'Pending' || book.status === 'Rented') ? 'Rented' : (book.status || "Unknown")}
                                            </div>
                                            {activeRole === "Librarian" && (
                                                <Button
                                                    size="sm"
                                                    variant={book.status === 'Available' ? "default" : "outline"}
                                                    className={`w-full mt-1 h-7 text-xs font-semibold ${
                                                        book.status === 'Available'
                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                                            : "text-muted-foreground cursor-not-allowed opacity-60"
                                                    }`}
                                                    disabled={book.status !== 'Available'}
                                                    title={book.status === 'Available' ? `Register rental for ${book.name}` : "Book is not available"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setQuickRentalBook(book);
                                                    }}
                                                >
                                                    Register Rental
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    }}
                    actionButtons={
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                        title={`Delete (${selectedIds.length})`}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkMarkAvailable}
                                        title={`Mark Available (${selectedIds.length})`}
                                        className="h-8 w-8 p-0 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 dark:text-green-400 dark:border-green-700"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkMarkNotAvailable}
                                        title={`Mark Not Available (${selectedIds.length})`}
                                        className="h-8 w-8 p-0 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:text-red-400 dark:border-red-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                            {/* Always render Edit PopupForm (kept mounted) so it opens instantly */}
                            <div className={!selectedBook ? "hidden" : ""}>
                                <PopupForm
                                    title="Edit Book"
                                    formFields={bookFields}
                                    data={selectedBook || undefined}
                                    onSubmit={(data) => handleUpdateBook(selectedBook?._id, data)}
                                    loading={loading}
                                    open={editPopupOpen && !!selectedBook}
                                    onOpenChange={(open) => {
                                        if (!open || selectedBook) setEditPopupOpen(open);
                                    }}
                                    trigger={
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            title="Edit Book"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                            </div>
                            {duplicateIdGroups.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDuplicateIdsOpen(true)}
                                    className="relative h-8 px-2 md:px-3 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:text-red-400 dark:border-red-700"
                                    title={`${duplicateIdGroups.length} duplicate ID(s) found`}
                                >
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="hidden md:inline ml-1">Duplicate IDs</span>
                                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4">
                                        {duplicateIdGroups.length}
                                    </span>
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportExcel}
                                className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950 dark:text-green-400 dark:border-green-700 h-8 w-8 p-0 md:w-auto md:px-3"
                                title="Export Excel"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                <span className="hidden md:inline">Excel</span>
                            </Button>
                            <PopupForm
                                title="Add New Book"
                                formFields={bookFields}
                                onSubmit={handleCreateBook}
                                loading={loading}
                                triggerText="Add"
                                triggerVariant="default"
                                triggerClass="hidden md:flex items-center gap-1 h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white border-none"
                            />
                            <PopupForm
                                title="Add New Book"
                                formFields={bookFields}
                                onSubmit={handleCreateBook}
                                loading={loading}
                                triggerVariant="default"
                                triggerClass="flex md:hidden h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white border-none"
                            />
                        </div>
                    }
                />
                <BarcodeSheet ref={barcodeSheetRef} books={localBooks.filter(b => selectedIds.includes(b._id))} />

                {/* Duplicate IDs Dialog */}
                <Dialog open={duplicateIdsOpen} onOpenChange={setDuplicateIdsOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="h-5 w-5" />
                                    Duplicate Book IDs ({duplicateIdGroups.length} group{duplicateIdGroups.length !== 1 ? "s" : ""})
                                </DialogTitle>
                                {duplicateIdGroups.some(g => g.isSafe) && (
                                    <Button
                                        size="sm"
                                        disabled={loading}
                                        className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold"
                                        onClick={handleMergeAllSafe}
                                    >
                                        {loading ? "Merging…" : `Merge All Safe (${duplicateIdGroups.filter(g => g.isSafe).length} group${duplicateIdGroups.filter(g => g.isSafe).length > 1 ? "s" : ""})`}
                                    </Button>
                                )}
                            </div>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                            {duplicateIdGroups.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No duplicate IDs found.</p>
                            ) : (
                                duplicateIdGroups.map(({ id, books, isSafe }) => (
                                    <div key={id} className={`rounded-md border overflow-hidden ${isSafe ? "border-amber-200 dark:border-amber-900" : "border-red-200 dark:border-red-900"}`}>
                                        <div className={`px-4 py-2 flex items-center gap-2 justify-between ${isSafe ? "bg-amber-50 dark:bg-amber-950/40" : "bg-red-50 dark:bg-red-950/40"}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold uppercase tracking-widest text-sm ${isSafe ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}>ID: {id}</span>
                                                <span className={`text-xs rounded-full px-2 py-0.5 font-bold text-white ${isSafe ? "bg-amber-500" : "bg-red-500"}`}>{books.length} books</span>
                                                {isSafe ? (
                                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">✓ Same content — safe to merge</span>
                                                ) : (
                                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Conflicting content — resolve manually</span>
                                                )}
                                            </div>
                                            {isSafe && (
                                                <Button
                                                    size="sm"
                                                    disabled={loading}
                                                    className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                                    onClick={() => handleMergeDuplicates(books)}
                                                >
                                                    {loading ? "Merging…" : `Merge (keep 1, delete ${books.length - 1})`}
                                                </Button>
                                            )}
                                        </div>
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="text-xs">Book Name</TableHead>
                                                    <TableHead className="text-xs">Author</TableHead>
                                                    <TableHead className="text-xs">Language</TableHead>
                                                    <TableHead className="text-xs">Category</TableHead>
                                                    <TableHead className="text-xs">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {books.map((book, idx) => (
                                                    <TableRow key={book._id} className={`text-sm ${isSafe && idx > 0 ? "opacity-50" : ""}`}>
                                                        <TableCell className="book-text-font font-medium">
                                                            {isSafe && idx === 0 && <span className="mr-1 text-[10px] bg-emerald-100 text-emerald-700 rounded px-1 font-bold">KEEP</span>}
                                                            {isSafe && idx > 0 && <span className="mr-1 text-[10px] bg-red-100 text-red-600 rounded px-1 font-bold">DEL</span>}
                                                            {book.name}
                                                        </TableCell>
                                                        <TableCell className="book-text-font uppercase text-muted-foreground">{book.author}</TableCell>
                                                        <TableCell className="uppercase text-muted-foreground">{book.language}</TableCell>
                                                        <TableCell className="uppercase text-muted-foreground">{normalizeCategoryName(book.category)}</TableCell>
                                                        <TableCell>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${book.status === "Available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                                {(book.status === "Pending" || book.status === "Rented") ? "Rented" : (book.status || "Unknown")}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {renderConfirmDialog()}
                {/* Quick Rental Popup — triggered from Register button in book row/card */}
                {quickRentalBook && (
                    <PopupForm
                        title="New Rental"
                        description={`Registering rental for: ${quickRentalBook.name} (ID: ${quickRentalBook.id})`}
                        formFields={[
                            {
                                name: "bookId",
                                label: "Book ID",
                                inputType: "async-text",
                                asyncProps: {
                                    endpoint: "/api/library/books",
                                    queryKey: "number",
                                    displayKey: "name",
                                    responseKey: "data"
                                },
                                required: true,
                                enableScanner: true,
                                defaultValue: quickRentalBook.id,
                            },
                            {
                                name: "studentId",
                                label: "Student ID",
                                inputType: "async-text",
                                asyncProps: {
                                    endpoint: "/api/users",
                                    queryKey: "_id",
                                    displayKey: "name",
                                    responseKey: "users"
                                },
                                required: true,
                                enableScanner: true,
                                autoFocus: true,
                            },
                            {
                                name: "rentedDate",
                                label: "Rented Date",
                                inputType: "date",
                                type: "date",
                                required: true,
                                defaultValue: new Date().toISOString().split("T")[0],
                            },
                            {
                                name: "receivedDate",
                                label: "Received Date",
                                inputType: "date",
                                type: "date",
                            },
                        ]}
                        data={{ bookId: quickRentalBook.id }}
                        open={!!quickRentalBook}
                        onOpenChange={(open) => !open && setQuickRentalBook(null)}
                        onSubmit={async (data) => {
                            const success = await handleCreateRental(data);
                            if (success) setQuickRentalBook(null);
                            return success;
                        }}
                        hideButton={true}
                        loading={loading}
                    />
                )}
            </div>
        );
    }

    if (view === "rentals") {
        return (
            <div className="space-y-2">
                <Header
                    title="RENTALS MANAGEMENT"
                    subTitle="Track book rentals"
                />
                <TableComponent
                    ref={tableRef}
                    data={initialRentals}
                    columnsConfig={rentalColumns}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(originalRow) => originalRow._id}
                    onFiltersChange={setActiveFilters}
                    showCsvBtn={true}
                    actionButtons={
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <>
                                    {selectedRental && (
                                        <PopupForm
                                            title="Edit Rental"
                                            formFields={rentalFields}
                                            data={{
                                                ...selectedRental,
                                                bookId: selectedRental.bookId?.id || selectedRental.bookId,
                                                studentId: selectedRental.studentId?._id || selectedRental.studentId,
                                            }}
                                            onSubmit={handleUpdateRental}
                                            loading={loading}
                                        />
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkReturn}
                                    >
                                        Return ({selectedIds.length})
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleBulkDeleteRental}
                                    >
                                        Delete ({selectedIds.length})
                                    </Button>
                                </>
                            )}
                            <PopupForm
                                title="New Rental"
                                formFields={rentalFields}
                                onSubmit={handleCreateRental}
                                loading={loading}
                                triggerText="New Rental"
                                triggerClass="bg-primary hover:bg-primary/90 text-primary-foreground"
                                className="sm:max-w-3xl"
                            />
                        </div>
                    }
                />
                
                <Dialog open={deleteErrorPopupOpen} onOpenChange={setDeleteErrorPopupOpen}>
                    <DialogContent className="sm:max-w-md text-center border-red-500/20">
                        <DialogHeader>
                            <DialogTitle className="text-red-500 flex items-center justify-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Action Prevented
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-6 text-center">
                            <p className="text-muted-foreground text-lg">
                                Pending books can not be deleted.
                            </p>
                        </div>
                        <div className="flex justify-center pb-2">
                            <Button variant="outline" onClick={() => setDeleteErrorPopupOpen(false)} className="w-24">
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
                {renderConfirmDialog()}
                {returnBookRental && (
                    <PopupForm
                        title="Return Book"
                        description="Select the returned date"
                        formFields={returnFormFields}
                        data={returnBookRental}
                        open={!!returnBookRental}
                        onOpenChange={(open) => !open && setReturnBookRental(null)}
                        onSubmit={async (data) => {
                            const success = await handleSaveReturnBook(returnBookRental._id, data);
                            if (success) setReturnBookRental(null);
                            return success;
                        }}
                        hideButton={true}
                        className="sm:max-w-[250px]"
                        submitButtonClass="w-full"
                        buttonContainerClass="md:col-span-2"
                    />
                )}
            </div>
        );
    }

    return <div>Invalid View</div>;
}
