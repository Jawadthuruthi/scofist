import { redirect } from "next/navigation";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export default async function TeamPointsRootPage() {
  await connectToDB();
  const settings = await Settings.findOne({}).lean();
  const activeYear =
    settings?.festival?.festivalInfo?.year ||
    settings?.activeYear?.split(" ")[0] ||
    "2025";
  redirect(`/team-points/${activeYear}`);
}
