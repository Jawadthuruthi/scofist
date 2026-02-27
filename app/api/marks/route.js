import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Mark from "@/models/Mark";

export async function GET(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get("classId");
        const filter = classId ? { classId } : {};
        const marks = await Mark.find(filter)
            .populate("classId", "name")
            .populate("students.studentId", "name _id");
        return NextResponse.json({ success: true, data: marks });
    } catch (error) {
        console.error("GET /api/marks error:", error);
        return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const mark = await Mark.create(body);
        return NextResponse.json({ success: true, data: mark }, { status: 201 });
    } catch (error) {
        console.error("POST /api/marks error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
