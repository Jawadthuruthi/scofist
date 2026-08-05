"use client";

import React, { useMemo } from "react";
import TableComponent from "@/components/TableComponent";
import { Book, User, Hash, Languages, Tag, AlertCircle, BookOpen } from "lucide-react";
import Barcode from "react-barcode";
import PublicHeader from "@/components/PublicHeader"; // Or any public header if exists
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

export default function PublicLibraryClient({ initialBooks = [] }) {
    const [filteredCount, setFilteredCount] = React.useState(initialBooks.length);

    // Sort books alphabetically by ID initially
    const books = useMemo(() => {
        return [...initialBooks].sort((a, b) => {
            const idA = String(a.id || "");
            const idB = String(b.id || "");
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [initialBooks]);

    const dynamicLanguages = useMemo(() => {
        const all = new Set(books.map(b => b.language?.toUpperCase()).filter(Boolean));
        return Array.from(all).sort();
    }, [books]);

    const dynamicCategories = useMemo(() => {
        const all = new Set(books.map(b => normalizeCategoryName(b.category)).filter(Boolean));
        return Array.from(all).sort();
    }, [books]);

    const filterConfig = useMemo(() => [
        {
            id: "language",
            label: "Language",
            inputType: "multiSelect",
            options: dynamicLanguages.map((l) => ({ value: l, label: l })),
            className: "hidden md:block w-auto min-w-[280px]"
        },
        {
            id: "category",
            label: "Category",
            inputType: "multiSelect",
            options: dynamicCategories.map((c) => ({ value: c, label: c })),
            className: "hidden md:block w-auto min-w-[280px]"
        }
    ], [dynamicLanguages, dynamicCategories]);

    const bookColumns = useMemo(() => [
        {
            accessorKey: "id",
            header: "ID",
            filterFn: "includesString",
        },
        {
            accessorKey: "name",
            header: "Name",
            filterFn: "includesString",
        },
        {
            accessorKey: "author",
            header: "Author",
            filterFn: "includesString",
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
        },
    ], []);

    const renderGridItem = (row) => {
        const book = row.original;
        
        return (
            <Card className="h-full hover:shadow-md transition-shadow overflow-hidden border-2">
                <CardContent className="p-4 flex gap-4 items-start h-full">
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 w-[72px]">
                        <div className="bg-primary/10 p-2 rounded-md flex items-center justify-center w-full aspect-square">
                            <BookOpen className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center w-full space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 py-0.5 rounded truncate">ID: {book.id}</div>
                            <div className="font-bold text-sm text-primary mt-1">₹{book.price?.toFixed(2) || "0.00"}</div>
                            <div className={`mt-2 inline-block w-full text-[10px] px-1 py-0.5 rounded-full font-bold uppercase tracking-wider ${book.status === 'Available' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                {(book.status === 'Pending' || book.status === 'Rented') ? 'Rented' : (book.status || "Unknown")}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 space-y-1 min-w-0 py-1 flex flex-col h-full">
                        <div className="flex-1">
                            <h3 className="font-bold text-2xl leading-tight break-words mb-1" title={book.name} style={{ fontFamily: '"Sakkal Majalla", serif' }}>{book.name}</h3>
                            <div className="text-sm text-muted-foreground break-words mt-1" title={book.author}>Author: <span className="text-foreground font-medium text-lg leading-none" style={{ fontFamily: '"Sakkal Majalla", serif' }}>{book.author}</span></div>
                            {book.publication && <div className="text-xs text-muted-foreground break-words mt-1" title={book.publication}>Publication: <span className="text-foreground leading-none">{book.publication}</span></div>}
                            <div className="text-xs text-muted-foreground mt-1">Language: <span className="text-foreground leading-none">{book.language}</span></div>
                            <div className="text-xs text-muted-foreground mt-1">Category: <span className="text-foreground leading-none">{book.category}</span></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="container max-w-7xl mx-auto py-6 space-y-4">
            <div className="text-center space-y-2 mb-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Library Books</h1>
                <p className="text-muted-foreground">Browse our entire library collection.</p>
                <div className="pt-2">
                    <span className="inline-block bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-bold transition-all">
                        {filteredCount} Total Books
                    </span>
                </div>
            </div>

            <div className="md:bg-card md:rounded-xl border-0 md:border shadow-none md:shadow-sm p-0 md:p-6">
                <TableComponent
                    data={books}
                    columnsConfig={bookColumns}
                    getRowId={(originalRow) => originalRow._id}
                    filterConfig={filterConfig}
                    inlineFilters={true}
                    enableGrid={true}
                    renderGridItem={renderGridItem}
                    defaultViewMode="grid"
                    hideViewToggle={true}
                    hideColumnManagement={true}
                    hidePrintBtn={true}
                    showTotalCount={true}
                    totalCountLabel="Total Books"
                    searchPlaceholder="Search by title, author, or ID..."
                    gridColsClass="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    onFilteredDataChange={(rows) => setFilteredCount(rows.length)}
                />
            </div>
        </div>
    );
}
