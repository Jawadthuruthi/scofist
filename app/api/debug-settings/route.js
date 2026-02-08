import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectToDB();
        const settings = await Settings.findOne({}).lean();
        console.log("DEBUG SETTINGS:", JSON.stringify(settings, null, 2));
        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
