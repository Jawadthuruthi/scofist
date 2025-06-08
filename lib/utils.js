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
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_BASE_URL;

const getDefaultValues = (data, formFields) => {
  const defaults = {};
  formFields.forEach((field) => {
    if (data && data[field.name] !== undefined) {
      if (field.type === "date" && typeof data[field.name] === "string") {
        defaults[field.name] = data[field.name].split("T")[0];
      } else {
        defaults[field.name] = data[field.name];
      }
    } else if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue;
    } else if (field.inputType === "multiSelect") {
      defaults[field.name] = [];
    } else if (field.type === "number") {
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
  return userHeader !== "undefined" ? JSON.parse(userHeader) : {};
};

async function fetchData(endpoint, searchParams, revalidateTime = 60) {
  const apiKey = process.env.API_KEY;
  const response = await fetch(
    `${baseURL}/api/${endpoint}?${searchParams ? searchParams : ""}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      next: { revalidate: revalidateTime },
      credentials: "include",
    }
  );
  return (await response.json())[endpoint] || [];
}

const formatOptions = (items) =>
  items.map((item) => ({ value: item._id, label: item.name, ...item }));

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

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (date) => {
  if (typeof date === "string") {
    const [year, month, day] = date.split("-");
    date = new Date(year, month - 1, day);
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const twelveHourFormatLocalTime = (input) => {
  const date = new Date(input); // works with Date or ISO string

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata", // force IST
  }).format(date);
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
  formatDate,
  formatDateForDisplay,
  twelveHourFormatLocalTime,
  parseDate,
  applyCorsHeaders,
  removeEmptyValuesDeep,
};
