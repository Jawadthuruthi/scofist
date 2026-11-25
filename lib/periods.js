import { getPeriodTimeString } from "@/lib/utils";

const DEFAULT_SCHEDULES = [
  { id: "normal", name: "Normal Schedule", isDefault: true },
  { id: "thursday", name: "Thursday Schedule", isDefault: true },
];

/**
 * Merges default schedules ("normal", "thursday") with saved custom schedules from Settings.
 */
export function buildMergedSchedules(settings) {
  const savedSchedules = settings?.general?.schedules || [];
  const schedulesMap = new Map();
  DEFAULT_SCHEDULES.forEach((s) => schedulesMap.set(s.id, s));
  savedSchedules.forEach((s) => {
    schedulesMap.set(s.id, {
      id: s.id,
      name: s.name,
      description: s.description,
      isDefault: Boolean(s.isDefault),
    });
  });
  return Array.from(schedulesMap.values());
}

/**
 * Determines whether a YYYY-MM-DD date string (or current IST time when omitted) falls on a Thursday.
 */
function isThursdayInIST(dateStr) {
  if (dateStr) {
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
        return new Date(Date.UTC(y, m, d)).getUTCDay() === 4;
      }
    }
  }
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return istNow.getUTCDay() === 4;
}

function matchesScheduleId(period, scheduleId) {
  if (period.schedule === scheduleId) return true;
  if (!period.schedule) {
    if (scheduleId === "normal") return period.isSpecialDay !== true;
    if (scheduleId === "thursday") return period.isSpecialDay === true;
  }
  return false;
}

/**
 * Resolves the active schedule, filters periods (with normal-schedule fallback),
 * applies optional pagination, and formats period time strings.
 */
export function resolvePeriodsPayload({
  settings,
  allPeriods = [],
  scheduleParam,
  isSpecialDayParam,
  dateParam,
  page = 0,
  limit = Infinity,
}) {
  const allSchedules = buildMergedSchedules(settings);

  let activeScheduleId = settings?.general?.activeSchedule;
  if (!activeScheduleId) {
    activeScheduleId = settings?.general?.isSpecialDay ? "thursday" : "normal";
  }

  const autoThursday = Boolean(settings?.general?.autoThursdaySchedule);
  if (autoThursday && isThursdayInIST(dateParam)) {
    activeScheduleId = "thursday";
  }

  const activeScheduleObj =
    allSchedules.find((s) => s.id === activeScheduleId) || allSchedules[0];

  let filtered;
  if (scheduleParam) {
    if (scheduleParam === "all") {
      filtered = allPeriods;
    } else {
      filtered = allPeriods.filter((p) => matchesScheduleId(p, scheduleParam));
    }
  } else if (isSpecialDayParam !== undefined) {
    if (isSpecialDayParam === "true" || isSpecialDayParam === true) {
      filtered = allPeriods.filter(
        (p) => p.isSpecialDay === true || p.schedule !== "normal"
      );
    } else if (isSpecialDayParam === "false" || isSpecialDayParam === false) {
      filtered = allPeriods.filter((p) => matchesScheduleId(p, "normal"));
    } else if (isSpecialDayParam === "all") {
      filtered = allPeriods;
    } else {
      filtered = allPeriods;
    }
  } else {
    filtered = allPeriods.filter((p) => matchesScheduleId(p, activeScheduleId));
    if (filtered.length === 0 && activeScheduleId !== "normal") {
      filtered = allPeriods.filter((p) => matchesScheduleId(p, "normal"));
    }
  }

  const total = filtered.length;
  const paged =
    Number.isFinite(limit) && limit > 0
      ? filtered.slice(page * limit, page * limit + limit)
      : filtered;

  const periods = paged.map((p) => ({
    ...p,
    formattedTime: p.formattedTime || getPeriodTimeString(p),
  }));

  return {
    periods,
    schedules: allSchedules,
    activeSchedule: activeScheduleId,
    activeScheduleName: activeScheduleObj?.name || "Normal Schedule",
    isSpecialDayActive: activeScheduleId !== "normal",
    pagination: {
      page,
      limit,
      total,
      totalPages: limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
    },
  };
}
