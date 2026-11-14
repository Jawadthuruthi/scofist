import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function generateSecureOTP() {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array, (num) => num % 10).join("");
}

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT || 3000}`
      : process.env.NEXT_PUBLIC_BASE_URL;



const getDefaultValues = (data, formFields) => {
  const defaults = {};
  
  if (!formFields || !Array.isArray(formFields)) return defaults;

  let flatData = data;
  if (data && typeof data === 'object') {
    flatData = {
      ...data,
      ...(data.address || {}),
      ...(data.profilePic || {}),
      ...(data.contact || {})
    };
  }

  formFields.forEach((field) => {
    const value = flatData ? flatData[field.name] : undefined;

    if (flatData && value !== undefined && value !== null) {
      // Handle objects for select/async fields by extracting the ID
      if (value && typeof value === 'object' && !Array.isArray(value) && 
          ['select', 'async-text'].includes(field.inputType)) {
        defaults[field.name] = value._id || value.id || value;
      } else if (field.inputType === "multiSelect") {
        if (!Array.isArray(value)) {
          defaults[field.name] = typeof value === 'object' && value !== null ? [value._id || value.id || value] : [value];
        } else {
          defaults[field.name] = value.map(v => typeof v === 'object' && v !== null ? (v._id || v.id || v) : v);
        }
      } else if (field.type === "date") {
        if (typeof value === "string" && value.includes("T")) {
          defaults[field.name] = value.split("T")[0];
        } else {
          try {
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
               defaults[field.name] = parsedDate.toISOString().split("T")[0];
            } else {
               defaults[field.name] = value;
            }
          } catch(e) {
            defaults[field.name] = value;
          }
        }
      } else {
        defaults[field.name] = value;
      }
    } else if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue;
    } else if (field.inputType === "multiSelect") {
      defaults[field.name] = [];
    } else if (field.type === "number") {
      defaults[field.name] = "";
    } else if (field.type === "object" || field.inputType === "image") {
      defaults[field.name] = undefined;
    } else {
      defaults[field.name] = "";
    }
  });
  return defaults;
};

const OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "notEquals",
  CONTAINS: "contains",
  NOT_CONTAINS: "notContains",
  STARTS_WITH: "startsWith",
  ENDS_WITH: "endsWith",
  GREATER_THAN: "greaterThan",
  LESS_THAN: "lessThan",
  GREATER_THAN_OR_EQUAL: "greaterThanOrEqual",
  LESS_THAN_OR_EQUAL: "lessThanOrEqual",
  BETWEEN: "between",
  INCLUDES: "includes",
  EXCLUDES: "excludes",
  IS_EMPTY: "isEmpty",
  IS_NOT_EMPTY: "isNotEmpty",
  IS_NULL: "isNull",
  IS_NOT_NULL: "isNotNull",
  REGEX: "regex",
  DATE_RANGE: "dateRange",
};

const parseUser = (headerStore) => {
  const userHeader = headerStore.get("x-user");
  return userHeader && userHeader !== "undefined" ? JSON.parse(userHeader) : {};
};

async function fetchData(endpoint, searchParams, revalidateTime = 60, key) {
  const apiKey = process.env.API_KEY;
  const url = `${baseURL}/api/${endpoint}?${searchParams ? searchParams : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      next: { revalidate: revalidateTime, tags: [endpoint] },
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text();
      const errorMessage = `Fetch failed for ${url}: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data[key ? key : endpoint] || [];
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return [];
  }
}

const formatOptions = (items = [], labelKey, valueKey = "_id") =>
  (items || []).map((item) => {
    let label;
    if (Array.isArray(labelKey)) {
      label = labelKey.map((k) => {
        if (typeof k === "string") {
          const fallbacks = k.split('|');
          for (const fb of fallbacks) {
            let val;
            if (fb.includes('.')) {
              val = fb.split('.').reduce((acc, part) => acc && acc[part], item);
            } else {
              val = item[fb];
            }
            if (val) return val;
          }
        }
        return item[k];
      }).filter(Boolean).join(" - ");
    } else if (labelKey) {
      label = item[labelKey];
    } else {
      // Default fallback or specific logic
      label = item.endYear ? `${item.name} (${item.endYear})` : item.name;
    }
    return {
      value: item[valueKey],
      label: label || "Unknown",
      ...item,
    };
  });

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getISTDate = (date = new Date()) => {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
};

const getISTDateString = (date = new Date()) => {
  if (!date) return null;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
};

const formatDate = (date) => {
  if (date === null) return null;
  return getISTDateString(date || new Date());
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) {
    return null;
  }
  let date;
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split("-").map(Number);
    date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  } else {
    date = new Date(dateString);
  }
  if (isNaN(date.getTime())) {
    return null;
  }
  const dayOfMonth = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", day: "numeric" }).format(date);
  const monthName = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", month: "long" }).format(date);
  const year = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric" }).format(date);
  const dayOfWeek = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(date);

  return `${dayOfMonth} ${monthName} ${year}, ${dayOfWeek}`;
};

const formatDateMonthYear = (dateString) => {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  const istDate = getISTDate(date);
  const dayOfMonth = istDate.getDate();
  const monthName = istDate.toLocaleString("en-US", { month: "long" });
  const year = istDate.getFullYear();

  return `${dayOfMonth} ${monthName} ${year}`;
};

const formatMonthYear = (dateString) => {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  const istDate = getISTDate(date);
  const monthName = istDate.toLocaleString("en-US", { month: "long" });
  const year = istDate.getFullYear();

  return `${monthName} ${year}`;
};

const formatDateShort = (dateString) => {
  if (!dateString) {
    return null;
  }
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  const istDate = getISTDate(date);
  const day = String(istDate.getDate()).padStart(2, "0");
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const year = istDate.getFullYear();

  return `${day}/${month}/${year}`;
};

const formatTime12Hour = (input) => {
  if (!input) return "-";

  // Handle Date objects using consistent IST timezone
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return "-";
    const ist = getISTDate(input);
    const hours = ist.getHours();
    const minutes = ist.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  }

  const str = String(input).trim();
  if (!str) return "-";
  if (/AM|PM/i.test(str)) return str;

  // Handle ISO timestamp or date strings (e.g. 2026-11-14T09:30:00.000Z or 2026-11-14)
  if (str.includes("T") || (str.includes("-") && str.length > 5)) {
    const d = getISTDate(str);
    if (!isNaN(d.getTime())) {
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes} ${ampm}`;
    }
  }

  // Handle raw time strings like "09:30", "9:30", or "14:45:00"
  const parts = str.split(":");
  if (parts.length >= 2 && /^\d{1,2}$/.test(parts[0]) && /^\d{2}/.test(parts[1])) {
    const hours24 = parseInt(parts[0], 10);
    const minutesNum = parseInt(parts[1].slice(0, 2), 10);
    if (hours24 >= 0 && hours24 < 24 && minutesNum >= 0 && minutesNum < 60) {
      const minutes = minutesNum.toString().padStart(2, "0");
      const ampm = hours24 >= 12 ? "PM" : "AM";
      const hours12 = hours24 % 12 || 12;
      return `${hours12}:${minutes} ${ampm}`;
    }
  }

  // Fallback date attempt
  const fallbackDate = getISTDate(str);
  if (!isNaN(fallbackDate.getTime())) {
    const hours = fallbackDate.getHours();
    const minutes = fallbackDate.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  }

  return str;
};

