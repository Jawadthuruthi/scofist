import Settings from "@/models/Settings";

/**
 * Extracts the active year from the request.
 * Priority: Query Param > Header > Cookie > Settings Default
 */
export async function getYear(req) {
  try {
    const url = new URL(req.url);
    const queryYear = url.searchParams.get("year");
    const headerYear = req.headers.get("active-year");
    
    let yearToUse = queryYear || headerYear;

    if (!yearToUse) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/active-year=([^;]+)/);
        if (match) {
          yearToUse = decodeURIComponent(match[1]);
        }
      }
    }

    // Try to match short years (e.g. "2026") to full years (e.g. "2026 september")
    const settings = await Settings.findOne({});
    if (settings) {
      const fetchedYears = settings.years || ["2025 november"];
      
      if (yearToUse) {
        if (!fetchedYears.includes(yearToUse)) {
          // Find first year that starts with the requested year (case-insensitive)
          const lowerYearToUse = yearToUse.toLowerCase();
          const match = fetchedYears.find(y => y.toLowerCase().startsWith(lowerYearToUse));
          if (match) return match;
        }
        return yearToUse;
      }

      let activeYear = settings.activeYear;
      if (!activeYear || !fetchedYears.includes(activeYear)) {
        activeYear = fetchedYears.length > 0 ? fetchedYears[fetchedYears.length - 1] : "2025 november";
      }
      return activeYear;
    }
    
    return yearToUse || "2025 november";
  } catch (error) {
    console.error("Error getting year from request:", error);
    return "2025 november";
  }
}
