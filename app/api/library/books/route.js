
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import LibraryBook from "@/models/LibraryBook";
import Rental from "@/models/Rental";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const number = url.searchParams.get("number");

        const query = {};
        if (number) {
            query.id = { $regex: new RegExp(`^${number}$`, 'i') }; // Exact match, case insensitive
        }

        const books = await LibraryBook.find(query).sort({ prefix: 1, number: 1 }).collation({ locale: "en", numericOrdering: true }).lean();
        const activeRentals = await Rental.find({ receivedDate: null }).select("bookId");

        const rentedBookIds = new Set(activeRentals.map(r => r.bookId?.toString()));

        books.forEach(book => {
            if (rentedBookIds.has(book._id.toString())) {
                book.status = "Rented";
            }
        });

        return NextResponse.json({ success: true, msg: "Books fetched successfully", data: books }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();

        const body = await req.json();

        if (body.id) {
            const prefixMatch = body.id.replace(/[^A-Za-z]/g, '');
            const numberMatch = body.id.replace(/[^0-9]/g, '');
            body.prefix = prefixMatch || "";
            body.number = numberMatch || body.id;
        }

        const newBook = await LibraryBook.create(body);

        return NextResponse.json({ success: true, msg: "Book created successfully", data: newBook }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectToDB();

        const body = await req.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json({ success: false, msg: "Book ID required", data: {} }, { status: 400 });
        }

        if (updateData.id) {
            const prefixMatch = updateData.id.replace(/[^A-Za-z]/g, '');
            const numberMatch = updateData.id.replace(/[^0-9]/g, '');
            updateData.prefix = prefixMatch || "";
            updateData.number = numberMatch || updateData.id;
        }

        const updatedBook = await LibraryBook.findByIdAndUpdate(_id, updateData, { new: true });

        if (!updatedBook) {
            return NextResponse.json({ success: false, msg: "Book not found", data: {} }, { status: 404 });
        }

        return NextResponse.json({ success: true, msg: "Book updated successfully", data: updatedBook }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, msg: "Book ID required", data: {} }, { status: 400 });
        }

        const deletedBook = await LibraryBook.findByIdAndDelete(id);

        if (!deletedBook) {
            return NextResponse.json({ success: false, msg: "Book not found", data: {} }, { status: 404 });
        }

        return NextResponse.json({ success: true, msg: "Book deleted successfully", data: {} }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