const twelveHourFormatLocalTime = (input) => {
  return formatTime12Hour(input);
};

const getPeriodTimeString = (period) => {
  if (!period) return "";
  if (typeof period.formattedTime === "string" && period.formattedTime.trim()) {
    return period.formattedTime.trim();
  }
  const start = period.startTime || period.formattedStartTime;
  const end = period.endTime || period.formattedEndTime;
  if (start && end) {
    const s = formatTime12Hour(start);
    const e = formatTime12Hour(end);
    if (s && e && s !== "-" && e !== "-") {
      return `${s} - ${e}`;
    }
  }
  return "";
};

const parseDate = (dateString) => {
  const [year, month, day] = dateString.split("-");
  return new Date(year, month - 1, day);
};

function applyCorsHeaders(req, res) {
  console.log("Applying CORS headers");
  res.headers.set("Access-Control-Allow-Origin", baseURL);
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}

function removeEmptyValuesDeep(obj) {
  if (Array.isArray(obj)) {
    return obj
      .map(removeEmptyValuesDeep)
      .filter((v) => v !== undefined && v !== null && v !== "");
  } else if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const cleaned = removeEmptyValuesDeep(value);
      if (
        cleaned !== undefined &&
        cleaned !== null &&
        cleaned !== "" &&
        (typeof cleaned !== "object" || Object.keys(cleaned).length > 0)
      ) {
        acc[key] = cleaned;
      }
      return acc;
    }, {});
  }
  return obj;
}

