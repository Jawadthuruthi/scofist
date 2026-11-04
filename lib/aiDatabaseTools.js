import mongoose from "mongoose";

/**
 * Whitelist of permissible read-only collections in Scofist
 */
export const ALLOWED_COLLECTIONS = new Set([
  "users",
  "classes",
  "batches",
  "courses",
  "studentattendances",
  "marks",
  "debtors",
  "librarybooks",
  "rentals",
  "teams",
  "programs",
  "results",
  "remarks",
  "leaverecords",
  "gatepasses",
  "hifzdouras",
  "academiccalendars",
  "subjects",
  "periods",
  "teacherattendances",
  "teachersleaverecords",
  "masjidattendances",
  "updates",
  "downloads",
  "articles",
  "applicationforms",
  "performances",
  "timetables",
  "syllabuses",
  "rankachievers",
]);

/**
 * Forbidden mutation and dangerous execution operators in MongoDB AST
 */
const FORBIDDEN_OPERATORS = new Set([
  "$out",
  "$merge",
  "$where",
  "$function",
  "$accumulator",
  "$eval",
]);

/**
 * Recursively validate query structure against forbidden operators and unwhitelisted collections
 */
function validateQuerySafety(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      validateQuerySafety(item);
    }
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase().trim();
    if (FORBIDDEN_OPERATORS.has(lowerKey)) {
      throw new Error(`Security violation: Forbidden operator '${key}' detected in query.`);
    }
    if (lowerKey === "$lookup" && value && typeof value === "object") {
      const fromCol = (value.from || "").toLowerCase().trim();
      if (fromCol && !ALLOWED_COLLECTIONS.has(fromCol)) {
        throw new Error(`Unauthorized collection access in $lookup: '${fromCol}'. Operation aborted.`);
      }
    }
    validateQuerySafety(value);
  }
}

/**
 * Tool declaration for Google Generative Language API
 */
export const DATABASE_TOOL_DECLARATION = {
  name: "query_college_database",
  description:
    "Execute a read-only MongoDB query or aggregation pipeline to retrieve live data from the Scofist college database. " +
    "Use this tool whenever the user asks for specific records, counts, rankings, statistics, or details across any college collection.",
  parameters: {
    type: "OBJECT",
    properties: {
      collection: {
        type: "STRING",
        description:
          "Target collection name (e.g. 'studentattendances', 'users', 'debtors', 'marks', 'librarybooks', 'rentals', 'teams', 'hifzdouras', 'classes', 'batches')",
      },
      operation: {
        type: "STRING",
        enum: ["aggregate", "find", "count"],
        description: "Operation type: 'aggregate' for pipelines/groupings, 'find' for filtered lists, 'count' for totals",
      },
      pipeline: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
        },
        description:
          "MongoDB aggregation pipeline array of stages (e.g. [{ $match: ... }, { $group: ... }, { $sort: ... }]) for 'aggregate' operation",
      },
      filter: {
        type: "OBJECT",
        description: "MongoDB query filter object for 'find' or 'count' operation",
      },
      projection: {
        type: "OBJECT",
        description: "Projections specifying fields to include (e.g. { name: 1, contactNumber: 1 })",
      },
      sort: {
        type: "OBJECT",
        description: "Sort criteria object (e.g. { createdAt: -1 } or { totalScore: -1 })",
      },
      limit: {
        type: "INTEGER",
        description: "Maximum number of records to return (capped at 50, default 25)",
      },
    },
    required: ["collection", "operation"],
  },
};

/**
 * Concise Schema Catalog for Gemini System Instruction
 */
export const SCOFIST_SCHEMA_CATALOG = `
SCOFIST DATABASE SCHEMA & COLLECTIONS CATALOG:
1. 'users': Enrolled students and faculty.
   - Fields: _id (String ID), name, email, contactNumber, roles (['Student'] or ['Teacher']),
     studentSpecificField: { admissionNumber, classId (ref 'classes' _id like 'CLS-1'), batchId (ref 'batches' _id), status, guardianName, guardianContactNumber },
     teacherSpecificField: { status, dateOfJoining, designation }
2. 'classes': Academic classes/divisions.
   - Fields: _id (e.g. 'CLS-1', 'CLS-3'), name (e.g. 'PLUS ONE', 'DEGREE FIRST YEAR'), batchId, section
3. 'batches': Academic batches.
   - Fields: _id, name (e.g. 'NOVEA', 'BLUMEA'), academicYear, startYear, endYear
4. 'studentattendances': Attendance records.
   - Fields: studentId (ref 'users' _id), attendanceRecords: [{ classId, batchId, subjectId, teacherId, periodNumber, date (ISO Date), present (Boolean) }]
5. 'marks': Examination scorecards.
   - Fields: examName, classId, classIds, subjects: [{ name, maxMark, passMark }], students: [{ studentId, marks (Number or Object), manualRemark }]
6. 'debtors': Student fee accounts and balances.
   - Fields: studentId (ref 'users' _id), classId, batchId, category, year, totalAmount (Number), payments: [{ amount, date }]
   - Outstanding due balance = totalAmount - sum(payments.amount)
7. 'librarybooks': Library catalog.
   - Fields: name, author, category, status ('Available' | 'Issued' | 'Lost')
8. 'rentals': Library book borrowing logs.
   - Fields: bookId, studentId, studentName, rentedDate, receivedDate
9. 'teams': Arts Fest student teams.
   - Fields: _id, name (e.g. 'DEEDATIAN', 'ATTASIAN'), stagePoints (Number), offStagePoints (Number)
   - Total team points = stagePoints + offStagePoints
10. 'hifzdouras': Quran memorization recitation progress.
    - Fields: studentId, surah, portion, pagesCount (Number), mistakesCount (Number), date
11. 'leaverecords': Student leave applications.
    - Fields: studentId, classId, dateOfLeave, dateOfArrival, leaveReason, arrivedDate
12. 'teachersleaverecords': Faculty leaves.
    - Fields: teacherId, fromDate, toDate, reason, status ('Pending' | 'Approved' | 'Rejected')
13. 'remarks': Disciplinary & conduct notes.
    - Fields: studentId, teacherId, classId, comments, status, date
14. 'gatepasses': Student outpass records.
    - Fields: studentId, reason, outTime, inTime, status
15. 'programs': Extracurricular and arts fest events.
    - Fields: name, type, divisionId, rules
16. 'results': Declared arts fest results.
    - Fields: programId, isResultDeclared (Boolean), participants: [{ studentId, teamId, position, grade, point }]
17. 'academiccalendars': Holidays and college events.
    - Fields: title, type, date, year, description
18. 'subjects': Curriculum subjects.
    - Fields: _id, name
19. 'periods': Daily bell schedule.
    - Fields: periodNumber, startTime, endTime

QUERYING RULES & TYPO TOLERANCE:
- For text/string filters (names, titles, classes, batches), always prefer case-insensitive regex: { name: { $regex: "keyword", $options: "i" } } instead of exact equality to tolerate slight misspellings or casing differences.
- For finding team points or standings, query the 'teams' collection and sort by { stagePoints: -1 } or calculate total points.
- For counts, use operation: 'count'.
`;

