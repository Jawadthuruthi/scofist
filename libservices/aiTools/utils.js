/**
 * Escapes special regex characters to prevent ReDoS and RegExp syntax errors.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Safely parses colloquial and ISO date strings into valid Date objects.
 * Handles "today", "yesterday", or fallbacks to the current date if invalid.
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseQueryDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return new Date();
  const lower = dateStr.trim().toLowerCase();
  if (lower === "today") return new Date();
  if (lower === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Safely builds a flexible RegExp for name searches supporting:
 * - Case insensitivity
 * - Arabic/Islamic spelling variations (Mohammed, Muhammed, Mohamed, Muhammad)
 * - Flexible handling of initials, dots, hyphens, and whitespace (e.g. "T.S" vs "TS" vs "T S")
 * @param {string} searchTerm
 * @returns {RegExp|null}
 */
export function buildNameSearchRegex(searchTerm) {
  if (!searchTerm || typeof searchTerm !== "string") return null;
  const words = searchTerm
    .replace(/[.\-_]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return null;

  const wordPatterns = words.map((word) => {
    if (/^m[ou]hamm?a?e?d$/i.test(word)) {
      return "m[ou]hamm?a?e?d";
    }
    if (word.length <= 3) {
      return word.split("").map(escapeRegex).join("[\\s\\.]*");
    }
    return escapeRegex(word);
  });

  const fullPattern = wordPatterns.join("[\\s\\.\\-_]*");
  return new RegExp(fullPattern, "i");
}