const applyPrintStyles = () => {
  const style = document.createElement("style");
  style.id = "pdf-print-style";

  style.textContent = `
    @page {
      size: portrait;
      margin: 15mm;
    }
    .print\\:block {
      display: block !important;
    }
    .print\\:flex {
      display: flex !important;
    }
    .print\\:inline {
      display: inline !important;
    }
    .print\\:inline-block {
      display: inline-block !important;
    }
    .print\\:hidden {
      display: none !important;
    }
    .print\\:table {
      display: table !important;
    }
    .print\\:table-row-group {
      display: table-row-group !important;
    }
    .table-print {
      max-height: 100% !important;
      overflow: visible !important;
    }
    .print\\:max-h-none {
      max-height: none !important;
    }
    .print\\:overflow-visible {
      overflow: visible !important;
    }  
  `;

  document.head.appendChild(style);
};

const removePrintStyles = () => {
  const style = document.getElementById("pdf-print-style");
  if (style) style.remove();
};

/**
 * Generate unique letters from the first N letters of alphabet in random order
 * @param {number} count - Number of letters to generate (1-26)
 * @param {number} [seed] - Optional seed for deterministic results
 * @returns {string[]} Array of first N letters in random order
 */
export function generateRandomLetters(count) {
  const clampedCount = Math.max(1, Math.min(26, count));

  // Create first N letters array
  const letters = [];
  for (let i = 0; i < clampedCount; i++) {
    letters.push(String.fromCharCode(97 + i));
  }

  // Enhanced Fisher-Yates shuffle with multiple passes
  for (let pass = 0; pass < 3; pass++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
  }

  return letters;
}

const CLASS_ORDER = [
  "PLUS ONE",
  "PLUS ONE A",
  "PLUS ONE B",
  "PLUS TWO",
  "PLUS TWO A",
  "PLUS TWO B",
  "DEGREE FIRST YEAR",
  "DEGREE 1ST YEAR",
  "DEGREE 1",
  "DEGREE SECOND YEAR",
  "DEGREE 2ND YEAR",
  "DEGREE 2",
  "DEGREE THIRD YEAR",
  "DEGREE 3RD YEAR",
  "DEGREE 3",
  "PG FIRST YEAR",
  "PG 1ST YEAR",
  "PG 1",
  "PG SECOND YEAR",
  "PG 2ND YEAR",
  "PG 2",
  "EIGHT",
  "EIGHTH",
  "8TH",
  "8TH STD",
  "NINE",
  "NINTH",
  "9TH",
  "9TH STD",
  "TEN",
  "TENTH",
  "10TH",
  "10TH STD",
  "11TH STD",
  "12TH STD",
].map(name => name.replace(/\s/g, "").toUpperCase());

const defaultGetClassName = (item) => {
  if (typeof item === "string") return item;
  if (!item) return "";
  return item.originalName || item.name || item.className || item.label || "";
};

