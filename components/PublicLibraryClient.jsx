"use client";

import React, { useMemo } from "react";
import TableComponent from "@/components/TableComponent";
import { Book, User, Hash, Languages, Tag, AlertCircle } from "lucide-react";
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
        const displayStatus = (book.status === "Pending" || book.status === "Rented") ? "Rented" : (book.status || "Unknown");
        const isAvailable = displayStatus === "Available";

        return (
            <Card className="overflow-hidden hover:shadow-md transition-all h-full border-2 hover:border-primary/50">
                <CardContent className="p-4 flex flex-col h-full gap-3">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                            <h3 className="font-bold text-lg leading-tight mb-1 text-primary book-text-font line-clamp-2">
                                {book.name || "Unknown Book"}
                            </h3>
                            <div className="flex items-center text-sm text-muted-foreground gap-1.5 uppercase">
                                <User className="h-3.5 w-3.5" />
                                <span className="truncate">{book.author || "Unknown"}</span>
                            </div>
                        </div>
                        <Badge variant={isAvailable ? "default" : "destructive"} className="shrink-0">
                            {displayStatus}
                        </Badge>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Hash className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-semibold text-foreground">{book.id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Languages className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate uppercase">{book.language || "-"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Tag className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate uppercase">{normalizeCategoryName(book.category) || "-"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="container max-w-6xl mx-auto py-6 space-y-6">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Library Catalog</h1>
                <p className="text-muted-foreground">Browse and search our entire library collection.</p>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-4 md:p-6">
                <TableComponent
                    data={books}
                    columnsConfig={bookColumns}
                    getRowId={(originalRow) => originalRow._id}
                    filterConfig={filterConfig}
                    enableGrid={true}
                    renderGridItem={renderGridItem}
                    defaultViewMode="grid"
                    hideViewToggle={true}
                    hideColumnManagement={true}
                    hidePrintBtn={true}
                    showTotalCount={true}
                    totalCountLabel="Total Books"
                    searchPlaceholder="Search by title, author, or ID..."
                    gridColsClass="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                />
            </div>
        </div>
    );
}
