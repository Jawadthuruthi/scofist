
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import LibraryBook from "@/models/LibraryBook";

export async function GET(req) {
    try {
        await connectToDB();

        const books = await LibraryBook.find().sort({ createdAt: -1 });

        return NextResponse.json({ success: true, msg: "Books fetched successfully", data: books }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();

        const body = await req.json();

        // Validate required fields (optional but good practice)
        // const { number, name, author, category, language } = body;
        // if (!number || !name || !author || !category || !language) { 
        //    return NextResponse.json({ success: false, msg: "Missing required fields", data: {} }, { status: 400 });
        // }

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
