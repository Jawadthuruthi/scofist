import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDB();
        const settings = await Settings.findOne({}).lean();
        
        let categories = ["Masjid", "Haddad", "Programs", "Spot"];
        if (settings?.general?.attendanceCategories) {
            categories = settings.general.attendanceCategories;
        }
        
        return NextResponse.json({ categories }, { 
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            }
        });
    } catch (error) {
        console.error("Error fetching attendance categories:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance categories" },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { categories } = body;

        if (!Array.isArray(categories)) {
            return NextResponse.json(
                { error: "Invalid data format. Expected an array of categories." },
                { status: 400 }
            );
        }

        await connectToDB();
        await Settings.updateOne(
            {}, 
            { $set: { "general.attendanceCategories": categories } }, 
            { upsert: true }
        );

        return NextResponse.json(
            { message: "Categories updated successfully", categories },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating attendance categories:", error);
        return NextResponse.json(
            { error: "Failed to update attendance categories" },
            { status: 500 }
        );
    }
}
