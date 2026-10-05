import GalleryYearPage from "./[year]/page";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export default async function CollegeGalleryRootPage() {
  await connectToDB();
  const settings = await Settings.findOne({}).lean();
  let activeYear =
    settings?.festival?.festivalInfo?.year ||
    settings?.activeYear?.split(" ")[0] ||
    "2026";

  // Try to find the most recent year with a College Admin upload
  const latestAdminUpload = await connectToDB().then(() => 
    import("@/models/Gallery").then((m) => m.default.findOne({ uploadedBy: "College Admin" }).sort({ year: -1 }).lean())
  ).catch(() => null);

  if (latestAdminUpload && latestAdminUpload.year) {
    activeYear = latestAdminUpload.year;
  }

  return <GalleryYearPage initialYear={activeYear} />;
}
