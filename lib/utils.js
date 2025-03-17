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

export { cn, generateSecureOTP, baseURL, getDefaultValues };
