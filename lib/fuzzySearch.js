function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Standard Levenshtein Distance with transposition support (Damerau-Levenshtein)
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
  if (!a || !b) return (a || b || "").length;
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();

  const m = s1.length;
  const n = s2.length;
  const d = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[m][n];
}

/**
 * Calculate normalized similarity between two strings (0.0 to 1.0)
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function stringSimilarity(a, b) {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;

  // Exact substring match bonus (only for tokens >= 3 characters and sufficient coverage)
  const minLen = Math.min(s1.length, s2.length);
  const maxLen = Math.max(s1.length, s2.length);
  if (minLen >= 3 && minLen / maxLen >= 0.4 && (s1.includes(s2) || s2.includes(s1))) {
    return 0.8 + 0.2 * (minLen / maxLen);
  }

  const distance = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Common typo dictionary for administrative and educational terms
 */
export const COMMON_TYPOS = {
  studnt: "student",
  studnts: "students",
  studetn: "student",
  studetns: "students",
  stdnt: "student",
  stdnts: "students",
  stduent: "student",
  stduents: "students",
  atenance: "attendance",
  attendence: "attendance",
  attendace: "attendance",
  atendance: "attendance",
  attandance: "attendance",
  attandence: "attendance",
  att: "attendance",
  techer: "teacher",
  techers: "teachers",
  faclty: "faculty",
  falcuty: "faculty",
  reslt: "result",
  reslts: "results",
  rsult: "result",
  rsults: "results",
  mrk: "mark",
  mrks: "marks",
  makrs: "marks",
  firt: "first",
  fst: "first",
  secnd: "second",
  snd: "second",
  finl: "final",
  fnl: "final",
  clas: "class",
  clss: "class",
  clases: "classes",
  btch: "batch",
  btchs: "batches",
  libary: "library",
  libray: "library",
  librry: "library",
  bok: "book",
  boks: "books",
  rentl: "rental",
  rentls: "rentals",
  debr: "debtor",
  debrs: "debtors",
  debetor: "debtor",
  debetors: "debtors",
  remrk: "remark",
  remrks: "remarks",
  gtpass: "gatepass",
  gatpass: "gatepass",
  leav: "leave",
  leavs: "leaves",
  tam: "team",
  tams: "teams",
  ponit: "point",
  ponits: "points",
  stge: "stage",
};

/**
 * Educational abbreviations and alias expansions
 */
export const COMMON_ALIASES = {
  "pg 1": "PG FIRST YEAR",
  "pg 2": "PG FINAL YEAR",
  "pg 1st": "PG FIRST YEAR",
  "pg 2nd": "PG FINAL YEAR",
  "pg first": "PG FIRST YEAR",
  "pg final": "PG FINAL YEAR",
  "pg fst": "PG FIRST YEAR",
  "pg fnl": "PG FINAL YEAR",
  "degree 1": "DEGREE FIRST YEAR",
  "degree 2": "DEGREE SECOND YEAR",
  "degree 3": "DEGREE FINAL YEAR",
  "degree 1st": "DEGREE FIRST YEAR",
  "degree 2nd": "DEGREE SECOND YEAR",
  "degree 3rd": "DEGREE FINAL YEAR",
  "degree first": "DEGREE FIRST YEAR",
  "degree second": "DEGREE SECOND YEAR",
  "degree final": "DEGREE FINAL YEAR",
  "plus 1": "PLUS ONE",
  "plus 2": "PLUS TWO",
  "+1": "PLUS ONE",
  "+2": "PLUS TWO",
  "plus one": "PLUS ONE",
  "plus two": "PLUS TWO",
  fy: "FIRST YEAR",
  sy: "SECOND YEAR",
  ty: "FINAL YEAR",
};

/**
 * Canonical college classes (standard in Scofist database)
 */
