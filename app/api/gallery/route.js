import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Gallery from "@/models/Gallery";
import Update from "@/models/Update";
import Article from "@/models/Article";
import Settings from "@/models/Settings";
import { getYear } from "@/lib/getYear";
import cloudinary from "@/lib/cloudinary";
import { parseVideoUrl } from "@/lib/videoUtils";

export const dynamic = "force-dynamic";

// GET /api/gallery?year=2026&type=all&category=all
export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year") || "";
    const typeParam = searchParams.get("type") || "all";
    const categoryParam = searchParams.get("category") || "all";
    const uploadedByParam = searchParams.get("uploadedBy");
    const activeYear = await getYear(req);

    const effectiveYear = yearParam || activeYear || "2026";
    // Extract 4-digit year or clean year token
    const yearMatch = effectiveYear.match(/\b(20\d\d)\b/);
    const numericYear = yearMatch ? yearMatch[1] : effectiveYear;

    // Build filter query for Gallery collection
    const query = {
      $or: [
        { year: { $regex: new RegExp(numericYear, "i") } },
        { year: effectiveYear },
      ],
    };

    if (typeParam !== "all") {
      query.type = typeParam;
    }

    if (categoryParam !== "all" && categoryParam) {
      query.category = categoryParam;
    }

    if (uploadedByParam) {
      query.uploadedBy = uploadedByParam;
    }

    // Query gallery items
    const galleryItems = await Gallery.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Fetch distinct categories for the active festival year
    const distinctCategories = await Gallery.distinct("category", {
      $or: [
        { year: { $regex: new RegExp(numericYear, "i") } },
        { year: effectiveYear },
      ],
    });

    const photos = [];
    const videos = [];

    galleryItems.forEach((item) => {
      const formattedItem = {
        ...item,
        id: item._id.toString(),
      };
      if (item.type === "video") {
        videos.push(formattedItem);
      } else {
        photos.push(formattedItem);
      }
    });

    // Fallback for older years (e.g. 2025) if no explicit Gallery records exist yet
    const is2026OrNewer =
      numericYear === "2026" || parseInt(numericYear, 10) >= 2026;

    if (galleryItems.length === 0 && !is2026OrNewer && !uploadedByParam) {
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

      if (settings?.festival) {
        const f = settings.festival;
        if (f.festivalThemeImage?.url) {
          photos.push({
            id: "fest-theme",
            type: "image",
            url: f.festivalThemeImage.url,
            caption: `${f.festivalInfo?.theme || "Festival Theme"}`,
            category: "Theme",
            date: f.festivalInfo?.dates?.startDate || new Date(),
          });
        }
        if (f.festivalNameImage?.url) {
          photos.push({
            id: "fest-name",
            type: "image",
            url: f.festivalNameImage.url,
            caption: `${f.festivalInfo?.name || "Festival"} Official Emblem`,
            category: "Emblem",
            date: new Date(),
          });
        }
      }

      updates.forEach((u) => {
        if (u.image?.url) {
          photos.push({
            id: u._id.toString(),
            type: "image",
            url: u.image.url,
            caption: u.heading || "Festival Update",
            category: "Highlights",
            date: u.date || u.createdAt,
          });
        }
      });

      articles.forEach((a) => {
        if (a.image?.url) {
          photos.push({
            id: a._id.toString(),
            type: "image",
            url: a.image.url,
            caption: a.title || "Festival Feature",
            category: "Features",
            date: a.createdAt,
          });
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        items: galleryItems.map((i) => ({ ...i, id: i._id.toString() })),
        photos,
        videos,
        categories: distinctCategories.filter(Boolean),
        total: photos.length + videos.length,
        year: effectiveYear,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error in gallery API GET:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch gallery items", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/gallery - Upload or add photo(s) and video link(s)
export async function POST(req) {
  try {
    await connectToDB();
    const body = await req.json();

    // Check if batch creation or single creation
    const rawItems = Array.isArray(body.items) ? body.items : [body];
    const defaultYear = body.year || "2026";
    const uploadedBy = body.uploadedBy || "Program Committee";

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "No items provided" },
        { status: 400 }
      );
    }

    const itemsToCreate = [];

    for (const raw of rawItems) {
      if (!raw.url) continue;

      let itemType = raw.type || "image";
      let platform = raw.platform || "other";
      let embedUrl = raw.embedUrl || "";
      let thumbnailUrl = raw.thumbnailUrl || "";

      if (itemType === "video") {
        const parsed = parseVideoUrl(raw.url);
        platform = raw.platform || parsed.platform;
        embedUrl = raw.embedUrl || parsed.embedUrl;
        thumbnailUrl = raw.thumbnailUrl || parsed.thumbnailUrl;
      }

      itemsToCreate.push({
        title: raw.title || "",
        caption: raw.caption || "",
        type: itemType,
        url: raw.url.trim(),
        publicId: raw.publicId || "",
        platform,
        embedUrl,
        thumbnailUrl,
        category: raw.category?.trim() || "General",
        year: raw.year || defaultYear,
        order: Number(raw.order) || 0,
        uploadedBy: raw.uploadedBy || uploadedBy,
      });
    }

    if (itemsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid items or missing URLs" },
        { status: 400 }
      );
    }

    const created = await Gallery.insertMany(itemsToCreate);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${created.length} gallery item(s)`,
        count: created.length,
        items: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating gallery item(s):", error);
    return NextResponse.json(
      { success: false, message: "Failed to create gallery item", error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/gallery - Update item (caption, title, category, order, etc.)
export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { id, title, caption, category, order, url, type } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    const existing = await Gallery.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Gallery item not found" },
        { status: 404 }
      );
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (caption !== undefined) updateFields.caption = caption;
    if (category !== undefined) updateFields.category = category.trim();
    if (order !== undefined) updateFields.order = Number(order);

    if (url !== undefined && url !== existing.url) {
      updateFields.url = url.trim();
      if ((type || existing.type) === "video") {
        const parsed = parseVideoUrl(url);
        updateFields.platform = parsed.platform;
        updateFields.embedUrl = parsed.embedUrl;
        updateFields.thumbnailUrl = parsed.thumbnailUrl;
      }
    }

    const updated = await Gallery.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Gallery item updated successfully",
        item: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating gallery item:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update gallery item", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/gallery - Delete item by ID
export async function DELETE(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    const item = await Gallery.findById(id);
    if (!item) {
      return NextResponse.json(
        { success: false, message: "Gallery item not found" },
        { status: 404 }
      );
    }

    // If Cloudinary image, delete from Cloudinary
    if (item.type === "image" && item.publicId) {
      try {
        await cloudinary.uploader.destroy(item.publicId);
      } catch (cloudErr) {
        console.warn("Failed to delete image from Cloudinary:", cloudErr.message);
      }
    }

    await Gallery.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
        message: "Gallery item deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete gallery item", error: error.message },
      { status: 500 }
    );
  }
}
