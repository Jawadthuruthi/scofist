import { cache } from "react";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

/**
 * Normalizes settings matching the exact transformation provided by /api/settings
 * (session festival injection, default schedule structure, app logo/icon defaults).
 */
export function normalizeSettings(rawSettings, activeYear = null) {
  if (!rawSettings) return null;
  const settings = JSON.parse(JSON.stringify(rawSettings));

  const targetYear = activeYear || settings.activeYear || "2025 november";

  // Inject session-specific festival settings
  if (settings.festivals && settings.festivals.length > 0) {
    const festivalForYear = settings.festivals.find((f) => f.year === targetYear);
    if (festivalForYear) {
      settings.festival = festivalForYear;
    } else {
      settings.festival = {
        year: targetYear,
        festivalInfo: { year: parseInt(targetYear, 10) || new Date().getFullYear() },
        resultPosters: [],
      };
    }
  } else if (targetYear && targetYear !== "2025 november") {
    settings.festival = {
      year: targetYear,
      festivalInfo: { year: parseInt(targetYear, 10) || new Date().getFullYear() },
      resultPosters: [],
    };
  }

  // Ensure default schedules and logos in settings.general
  if (settings.general) {
    if (!settings.general.appLogo && settings.general.appIcon) {
      settings.general.appLogo = settings.general.appIcon;
    } else if (!settings.general.appIcon && settings.general.appLogo) {
      settings.general.appIcon = settings.general.appLogo;
    }

    if (!settings.general.schedules || settings.general.schedules.length === 0) {
      settings.general.schedules = [
        { id: "normal", name: "Normal Schedule", isDefault: true },
        { id: "thursday", name: "Thursday Schedule", isDefault: true },
      ];
    }
    if (!settings.general.activeSchedule) {
      settings.general.activeSchedule = settings.general.isSpecialDay ? "thursday" : "normal";
    }
  }

  return settings;
}

/**
 * React.cache memoized loader for application settings.
 * Directly reads from MongoDB using connectToDB and .lean(),
 * completely eliminating internal HTTP self-fetch loops and middleware invocations
 * while maintaining 100% normalization parity.
 */
export const getCachedSettings = cache(async (activeYear) => {
  try {
    await connectToDB();
    const rawSettings = await Settings.findOne({}).lean();
    if (!rawSettings) return null;
    return normalizeSettings(rawSettings, activeYear);
  } catch (error) {
    console.error("Failed to load cached settings:", error);
    return null;
  }
});
