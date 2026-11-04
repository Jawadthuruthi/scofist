import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export default async function manifest() {
  let appIconUrl = "/sdc_seal.png";
  let appIconType = "image/png";
  let appName = "Scofist";
  let appShortName = "Scofist";
  let appDescription =
    "Join Sa-adiya Da-awa College, where Islamic and academic excellence meet. Offering a range of programs designed for intellectual and spiritual development.";

  try {
    await connectToDB();
    const settings = await Settings.findOne({}).lean();
    const resolvedUrl =
      settings?.general?.appIcon?.url ||
      settings?.institution?.logo?.url;

    if (resolvedUrl) {
      appIconUrl = resolvedUrl;
      const lower = resolvedUrl.toLowerCase();
      if (lower.endsWith(".svg") || lower.includes(".svg?")) {
        appIconType = "image/svg+xml";
      } else if (lower.endsWith(".webp") || lower.includes(".webp?")) {
        appIconType = "image/webp";
      } else {
        appIconType = "image/png";
      }
    }

    if (settings?.institution?.name) {
      appName = settings.institution.name;
    }
    if (settings?.institution?.tagline) {
      appDescription = settings.institution.tagline;
    }
  } catch (error) {
    console.error("Error fetching app icon for manifest:", error);
  }

  return {
    name: appName,
    short_name: appShortName,
    description: appDescription,
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
      {
        src: appIconUrl,
        sizes: "512x512",
        type: appIconType,
        purpose: "maskable",
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
