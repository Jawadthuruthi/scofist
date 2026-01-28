import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import LibraryBook from "@/models/LibraryBook";

const validateApiKey = (req) => {
    const url = new URL(req.url);
    const apiKey = req.headers.get("api-key") || url.searchParams.get("apiKey");
    return !!apiKey;
};

export async function GET(req) {
    try {
        await connectToDB();
        if (!validateApiKey(req)) {
            return NextResponse.json({ success: false, msg: "Invalid API Key", data: {} }, { status: 401 });
        }

        const totalBooks = await LibraryBook.countDocuments();
        const availableBooks = await LibraryBook.countDocuments({ status: "Available" });
        const rentedBooks = await LibraryBook.countDocuments({ status: "Rented" });

        const data = {
            total: totalBooks,
            available: availableBooks,
            rented: rentedBooks
        };

        return NextResponse.json({ success: true, msg: "Book counts fetched successfully", data: data }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