/**
 * Execute a validated, read-only MongoDB query within safe operational boundaries
 * @param {object} params
 * @param {string} params.collection - Target collection name
 * @param {"aggregate"|"find"|"count"} params.operation - Operation type
 * @param {Array} [params.pipeline] - Aggregation pipeline
 * @param {object} [params.filter] - Find/count filter
 * @param {object} [params.projection] - Projection fields
 * @param {object} [params.sort] - Sort definition
 * @param {number} [params.limit] - Record cap
 * @returns {Promise<Array|object>}
 */
export async function executeSafeMongoQuery(params) {
  if (!params || typeof params !== "object") {
    throw new Error("Invalid query parameters object.");
  }

  const {
    collection: rawCollection,
    operation = "find",
    pipeline = [],
    filter = {},
    projection = {},
    sort = {},
    limit = 25,
  } = params;

  if (!rawCollection || typeof rawCollection !== "string") {
    throw new Error("Missing or invalid collection name.");
  }

  const collection = rawCollection.toLowerCase().trim();

  // 1. Whitelist validation
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    throw new Error(`Unauthorized collection access: '${collection}'. Operation aborted.`);
  }

  // 2. Structural AST security validation (prevents $out, $merge, $where, and unauthorized $lookup)
  validateQuerySafety(pipeline);
  validateQuerySafety(filter);
  validateQuerySafety(projection);
  validateQuerySafety(sort);

  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error("Database connection is not initialized.");
  }

  const col = db.collection(collection);
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 25), 50);

  // 3. Execution by operation
  if (operation === "aggregate") {
    if (!Array.isArray(pipeline)) {
      throw new Error("Aggregation pipeline must be an array of stages.");
    }

    // Clone pipeline and sanitize date objects if passed as ISO strings
    const sanitizedPipeline = pipeline.map((stage) => {
      return JSON.parse(JSON.stringify(stage), (key, value) => {
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) return d;
        }
        return value;
      });
    });

    // Ensure pipeline ends with a limit stage
    const hasLimit = sanitizedPipeline.some((stage) => stage.$limit !== undefined);
    if (!hasLimit) {
      sanitizedPipeline.push({ $limit: safeLimit });
    }

    return await col.aggregate(sanitizedPipeline, { maxTimeMS: 3000 }).toArray();
  }

  if (operation === "find") {
    const sanitizedFilter = JSON.parse(JSON.stringify(filter || {}), (key, value) => {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
      }
      return value;
    });

    const docs = await col
      .find(sanitizedFilter, {
        projection: projection || {},
        sort: sort || {},
        limit: safeLimit,
        maxTimeMS: 3000,
      })
      .toArray();

    // If 0 records returned, attempt relaxed case-insensitive regex for string fields
    if (docs.length === 0 && sanitizedFilter && typeof sanitizedFilter === "object") {
      let relaxed = false;
      const relaxedFilter = {};
      for (const [k, v] of Object.entries(sanitizedFilter)) {
        if (typeof v === "string" && v.length >= 3 && !v.startsWith("^") && !v.includes("$")) {
          relaxedFilter[k] = new RegExp(v.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
          relaxed = true;
        } else {
          relaxedFilter[k] = v;
        }
      }
      if (relaxed) {
        const retryDocs = await col
          .find(relaxedFilter, {
            projection: projection || {},
            sort: sort || {},
            limit: safeLimit,
            maxTimeMS: 3000,
          })
          .toArray();
        if (retryDocs.length > 0) return retryDocs;
      }
    }

    return docs;
  }

  if (operation === "count") {
    const sanitizedFilter = JSON.parse(JSON.stringify(filter || {}), (key, value) => {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
      }
      return value;
    });

    const count = await col.countDocuments(sanitizedFilter, { maxTimeMS: 3000 });
    return { count };
  }

  throw new Error(`Unsupported operation: '${operation}'. Must be 'aggregate', 'find', or 'count'.`);
}
