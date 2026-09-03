import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Update from "@/models/Update";
import Article from "@/models/Article";
import Settings from "@/models/Settings";
import { getYear } from "@/lib/getYear";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year") || "";
    const activeYear = await getYear(req);

    // 2026: No photos until uploaded separately by the program committee
    const is2026 =
      yearParam.includes("2026") ||
      (!yearParam && activeYear?.toString().includes("2026"));

    if (is2026) {
      return NextResponse.json(
        {
          success: true,
          photos: [],
          total: 0,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const [settings, updates, articles] = await Promise.all([
      Settings.findOne({}).lean(),
      Update.find({ "image.url": { $exists: true, $ne: "" } })
        .sort({ date: -1 })
        .limit(30)
        .lean(),
      Article.find({ "image.url": { $exists: true, $ne: "" } })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    const photos = [];

    // Add festival highlight imagery
    if (settings?.festival) {
      const f = settings.festival;
      if (f.festivalThemeImage?.url) {
        photos.push({
          id: "fest-theme",
          url: f.festivalThemeImage.url,
          caption: `${f.festivalInfo?.theme || "Festival Theme"}`,
          category: "Theme",
          date: f.festivalInfo?.dates?.startDate || new Date(),
        });
      }
      if (f.festivalNameImage?.url) {
        photos.push({
          id: "fest-name",
          url: f.festivalNameImage.url,
          caption: `${f.festivalInfo?.name || "Festival"} Official Emblem`,
          category: "Emblem",
          date: new Date(),
        });
      }
      if (f.festivalFullNameImage?.url) {
        photos.push({
          id: "fest-fullname",
          url: f.festivalFullNameImage.url,
          caption: `${f.festivalInfo?.name || "Festival"} Identity`,
          category: "Identity",
          date: new Date(),
        });
      }
    }

    // Add updates imagery
    updates.forEach((u) => {
      if (u.image?.url) {
        photos.push({
          id: u._id.toString(),
          url: u.image.url,
          caption: u.heading || "Festival Update",
          category: "Highlights",
          date: u.date || u.createdAt,
        });
      }
    });

    // Add article imagery
    articles.forEach((a) => {
      if (a.image?.url) {
        photos.push({
          id: a._id.toString(),
          url: a.image.url,
          caption: a.title || "Festival Feature",
          category: "Features",
          date: a.createdAt,
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        photos,
        total: photos.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error in gallery API:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch gallery" },
      { status: 500 }
    );
  }
}
