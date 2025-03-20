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
      defaults[field.name] = data[field.name];
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
};

const parseUser = (headerStore) => {
  const userHeader = headerStore.get("x-user");
  return userHeader !== "undefined" ? JSON.parse(userHeader) : {};
};

export {
  cn,
  generateSecureOTP,
  baseURL,
  getDefaultValues,
  OPERATORS,
  parseUser,
};
