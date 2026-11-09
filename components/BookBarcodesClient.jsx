"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import PopupFilter from "@/components/PopupFilter";
import {
    Search,
    Printer,
    X,
    CheckSquare,
    Square,
    ArrowDownWideNarrow,
    ArrowDownAZ,
    CalendarDays,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QRCodeCanvas } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download } from "lucide-react";

// ── Malayalam detection ──────────────────────────────────────────────────────────
const isMalayalam = (text) => /[\u0D00-\u0D7F]/.test(text);

// ── Arabic detection ─────────────────────────────────────────────────────────────
const isArabic = (text) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

// ── Print-only sheet ───────────────────────────────────────────────────────────
const PrintSheet = React.forwardRef(({ books }, ref) => (
    <div ref={ref} className="p-4 bg-white text-black hidden print:block">
        <div className="grid grid-cols-5 gap-x-1 gap-y-0">
            {books.map((book) => (
                <div
                    key={book._id}
                    className="border px-1 pt-0.5 pb-0 flex flex-col items-center justify-center break-inside-avoid h-[2.1cm]"
                >
                    <div className="text-[11px] font-bold uppercase tracking-wider leading-none mb-0.5">
                        {book.id}
                    </div>
                    <div className="flex justify-center bg-white">
                        {book.id && /^[\x20-\x7E]+$/.test(String(book.id)) ? (
                            <Barcode
                                value={String(book.id)}
                                width={1.0}
                                height={40}
                                fontSize={10}
                                margin={0}
                                displayValue={false}
                            />
                        ) : (
                            <span className="text-xs text-gray-400 py-2">Invalid</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
));
PrintSheet.displayName = "PrintSheet";


// ── Helpers ────────────────────────────────────────────────────────────────────
const sortBooks = (books) =>
    [...books].sort((a, b) =>
        String(a.id || "").localeCompare(String(b.id || ""), undefined, {
            numeric: true,
            sensitivity: "base",
        })
    );

const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();

// ── Main component ─────────────────────────────────────────────────────────────
export default function BookBarcodesClient({ initialBooks = [] }) {
    const [sortView, setSortView] = useState("name");
    const [qrUrl, setQrUrl] = useState("https://www.scofist.com/library");

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            setQrUrl(`${window.location.origin}/library`);
        }
    }, []);

    const books = useMemo(() => {
        if (sortView === "date") {
            return [...initialBooks].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }
        return sortBooks(initialBooks);
    }, [initialBooks, sortView]);

    // Derived filter options
    const languages = useMemo(
        () => uniq(books.map((b) => b.language?.toUpperCase())),
        [books]
    );
    const categories = useMemo(
        () => uniq(books.map((b) => b.category?.toUpperCase())),
        [books]
    );

    // ── Filter state (PopupFilter-compatible) ──
    const [columnFilters, setColumnFilters] = useState([]);

    const setFilter = useCallback((id, value) => {
        setColumnFilters((prev) => {
            const existing = prev.find((f) => f.id === id);
            if (existing) return prev.map((f) => (f.id === id ? { ...f, value } : f));
            return [...prev, { id, value }];
        });
    }, []);

    const removeFilter = useCallback((id) => {
        setColumnFilters((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const clearFilters = useCallback(() => setColumnFilters([]), []);

    // ── Search state ──
    const [search, setSearch] = useState("");

    // ── Derived filter values from columnFilters ──
    const filterLang = useMemo(() => {
        const f = columnFilters.find((f) => f.id === "language");
        return Array.isArray(f?.value) ? f.value : [];
    }, [columnFilters]);

    const filterCat = useMemo(() => {
        const f = columnFilters.find((f) => f.id === "category");
        return Array.isArray(f?.value) ? f.value : [];
    }, [columnFilters]);

    const filterStatus = useMemo(() => {
        const f = columnFilters.find((f) => f.id === "status");
        return Array.isArray(f?.value) ? f.value : [];
    }, [columnFilters]);

    // filterConfig for PopupFilter
    const filterConfig = useMemo(() => [
        {
            id: "language",
            label: "Language",
            inputType: "multiSelect",
            options: languages.map((l) => ({ value: l, label: l })),
        },
        {
            id: "category",
            label: "Category",
            inputType: "multiSelect",
            options: categories.map((c) => ({ value: c, label: c })),
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
    ], [languages, categories]);

    // Filters map for PopupFilter
    const filtersMap = useMemo(() =>
        columnFilters.reduce((acc, f) => { acc[f.id] = f.value; return acc; }, {})
    , [columnFilters]);

    const hasFilters = columnFilters.length > 0;

    // ── Selection state ──
    const [selected, setSelected] = useState(new Set());

    // ── Print ref ──
    const printRef = useRef(null);
    const qrPrintRef = useRef(null);

    // Filtered list
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return books.filter((b) => {
            const matchSearch =
                !q ||
                String(b.id || "").toLowerCase().includes(q) ||
                (b.name || "").toLowerCase().includes(q) ||
                (b.author || "").toLowerCase().includes(q);
            const matchLang =
                filterLang.length === 0 ||
                filterLang.includes((b.language || "").toUpperCase());
            const matchCat =
                filterCat.length === 0 ||
                filterCat.includes((b.category || "").toUpperCase());
            // Normalise status the same way the books table does
            const displayStatus =
                b.status === "Pending" || b.status === "Rented"
                    ? "Rented"
                    : b.status || "Available";
            const matchStatus =
                filterStatus.length === 0 ||
                filterStatus.includes(displayStatus) ||
                filterStatus.includes(b.status);
            return matchSearch && matchLang && matchCat && matchStatus;
        });
    }, [books, search, filterLang, filterCat, filterStatus]);

    // Books to print = selected ones among filtered, or all filtered if none selected
    const booksToPrint = useMemo(() => {
        if (selected.size === 0) return filtered;
        return filtered.filter((b) => selected.has(b._id));
    }, [filtered, selected]);

    // ── Selection handlers ──
    const allFilteredSelected =
        filtered.length > 0 && filtered.every((b) => selected.has(b._id));

    const toggleAll = useCallback(() => {
        if (allFilteredSelected) {
            setSelected((prev) => {
                const next = new Set(prev);
                filtered.forEach((b) => next.delete(b._id));
                return next;
            });
        } else {
            setSelected((prev) => {
                const next = new Set(prev);
                filtered.forEach((b) => next.add(b._id));
                return next;
            });
        }
    }, [allFilteredSelected, filtered]);

    const toggleOne = useCallback((id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => setSelected(new Set()), []);

    // ── Print ──
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: "Book Barcodes",
    });

    const handlePrintQR = useReactToPrint({
        contentRef: qrPrintRef,
        documentTitle: "Library QR Code",
    });

    const downloadQR = () => {
        const canvas = document.getElementById("library-qr-canvas");
        if (!canvas) return;
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "Library_QR.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
            <Header title="BARCODES" subTitle="View, select and print book barcodes" />
            {/* ── Print-only sheet (hidden on screen) ── */}
            <PrintSheet ref={printRef} books={booksToPrint} />

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Filter — same centre-dialog as /dashboard/books */}
                <PopupFilter
                    filterConfig={filterConfig}
                    filters={filtersMap}
                    setFilter={setFilter}
                    removeFilter={removeFilter}
                    clearFilters={clearFilters}
                    hasFilters={hasFilters}
                    title="Barcodes"
                    triggerClass="h-9 min-w-9 w-auto px-2 shrink-0"
                />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Sort options">
                            <ArrowDownWideNarrow className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setSortView("name")} className={sortView === "name" ? "bg-accent" : ""}>
                            <ArrowDownAZ className="mr-2 h-4 w-4" />
                            <span>Name Order (ID Ascending)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortView("date")} className={sortView === "date" ? "bg-accent" : ""}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            <span>Date Added (Recent First)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        id="barcode-search"
                        className="pl-9"
                        placeholder="Search by ID, name or author…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* QR Code button */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" title="Show Library QR Code" className="px-2 md:px-4">
                            <QrCode className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">QR Code</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-6">
                        <DialogHeader>
                            <DialogTitle className="text-center mb-4">Library Access QR Code</DialogTitle>
                        </DialogHeader>
                        <div ref={qrPrintRef} className="bg-white p-4 rounded-xl shadow-sm border inline-block flex flex-col items-center">
                            <div className="mb-4 text-xl font-bold print:block hidden">Library Books</div>
                            <QRCodeCanvas id="library-qr-canvas" value={qrUrl} size={250} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-4 text-center">
                            Scan to view the library books
                        </p>
                        <div className="flex gap-3 mt-4">
                            <Button variant="outline" size="sm" onClick={downloadQR}>
                                <Download className="h-4 w-4 mr-2" /> Download
                            </Button>
                            <Button size="sm" onClick={handlePrintQR} className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print">
                                <Printer className="h-4 w-4 mr-2" /> Print
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Print button */}
                <Button
                    id="barcode-print-btn"
                    onClick={handlePrint}
                    disabled={selected.size === 0}
                    className="px-2 md:px-4 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print"
                >
                    <Printer className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Print{selected.size > 0 ? ` (${selected.size})` : ""}</span>
                </Button>
            </div>
            </div>

            {/* ── Select-all bar ── */}
            <div className="flex items-center gap-3 px-1">
                <button
                    id="barcode-select-all"
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={allFilteredSelected ? "Deselect all" : "Select all"}
                >
                    {allFilteredSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                        <Square className="h-4 w-4" />
                    )}
                    {allFilteredSelected ? "Deselect all" : "Select all"} ({filtered.length})
                </button>

                {selected.size > 0 && (
                    <button
                        onClick={clearSelection}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-2"
                    >
                        <X className="h-3 w-3" />
                        Clear selection
                    </button>
                )}

            </div>

            {/* ── Barcode grid ── */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <Search className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No barcodes match your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filtered.map((book) => {
                        const isSelected = selected.has(book._id);
                        const isValidBarcode =
                            book.id && /^[\x20-\x7E]+$/.test(String(book.id));

                        return (
                            <div
                                key={book._id}
                                id={`barcode-card-${book._id}`}
                                onClick={() => toggleOne(book._id)}
                                className={`
                                    relative cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center gap-1
                                    transition-all duration-150 select-none
                                    ${
                                        isSelected
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
                                    }
                                `}
                            >
                                {/* Checkbox overlay */}
                                <div className="absolute top-1.5 left-1.5">
                                    <Checkbox
                                        id={`cb-${book._id}`}
                                        checked={isSelected}
                                        onCheckedChange={() => toggleOne(book._id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-4 w-4"
                                    />
                                </div>

                                {/* Book ID */}
                                <span className="text-[11px] font-bold uppercase tracking-wider mt-3 text-center leading-tight">
                                    {book.id}
                                </span>

                                {/* Barcode image */}
                                <div className="bg-white rounded px-1 py-0.5 w-full flex justify-center">
                                    {isValidBarcode ? (
                                        <Barcode
                                            value={String(book.id)}
                                            width={1.0}
                                            height={38}
                                            fontSize={9}
                                            margin={0}
                                            displayValue={false}
                                        />
                                    ) : (
                                        <span className="text-xs text-muted-foreground py-3">
                                            Invalid
                                        </span>
                                    )}
                                </div>

                                {/* Book name (truncated) */}
                                {book.name && (
                                    <span
                                        className={`text-[10px] text-muted-foreground text-center leading-tight line-clamp-2 w-full${isMalayalam(book.name) ? " font-google-sans" : isArabic(book.name) ? " font-sakkal-majalla" : ""}`}
                                        title={book.name}
                                    >
                                        {book.name}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
