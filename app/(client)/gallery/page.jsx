import GalleryYearPage from "./[year]/page";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export default async function GalleryRootPage() {
  await connectToDB();
  const settings = await Settings.findOne({}).lean();
  const activeYear =
    settings?.festival?.festivalInfo?.year ||
    settings?.activeYear?.split(" ")[0] ||
    "2025";

  return <GalleryYearPage initialYear={activeYear} />;
}
