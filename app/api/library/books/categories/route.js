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

        const categories = await LibraryBook.distinct("category");

        return NextResponse.json({ success: true, msg: "Categories fetched successfully", data: categories }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