const sortClasses = (a, b, getName = defaultGetClassName) => {
  const extractor = typeof getName === "function" ? getName : defaultGetClassName;
  let nameA = String(extractor(a) || "").trim().toUpperCase().replace(/\s/g, "");
  let nameB = String(extractor(b) || "").trim().toUpperCase().replace(/\s/g, "");

  nameA = nameA.replace(/\+1/g, "PLUSONE").replace(/\+2/g, "PLUSTWO");
  nameB = nameB.replace(/\+1/g, "PLUSONE").replace(/\+2/g, "PLUSTWO");

  let indexA = CLASS_ORDER.indexOf(nameA);
  let indexB = CLASS_ORDER.indexOf(nameB);

  let matchA = indexA !== -1 ? CLASS_ORDER[indexA] : null;
  let matchB = indexB !== -1 ? CLASS_ORDER[indexB] : null;

  // If exact match fails, try partial match (e.g. for "+1 Commerce", "BA DEGREE FIRST YEAR")
  if (indexA === -1) {
    indexA = CLASS_ORDER.findIndex(cls => nameA.includes(cls));
    if (indexA !== -1) matchA = CLASS_ORDER[indexA];
  }
  if (indexB === -1) {
    indexB = CLASS_ORDER.findIndex(cls => nameB.includes(cls));
    if (indexB !== -1) matchB = CLASS_ORDER[indexB];
  }

  if (indexA !== -1 && indexB !== -1) {
    // Sort by class tier/year first (+1 -> +2 -> Degree 1 -> Degree 2...)
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    // If same tier, sort alphabetically by stream/division (e.g. Commerce vs Science)
    const remainingA = nameA.replace(matchA, "");
    const remainingB = nameB.replace(matchB, "");
    const remDiff = remainingA.localeCompare(remainingB);
    if (remDiff !== 0) return remDiff;
    return String(extractor(a) || "").localeCompare(String(extractor(b) || ""));
  }
  if (indexA !== -1) {
    return -1;
  }
  if (indexB !== -1) {
    return 1;
  }
  return nameA.localeCompare(nameB);
};

const sortTeachers = (teachers = []) => {
  return [...teachers].sort((a, b) => {
    if (a.dateOfBirth && b.dateOfBirth) {
      return new Date(a.dateOfBirth) - new Date(b.dateOfBirth);
    }
    if (a.dateOfBirth) return -1;
    if (b.dateOfBirth) return 1;
    return 0;
  });
};

const copyToClipboard = async (text) => {
  if (typeof window === "undefined" || !text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("navigator.clipboard.writeText failed, trying fallback:", e);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return !!successful;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
};

/**
 * Returns WhatsApp URL (direct native app scheme on mobile, WhatsApp Web on desktop).
 */
const getWhatsAppUrl = (phone, message = "") => {
  let cleanPhone = String(phone || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }
  const encodedText = encodeURIComponent(message);
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
};

/**
 * Opens WhatsApp chat.
 * On mobile devices, uses the direct `whatsapp://send` custom scheme.
 * This guarantees:
 * 1. Native WhatsApp app opens directly without an intermediate browser redirect tab.
 * 2. In the mobile WhatsApp chat input, the cursor is positioned at the very end of the text message (not at the beginning).
 * On desktop, opens WhatsApp Web in a new tab.
 */
const openWhatsAppChat = (phone, message = "") => {
  if (!phone) return;
  let cleanPhone = String(phone || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }
  const encodedText = encodeURIComponent(message);
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    window.open(
      `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
};

export {
  cn,
  generateSecureOTP,
  baseURL,
  getDefaultValues,
  OPERATORS,
  parseUser,
  fetchData,
  formatOptions,
  DAYS,
  WEEKDAYS,
  getISTDate,
  getISTDateString,
  formatDate,
  formatDateForDisplay,
  formatDateMonthYear,
  formatMonthYear,
  formatDateShort,
  twelveHourFormatLocalTime,
  formatTime12Hour,
  getPeriodTimeString,
  parseDate,
  applyCorsHeaders,
  removeEmptyValuesDeep,
  applyPrintStyles,
  removePrintStyles,
  CLASS_ORDER,
  sortClasses,
  sortTeachers,
  copyToClipboard,
  getWhatsAppUrl,
  openWhatsAppChat,
};
