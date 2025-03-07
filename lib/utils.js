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
    : process.env.BASE_URL;

export { cn, generateSecureOTP, baseURL };
