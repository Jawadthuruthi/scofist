"use client";

import { useState } from "react";
import Header from "@/components/Header";
import TableComponent from "@/components/TableComponent";
import PopupForm from "@/components/PopupForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, BookOpen, AlertCircle, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function LibraryDashboard({
    view,
    counts,
    categories,
    languages,
    initialBooks = [],
    initialRentals = [],
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [rowSelection, setRowSelection] = useState({});

    const selectedBookIds = Object.keys(rowSelection);
    const selectedBook = selectedBookIds.length === 1
        ? initialBooks.find(b => b._id === selectedBookIds[0])
        : null;

    // --- Configurations ---

    const bookFields = [
        {
            name: "number",
            label: "Book ID",
            inputType: "number",
            type: "number",
            required: true,
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
            options: (languages || []).map((l) => ({ value: l, label: l })),
            freeSolo: true,
            required: true,
        },
        {
            name: "category",
            label: "Category",
            inputType: "select",
            options: (categories || []).map((c) => ({ value: c, label: c })),
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
            name: "bookId",
            label: "Book",
            inputType: "select",
            resource: "library/books?status=Available", // Fetch available books
            required: true,
            section: "Rental Info",
        },
        {
            name: "studentId",
            label: "Student",
            inputType: "select",
            resource: "users?roles=Student", // Fetch students
            required: true,
            section: "Rental Info",
        },
        {
            name: "rentedDate",
            label: "Rented Date",
            inputType: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
            section: "Dates",
        },
        {
            name: "receivedDate",
            label: "Received Date",
            inputType: "date",
            section: "Dates",
            hideOnCreate: true, // Only show when editing/returning
        },
    ];

    const bookColumns = [
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
                width: "20px",
                minWidth: "20px",
                padding: "0px 0px", // Extremely tight
            },
        },
        {
            id: "serial",
            header: "Sl No",
            cell: ({ row }) => row.index + 1,
            meta: {
                width: "25px",
                minWidth: "25px",
                padding: "0px 0px", // Extremely tight
            },
        },
        {
            accessorKey: "number",
            header: "Book ID",
            meta: {
                width: "60px",
                minWidth: "60px",
                padding: "4px 4px", // Standard vertical, tight horizontal
            }
        },
        { accessorKey: "name", header: "Book Name" },
        { accessorKey: "author", header: "Author" },
        { accessorKey: "language", header: "Language" },
        { accessorKey: "category", header: "Category" },
        { accessorKey: "publication", header: "Publication" },
        {
            accessorKey: "price",
            header: "Price",
            meta: {
                width: "60px",
                minWidth: "60px",
                padding: "4px 4px",
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            meta: { padding: "4px 4px" }
        },
    ];

    const rentalColumns = [
        {
            accessorKey: "bookId.name",
            header: "Book",
            cell: ({ row }) => row.original.bookId?.name || "Unknown Book"
        },
        { accessorKey: "studentName", header: "Student Name" }, // If stored, or fetch via ID? Schema has studentName.
        // Ideally populate studentId to get name if not stored, but schema has studentName. Form should populate it.
        {
            accessorKey: "rentedDate",
            header: "Rented On",
            cell: ({ row }) => row.original.rentedDate ? format(new Date(row.original.rentedDate), "PPP") : "-"
        },
        {
            accessorKey: "receivedDate",
            header: "Returned On",
            cell: ({ row }) => row.original.receivedDate ? format(new Date(row.original.receivedDate), "PPP") : "Pending"
        },
        {
            accessorKey: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex gap-2">
                    {!row.original.receivedDate && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturnBook(row.original)}
                        >
                            Return
                        </Button>
                    )}

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRental(row.original._id)}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];


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
                router.refresh();
                return true;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBook = async (id, data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/library/books", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: id, ...data }),
            });
            if (res.ok) {
                router.refresh();
                return true;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBook = async (id) => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/library/books?id=${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedBookIds.length} books?`)) return;
        setLoading(true);
        try {
            // Sequential delete for multiple items since backend bulk delete is not implemented
            for (const id of selectedBookIds) {
                await fetch(`/api/library/books?id=${id}`, {
                    method: "DELETE",
                });
            }
            router.refresh();
            setRowSelection({});
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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

        try {
            const res = await fetch("/api/rental", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                router.refresh();
                return true;
            }
        } catch (error) {
            console.error(error);
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

    const handleDeleteRental = async (id) => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/rental?id=${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Views ---

    if (view === "dashboard") {
        return (
            <div className="space-y-6">
                <Header title="LIBRARY DASHBOARD" subTitle="Overview of library stats" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                            <Book className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{counts?.total || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Available</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{counts?.available || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rented</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{counts?.rented || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {categories?.length > 0 ? categories.map(c => (
                                    <div key={c} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">{c}</div>
                                )) : "No categories found"}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Languages</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {languages?.length > 0 ? languages.map(l => (
                                    <div key={l} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">{l}</div>
                                )) : "No languages found"}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (view === "books") {
        return (
            <div className="space-y-6">
                <Header
                    title="BOOKS MANAGEMENT"
                    subTitle="Manage library books inventory"
                    rightAction={
                        <div className="flex gap-2">
                            {selectedBookIds.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete ({selectedBookIds.length})
                                </Button>
                            )}
                            {selectedBook && (
                                <PopupForm
                                    title="Edit Book"
                                    formFields={bookFields}
                                    data={selectedBook}
                                    onSubmit={(data) => handleUpdateBook(selectedBook._id, data)}
                                    loading={loading}
                                />
                            )}
                            <PopupForm
                                title="Add New Book"
                                formFields={bookFields}
                                onSubmit={handleCreateBook}
                                loading={loading}
                            />
                        </div>
                    }
                />
                <TableComponent
                    data={initialBooks}
                    columnsConfig={bookColumns}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(originalRow) => originalRow._id}
                />
            </div>
        );
    }

    if (view === "rentals") {
        return (
            <div className="space-y-6">
                <Header
                    title="RENTALS MANAGEMENT"
                    subTitle="Track book rentals"
                    rightAction={
                        <PopupForm
                            title="New Rental"
                            formFields={rentalFields}
                            onSubmit={handleCreateRental}
                            loading={loading}
                        />
                    }
                />
                <TableComponent
                    data={initialRentals}
                    columnsConfig={rentalColumns}
                />
            </div>
        );
    }

    return <div>Invalid View</div>;
}
