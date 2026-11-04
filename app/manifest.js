import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export default async function manifest() {
  let appIconUrl = "/sdc_seal.png";
  let appName = "Scofist";
  let appShortName = "Scofist";
  let appDescription =
    "Join Sa-adiya Da-awa College, where Islamic and academic excellence meet. Offering a range of programs designed for intellectual and spiritual development.";

  try {
    await connectToDB();
    const settings = await Settings.findOne({}).lean();
    if (settings?.general?.appIcon?.url) {
      appIconUrl = settings.general.appIcon.url;
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

  // Format exact 192x192 and 512x512 PNGs for Android WebAPK minting server
  let icon192 = appIconUrl;
  let icon512 = appIconUrl;
  let iconMaskable = appIconUrl;
  let iconType = "image/png";

  if (appIconUrl.includes("res.cloudinary.com") && appIconUrl.includes("/upload/")) {
    icon192 = appIconUrl.replace("/upload/", "/upload/w_192,h_192,c_fill,f_png,q_auto/");
    icon512 = appIconUrl.replace("/upload/", "/upload/w_512,h_512,c_fill,f_png,q_auto/");
    iconMaskable = appIconUrl.replace("/upload/", "/upload/w_512,h_512,c_pad,b_white,f_png,q_auto/");
    iconType = "image/png";
  } else if (appIconUrl.toLowerCase().endsWith(".svg") || appIconUrl.includes(".svg?")) {
    iconType = "image/svg+xml";
  }

  return {
    id: "/",
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
        src: icon192,
        sizes: "192x192",
        type: iconType,
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: iconType,
        purpose: "any",
      },
      {
        src: iconMaskable,
        sizes: "512x512",
        type: iconType,
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
            src: icon192,
            sizes: "96x96",
            type: iconType,
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
            src: icon192,
            sizes: "96x96",
            type: iconType,
          },
        ],
      },
    ],
  };
}
