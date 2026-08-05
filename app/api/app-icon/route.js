import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();
    const settings = await Settings.findOne({}).lean();
    if (settings?.general?.appIcon?.url) {
      return NextResponse.redirect(settings.general.appIcon.url);
    }
  } catch (error) {
    console.error("Error fetching app icon:", error);
  }
  
  return NextResponse.redirect(new URL("/favicon.svg", req.url));
}
