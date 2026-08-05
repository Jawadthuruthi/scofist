import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export default async function manifest() {
  let appIconUrl = "/favicon.svg";
  let appIconType = "image/svg+xml";

  try {
    await connectToDB();
    const settings = await Settings.findOne({}).lean();
    if (settings?.general?.appIcon?.url) {
      appIconUrl = settings.general.appIcon.url;
      appIconType = "image/png"; // Using a general type, browsers usually handle png/jpg fine
    }
  } catch (error) {
    console.error("Error fetching app icon for manifest:", error);
  }

  return {
    name: "Scofist",
    short_name: "Scofist",
    description:
      "Join Sa-adiya Da-awa College, where Islamic and academic excellence meet. Offering a range of programs designed for intellectual and spiritual development.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#008000",
    icons: [
      {
        src: appIconUrl,
        sizes: "192x192",
        type: appIconType,
        purpose: "any",
      },
      {
        src: appIconUrl,
        sizes: "512x512",
        type: appIconType,
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "My Periods",
        short_name: "Periods",
        description: "View your teaching periods and schedule",
        url: "/dashboard/my-periods",
        icons: [
          {
            src: appIconUrl,
            sizes: "96x96",
            type: appIconType,
          },
        ],
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Go to main dashboard",
        url: "/dashboard",
        icons: [
          {
            src: appIconUrl,
            sizes: "96x96",
            type: appIconType,
          },
        ],
      },
    ],
  };
}
