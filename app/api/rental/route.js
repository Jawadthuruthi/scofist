import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Rental from "@/models/Rental";
import LibraryBook from "@/models/LibraryBook";



export async function GET(req) {
    try {
        await connectToDB();
        // Middleware handles auth


        const rentals = await Rental.find().populate("bookId").sort({ createdAt: -1 });

        return NextResponse.json({ success: true, msg: "Rentals fetched successfully", data: rentals }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        // Middleware handles auth


        const body = await req.json();

        // Create rental
        const newRental = await Rental.create(body);

        // Update book status to Rented
        if (body.bookId) {
            await LibraryBook.findByIdAndUpdate(body.bookId, { status: "Rented" });
        }

        return NextResponse.json({ success: true, msg: "Rental created successfully", data: newRental }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectToDB();
        // Middleware handles auth


        const body = await req.json();
        const { _id, receivedDate } = body;

        if (!_id) {
            return NextResponse.json({ success: false, msg: "Rental ID required", data: {} }, { status: 400 });
        }

        const updatedRental = await Rental.findByIdAndUpdate(_id, body, { new: true });

        // If receivedDate is set, mark book as Available
        if (receivedDate && updatedRental.bookId) {
            await LibraryBook.findByIdAndUpdate(updatedRental.bookId, { status: "Available" });
        }

        if (!updatedRental) {
            return NextResponse.json({ success: false, msg: "Rental not found", data: {} }, { status: 404 });
        }

        return NextResponse.json({ success: true, msg: "Rental updated successfully", data: updatedRental }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        // Middleware handles auth


        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, msg: "Rental ID required", data: {} }, { status: 400 });
        }

        const deletedRental = await Rental.findByIdAndDelete(id);

        if (!deletedRental) {
            return NextResponse.json({ success: false, msg: "Rental not found", data: {} }, { status: 404 });
        }

        return NextResponse.json({ success: true, msg: "Rental deleted successfully", data: {} }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