export const CANONICAL_CLASSES = [
  { id: "CLS-1", name: "PLUS ONE", aliases: ["plus one", "+1", "plus 1", "p1"] },
  { id: "CLS-2", name: "PLUS TWO", aliases: ["plus two", "+2", "plus 2", "p2"] },
  { id: "CLS-3", name: "DEGREE FIRST YEAR", aliases: ["degree first year", "degree 1", "degree 1st", "fy degree"] },
  { id: "CLS-4", name: "DEGREE SECOND YEAR", aliases: ["degree second year", "degree 2", "degree 2nd", "sy degree"] },
  { id: "CLS-5", name: "DEGREE FINAL YEAR", aliases: ["degree final year", "degree 3", "degree 3rd", "ty degree"] },
  { id: "CLS-6", name: "PG FIRST YEAR", aliases: ["pg first year", "pg 1", "pg 1st", "fy pg", "pg firt"] },
  { id: "CLS-7", name: "PG FINAL YEAR", aliases: ["pg final year", "pg 2", "pg 2nd", "ty pg", "pg fnl"] },
];

/**
 * Canonical college batches
 */
export const CANONICAL_BATCHES = [
  { id: "BAT-1", name: "BLUMEA", aliases: ["blumea", "bluma", "blomea", "bloom"] },
  { id: "BAT-2", name: "NOVEA", aliases: ["novea", "novia", "nova", "nov"] },
  { id: "BAT-3", name: "AURELIA", aliases: ["aurelia", "auralia", "aurel"] },
  { id: "BAT-4", name: "ORCHID", aliases: ["orchid", "orchd"] },
];

/**
 * Canonical college arts fest teams
 */
export const CANONICAL_TEAMS = [
  { id: "TEAM-1", name: "DEEDATIAN", aliases: ["deedatian", "dedatian", "dedatn", "deedat", "deedatins"] },
  { id: "TEAM-2", name: "ATTASIAN", aliases: ["attasian", "atasian", "attas", "atasn"] },
  { id: "TEAM-3", name: "AL-GHAZALI", aliases: ["al-ghazali", "ghazali", "gazali", "alghazali"] },
];

/**
 * Match a string token against a list of candidates using fuzzy similarity
 * @param {string} token
 * @param {Array<string|object>} candidates - List of string names or objects with name/aliases
 * @param {number} threshold - Minimum similarity score (default 0.65)
 * @returns {{ match: object|string, score: number }|null}
 */
export function fuzzyMatchEntity(token, candidates, threshold = 0.65) {
  if (!token || !candidates || candidates.length === 0) return null;
  const cleanToken = token.toLowerCase().trim();

  let bestMatch = null;
  let bestScore = 0;

  for (const item of candidates) {
    if (typeof item === "string") {
      const score = stringSimilarity(cleanToken, item);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = item;
      }
    } else if (item && typeof item === "object") {
      const targetName = item.name || item.title || "";
      let score = stringSimilarity(cleanToken, targetName);

      // Check item aliases if provided
      if (Array.isArray(item.aliases)) {
        for (const alias of item.aliases) {
          const aliasScore = stringSimilarity(cleanToken, alias);
          if (aliasScore > score) {
            score = aliasScore;
          }
        }
      }

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = item;
      }
    }
  }

  return bestScore >= threshold ? { match: bestMatch, score: bestScore } : null;
}

/**
 * Normalize and clean a user query by correcting common educational typos
 * and resolving known alias phrases
 * @param {string} rawQuery
 * @returns {{ normalizedQuery: string, corrections: Array<{ original: string, corrected: string }>, matchedClass: object|null, matchedBatch: object|null, matchedTeam: object|null }}
 */
