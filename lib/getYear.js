import Settings from "@/models/Settings";

/**
 * Extracts the active year from the request.
 * Priority: Query Param > Header > Settings Default
 */
export async function getYear(req) {
  try {
    const url = new URL(req.url);
    const queryYear = url.searchParams.get("year");
    if (queryYear) return queryYear;

    const headerYear = req.headers.get("active-year");
    if (headerYear) return headerYear;

    // Fallback to activeYear from settings
    const settings = await Settings.findOne({});
    if (settings) {
      const fetchedYears = settings.years || ["2025 november"];
      let activeYear = settings.activeYear;

      if (!activeYear || !fetchedYears.includes(activeYear)) {
        activeYear = fetchedYears.length > 0 ? fetchedYears[fetchedYears.length - 1] : "2025 november";
      }
      return activeYear;
    }
    
    return "2025 november";
  } catch (error) {
    console.error("Error getting year from request:", error);
    return "2025 november";
  }
}
