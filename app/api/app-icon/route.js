import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();
    const settings = await Settings.findOne({}).lean();
    const targetUrl = settings?.general?.appIcon?.url;

    if (targetUrl) {
      return NextResponse.redirect(targetUrl, {
        status: 302,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }
  } catch (error) {
    console.error("Error fetching app icon:", error);
  }

  return NextResponse.redirect(new URL("/favicon.svg", req.url), {
    status: 302,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