export function normalizeQueryIntent(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") {
    return {
      normalizedQuery: "",
      corrections: [],
      matchedClass: null,
      matchedBatch: null,
      matchedTeam: null,
    };
  }

  let text = rawQuery.trim();
  const lowerText = text.toLowerCase();
  const corrections = [];

  // 1. Expand multi-word aliases (e.g. "pg 1st" -> "PG FIRST YEAR")
  for (const [alias, canonical] of Object.entries(COMMON_ALIASES)) {
    const aliasRegex = new RegExp(`\\b${alias.replace("+", "\\+")}\\b`, "i");
    if (aliasRegex.test(text)) {
      text = text.replace(aliasRegex, canonical);
      corrections.push({ original: alias, corrected: canonical });
    }
  }

  // 2. Token-by-token typo correction
  const words = text.split(/\s+/);
  const correctedWords = words.map((w) => {
    const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (COMMON_TYPOS[cleanWord]) {
      const corrected = COMMON_TYPOS[cleanWord];
      corrections.push({ original: w, corrected });
      return w.replace(new RegExp(cleanWord, "i"), corrected);
    }
    return w;
  });

  const normalizedQuery = correctedWords.join(" ");

  // 3. Extract canonical class match
  let matchedClass = null;
  for (const cls of CANONICAL_CLASSES) {
    const nameRegex = new RegExp(`\\b${cls.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (nameRegex.test(normalizedQuery)) {
      matchedClass = cls;
      break;
    }
    // Check aliases
    if (cls.aliases.some((a) => new RegExp(`(?:^|\\s)${escapeRegex(a)}(?:$|\\s)`, "i").test(normalizedQuery))) {
      matchedClass = cls;
      break;
    }
  }

  // If no exact class match, attempt fuzzy resolution on n-grams of the query
  if (!matchedClass) {
    const classCandidates = CANONICAL_CLASSES.map((c) => ({
      name: c.name,
      id: c.id,
      aliases: c.aliases,
    }));
    // Check 2-word and 3-word ngrams
    const tokens = normalizedQuery.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      const bigram = tokens.slice(i, i + 2).join(" ");
      const trigram = tokens.slice(i, i + 3).join(" ");
      const match = fuzzyMatchEntity(trigram, classCandidates, 0.7) || fuzzyMatchEntity(bigram, classCandidates, 0.7);
      if (match) {
        matchedClass = match.match;
        break;
      }
    }
  }

  // 4. Extract canonical batch match
  let matchedBatch = null;
  for (const b of CANONICAL_BATCHES) {
    const nameRegex = new RegExp(`\\b${b.name}\\b`, "i");
    if (nameRegex.test(normalizedQuery)) {
      matchedBatch = b;
      break;
    }
    if (b.aliases.some((a) => new RegExp(`(?:^|\\s)${escapeRegex(a)}(?:$|\\s)`, "i").test(normalizedQuery))) {
      matchedBatch = b;
      break;
    }
  }
  const filterStopWords = (w) =>
    w.length >= 4 &&
    !/^(what|when|where|which|who|whom|whose|how|many|students|teachers|first|second|final|year|batch|class|team|teams|points|stage|arts|fest|total|show|list|give)$/i.test(w);

  if (!matchedBatch) {
    for (const word of words.filter(filterStopWords)) {
      const match = fuzzyMatchEntity(word, CANONICAL_BATCHES, 0.72);
      if (match) {
        matchedBatch = match.match;
        break;
      }
    }
  }

  // 5. Extract canonical team match
  let matchedTeam = null;
  for (const tm of CANONICAL_TEAMS) {
    const nameRegex = new RegExp(`\\b${escapeRegex(tm.name)}\\b`, "i");
    if (nameRegex.test(normalizedQuery)) {
      matchedTeam = tm;
      break;
    }
    if (tm.aliases.some((a) => new RegExp(`(?:^|\\s)${escapeRegex(a)}(?:$|\\s)`, "i").test(normalizedQuery))) {
      matchedTeam = tm;
      break;
    }
  }
  if (!matchedTeam) {
    for (const word of words.filter(filterStopWords)) {
      const match = fuzzyMatchEntity(word, CANONICAL_TEAMS, 0.7);
      if (match) {
        matchedTeam = match.match;
        break;
      }
    }
  }

  return {
    normalizedQuery,
    corrections,
    matchedClass,
    matchedBatch,
    matchedTeam,
  };
}
