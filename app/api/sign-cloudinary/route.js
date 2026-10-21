
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { apiResponse } from "@/lib/apiResponse";

export async function POST(req) {
    try {
        // ✅ FIX #3: Re-enabled auth — check x-user injected by middleware after JWT verification.
        // Using x-user (server-injected) instead of active-role header (client-spoofable).
        const xUser = req.headers.get("x-user");
        if (!xUser) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const user = JSON.parse(xUser);
        const allowedRoles = ["College Admin", "Program Committee", "Org Admin", "Teacher", "Spark Admin"];
        const hasPermission = user?.roles?.some((r) => allowedRoles.includes(r));
        if (!hasPermission) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // Explicitly configure Cloudinary here to ensure env vars are picked up
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const body = await req.json();
        const { folder = "downloads" } = body;

        // Security check: Only allow specific folders based on role
        const folderPermissions = {
            downloads: ["College Admin", "Program Committee", "Org Admin", "Spark Admin"],
            applications: ["College Admin", "Org Admin"],
            profiles: ["College Admin", "Org Admin", "Teacher"],
        };

        const permittedRolesForFolder = folderPermissions[folder];
        if (!permittedRolesForFolder || !user?.roles?.some((r) => permittedRolesForFolder.includes(r))) {
            return NextResponse.json({ message: "Forbidden: Not allowed to upload to this folder" }, { status: 403 });
        }

        const timestamp = Math.round(new Date().getTime() / 1000);

        // Generate signature
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp,
                folder,
            },
            process.env.CLOUDINARY_API_SECRET
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder
        });
    } catch (error) {
        console.error("Error signing Cloudinary request:", error);
        return apiResponse.error(error);
    }
}
