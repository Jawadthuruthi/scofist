import { jwtVerify } from "jose";
import { NextResponse } from "next/server";


// Pre-encode the secret key
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

// Cache configuration
const userCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes maximum TTL
const CACHE_MAX_SIZE = 1000; // Prevent unbounded cache growth

// Pages
const pages = [
  {
    title: "Dashboard",
    path: "/dashboard",
    allowedRoles: [
      "College Admin",
      "Teacher",
      "Org Admin",
      "Student",
      "Program Committee",
      "Program Leader",
      "Finance",
      "Literary Leader",
      "Spark Admin",
    ],
  },
  {
    title: "My Periods",
    path: "/dashboard/my-periods",
    allowedRoles: ["Teacher"],
  },
  {
    title: "Attendances",
    path: "/dashboard/attendances",
    allowedRoles: ["Teacher"],
  },
  {
    title: "My Time Table",
    path: "/dashboard/my-time-table",
    allowedRoles: ["Teacher"],
  },
  {
    title: "My Attendance",
    path: "/dashboard/my-attendance",
    allowedRoles: ["Teacher"],
  },
  {
    title: "Teachers",
    path: "/dashboard/teachers",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Batches",
    path: "/dashboard/batches",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Debtors",
    path: "/dashboard/debtors",
    allowedRoles: ["Org Admin"],
  },

  {
    title: "Spark Finance",
    path: "/dashboard/spark/finance",
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Committee",
    path: "/dashboard/spark/committee",
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Verification",
    path: "/dashboard/spark/verification",
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Contacts",
    path: "/dashboard/spark/contacts",
    pattern: /^\/dashboard\/spark\/contacts(?:\/[^/]+)?$/,
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Dashboard",
    path: "/dashboard/spark",
    allowedRoles: ["Student", "Spark Admin"],
  },
  {
    title: "Alumnies",
    path: "/dashboard/alumnies",
    allowedRoles: ["Student", "Spark Admin"],
  },
  {
    path: "/dashboard/alumnies",
    pattern: /^\/dashboard\/alumnies.*$/,
    allowedRoles: ["Student", "Spark Admin"],
  },
  {
    title: "Classes",
    path: "/dashboard/classes",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Students",
    path: "/dashboard/students",
    allowedRoles: ["College Admin", "Student"],
  },
  {
    title: "Faculty",
    path: "/dashboard/faculty",
    allowedRoles: ["Student", "College Admin", "Teacher", "Org Admin"],
  },
  {
    title: "Leave History",
    path: "/dashboard/leave-history",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Subjects",
    path: "/dashboard/subjects",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Periods",
    path: "/dashboard/periods",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Time Tables",
    path: "/dashboard/time-tables",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Marks",
    path: "/dashboard/marks",
    allowedRoles: ["Teacher", "College Admin"],
  },
  {
    title: "Leave Register",
    path: "/dashboard/leave-register",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Students Families",
    path: "/dashboard/students-families",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Courses",
    path: "/dashboard/students-courses",
    allowedRoles: ["College Admin"],
  },
  {
    path: "/dashboard/leave-register",
    pattern: /^\/dashboard\/leave-register(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    path: "/dashboard/remarks",
    pattern: /^\/dashboard\/remarks(?:\/[^/]+)?$/,
    allowedRoles: ["Teacher", "College Admin"],
  },
  {
    path: "/dashboard/performance",
    pattern: /^\/dashboard\/performance(?:\/[^/]+)?$/,
    allowedRoles: ["Teacher", "College Admin"],
  },

  {
    title: "Applications",
    path: "/dashboard/applications",
    allowedRoles: ["College Admin"],
  },

  {
    title: "Applicant Details",
    path: "/dashboard/applications",
    pattern: /^\/dashboard\/applications(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin"],
  },

  {
    title: "Students Contacts",
    path: "/dashboard/students-contacts",
    pattern: /^\/dashboard\/students-contacts(?:\/[^/]+)?$/,
    allowedRoles: ["Teacher", "College Admin"],
  },

  {
    title: "Attendance History",
    path: "/dashboard/attendance-tracking",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Students Reports",
    path: "/dashboard/students-reports",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Students Certificate",
    path: "/dashboard/students-certificate",
    allowedRoles: ["College Admin", "Program Committee"],
  },
  {
    title: "Certificate",
    path: "/dashboard/certificate",
    allowedRoles: ["College Admin", "Program Committee"],
  },
  {
    title: "Clearance Certificate",
    path: "/dashboard/clearance-certificate",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Attendance Sheet",
    path: "/dashboard/attendance-sheet",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Attendance Table",
    path: "/dashboard/attendance-table",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Identity Cards",
    path: "/dashboard/identity-cards",
    allowedRoles: ["College Admin", "Teacher", "Student"],
  },
  {
    title: "Literary Groups",
    path: "/dashboard/literary-groups",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Literary Attendance",
    path: "/dashboard/literary-attendance",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Literary Attendance Sheet",
    path: "/dashboard/literary-attendance/attendance-sheet",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Literary Attendance Mark",
    path: "/dashboard/literary-attendance/mark-attendance",
    pattern: /^\/dashboard\/literary-attendance\/mark-attendance(?:\/[^/]+)?$/,
    allowedRoles: ["Literary Leader"],
  },

  {
    title: "Attendance History",
    path: "/dashboard/literary-attendance/attendance-tracking",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Admission Register",
    path: "/dashboard/admission-register",
    pattern: /^\/dashboard\/admission-register(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin"],
  },
  {
    title: "Finance",
    path: "/dashboard/finance",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Accounts",
    path: "/dashboard/accounts",
    allowedRoles: ["College Admin", "Org Admin", "Finance"],
  },
  {
    title: "Students Fund",
    path: "/dashboard/students-fund",
    allowedRoles: ["Teacher"],
  },
  {
    title: "Student Coupon Fund",
    path: "/dashboard/student-coupon-fund",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Library Dashboard",
    path: "/library-dashboard",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Books",
    path: "/dashboard/books",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Barcodes",
    path: "/dashboard/books/barcodes",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Rentals",
    path: "/dashboard/rentals",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Library Requests",
    path: "/dashboard/library-requests",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Downloads",
    path: "/dashboard/downloads",
    allowedRoles: ["College Admin", "Student", "Teacher"],
  },
  {
    title: "Syllabus",
    path: "/dashboard/syllabus",
    allowedRoles: ["College Admin", "Student", "Teacher"],
  },
  {
    path: "/dashboard/downloads",
    pattern: /^\/dashboard\/downloads(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin", "Student", "Teacher"],
  },
  {
    title: "Screen",
    path: "/dashboard/screen",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Divisions",
    path: "/dashboard/divisions",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Teams",
    path: "/dashboard/teams",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Participants",
    path: "/dashboard/participants",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Programs",
    path: "/dashboard/programs",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Program Registration",
    path: "/dashboard/program-registration",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Gallery",
    path: "/dashboard/gallery",
    allowedRoles: ["Program Committee", "College Admin"],
  },
  {
    title: "Frame",
    path: "/dashboard/frame",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Code Letters",
    path: "/dashboard/code-letters",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Grade Scheme",
    path: "/dashboard/grade-scheme",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Evaluation",
    path: "/dashboard/evaluation",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Judges",
    path: "/dashboard/judges",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Judge Portal",
    path: "/judge-portal",
    allowedRoles: ["Judge"],
  },
  {
    title: "Results",
    path: "/dashboard/results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Participants Card",
    path: "/dashboard/participants-card",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Schedules",
    path: "/dashboard/schedules",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Rules & Topics",
    path: "/dashboard/rules-topics",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Instructions",
    path: "/dashboard/instructions",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Team Points",
    path: "/dashboard/team-points",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Individual Points",
    path: "/dashboard/individual-points",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Declared Results",
    path: "/dashboard/declared-results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Evaluation Sheets",
    path: "/dashboard/evaluation-sheets",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Unregistered programs",
    path: "/dashboard/unregistered-programs",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Check List",
    path: "/dashboard/check-list",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Scratch cards",
    path: "/dashboard/scratch-cards",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Winners list",
    path: "/dashboard/winners-list",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Non Winners list",
    path: "/dashboard/non-winners",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Non Responders list",
    path: "/dashboard/non-responders",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "individual Results",
    path: "/dashboard/individual-results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Settings",
    path: "/dashboard/settings",
    pattern: /^\/dashboard\/settings(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin", "Program Committee", "Spark Admin", "Org Admin"],
  },
  {
    title: "General Attendance",
    path: "/dashboard/general-attendance",
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "General Attendance Mark",
    path: "/dashboard/general-attendance/mark",
    pattern: /^\/dashboard\/general-attendance\/mark(?:\/[^/]+)?$/,
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "General Attendance History",
    path: "/dashboard/general-attendance/history",
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "Masjid Attendance",
    path: "/dashboard/masjid-attendance",
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "Masjid Attendance Mark",
    path: "/dashboard/masjid-attendance/mark",
    pattern: /^\/dashboard\/masjid-attendance\/mark(?:\/[^/]+)?$/,
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "Masjid Attendance History",
    path: "/dashboard/masjid-attendance/history",
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "Articles",
    path: "/dashboard/articles",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Updates",
    path: "/dashboard/updates",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "No Role Users",
    path: "/dashboard/no-role-users",
    allowedRoles: ["College Admin"],
  },
  {
    title: "College Gallery",
    path: "/dashboard/college-gallery",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Pending Code Letters",
    path: "/dashboard/pending-codeletters",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Pending Evaluation",
    path: "/dashboard/pending-evaluation",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Undeclared Results",
    path: "/dashboard/undeclared-results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Results QR Code",
    path: "/dashboard/results-qr-code",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Poster Customizer",
    path: "/dashboard/poster-customizer",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Reset",
    path: "/dashboard/program-management/reset",
    allowedRoles: ["Program Committee"],
  },

  {
    title: "Academic Calendar",
    path: "/dashboard/academic-calendar",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Gate Pass",
    path: "/dashboard/gate-pass",
    allowedRoles: ["College Admin", "Gate Keeper", "Teacher"],
  },
  {
    title: "Hifz & Doura",
    path: "/dashboard/hifz-doura",
    allowedRoles: ["College Admin"],
  },
];

// Pre-compile pages map/array for O(1) lookup
const exactPagesMap = new Map();
const patternPages = [];

pages.forEach((page) => {
  if (page.pattern) {
    patternPages.push(page);
  } else {
    exactPagesMap.set(page.path, page.allowedRoles);
  }
});

// Pre-compiled Set of public GET endpoints for O(1) lookup
const PUBLIC_GET_ROUTES = new Set([
  "/api/divisions",
  "/api/programs",
  "/api/results",
  "/api/settings",
  "/api/student-attendance-lookup",
  "/api/vcard",
  "/api/vcard/class",
  "/api/team-points-poster",
  "/api/teams",
  "/api/schedules",
  "/api/gallery",
  "/api/rank-achievers",
  "/api/download-file",
]);

export async function middleware(req) {
  if (req.nextUrl.pathname === "/") {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname === "/login") {
    return handleLoginPageRequest(req);
  }
  // Check if this is an API route
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return handleApiRequest(req);
  }

  // Handle regular authentication for dashboard routes
  return handleAuthRequest(req);
}

async function handleLoginPageRequest(req) {
  const token = req.cookies.get("auth-token")?.value;
  let activeRole = req.cookies.get("active-role")?.value;

  // If no token, allow access to login page
  if (!token) {
    return NextResponse.next();
  }

  try {
    // Verify JWT token to check if it's valid
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const effectiveUserId = payload.userId || payload.email;

    // Resolve user from profile-cache cookie (DB-synced roles), then signed JWT payload, then LRU fallback
    const user = await resolveUserFromRequest(req, payload, effectiveUserId);

    const userRoles = user?.roles || payload.roles || [];
    const isTeacher = userRoles.includes("Teacher") || activeRole === "Teacher";

    const redirectParam = req.nextUrl.searchParams.get("redirect");
    let destinationUrl;
    let targetActiveRole;

    // ✅ FIX #5: Strict regex — only allow safe internal paths (no protocol-relative URLs)
    const SAFE_REDIRECT_PATTERN = /^\/[a-zA-Z0-9\-/_?=&]*$/;
    if (redirectParam && SAFE_REDIRECT_PATTERN.test(redirectParam)) {
      destinationUrl = redirectParam;
      if (redirectParam.startsWith("/dashboard/my-periods") && isTeacher) {
        targetActiveRole = "Teacher";
      } else {
        targetActiveRole = activeRole || (isTeacher ? "Teacher" : userRoles[0]);
      }
    } else if (isTeacher) {
      destinationUrl = "/dashboard/my-periods";
      targetActiveRole = "Teacher";
    } else if (activeRole === "Judge" || userRoles.includes("Judge")) {
      destinationUrl = "/judge-portal";
      targetActiveRole = "Judge";
    } else if (activeRole === "Librarian" || userRoles.includes("Librarian")) {
      destinationUrl = "/library-dashboard";
      targetActiveRole = "Librarian";
    } else if (activeRole === "Gate Keeper" || userRoles.includes("Gate Keeper")) {
      destinationUrl = "/dashboard/gate-pass";
      targetActiveRole = "Gate Keeper";
    } else if (activeRole === "Org Admin" || userRoles.includes("Org Admin")) {
      destinationUrl = "/dashboard/accounts";
      targetActiveRole = "Org Admin";
    } else if (activeRole === "Literary Leader" || userRoles.includes("Literary Leader")) {
      destinationUrl = "/dashboard/literary-attendance";
      targetActiveRole = "Literary Leader";
    } else if (activeRole === "Program Committee" || userRoles.includes("Program Committee")) {
      destinationUrl = "/dashboard/results";
      targetActiveRole = "Program Committee";
    } else if (activeRole === "Program Leader" || userRoles.includes("Program Leader")) {
      destinationUrl = "/dashboard/program-registration";
      targetActiveRole = "Program Leader";
    } else {
      destinationUrl = "/dashboard";
      targetActiveRole = activeRole || userRoles[0] || "College Admin";
    }

    const res = NextResponse.redirect(new URL(destinationUrl, req.url));

    if (targetActiveRole) {
      res.cookies.set("active-role", targetActiveRole, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    // Refresh auth-token to sameSite: 'lax' to upgrade any older strict cookies
    res.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (error) {
    // Token is invalid, allow access to login page
    console.error("Login page token verification error:", error.message);
    return NextResponse.next();
  }
}

async function handleApiRequest(req) {
  // ✅ HARDENING: Strip any client-sent x-user or active-role headers so they cannot be spoofed.
  // The server is the only authority that sets these headers after cryptographic JWT verification.
  const strippedHeaders = new Headers(req.headers);
  strippedHeaders.delete("x-user");
  strippedHeaders.delete("active-role");

  if (
    // ✅ FIX #2 continued: /api/upload and /api/gallery/upload removed from bypass
    // — they now go through JWT verification so middleware injects x-user correctly.
    // ✅ FIX #3: /api/sign-cloudinary removed — it now enforces its own auth
    req.nextUrl.pathname.startsWith("/api/og/")
  ) {
    // For truly public routes (og image generation), still strip x-user and active-role
    return NextResponse.next({
      request: { headers: strippedHeaders },
    });
  }

  const pathname = req.nextUrl.pathname;
  const apiKey = req.headers.get("api-key") || req.headers.get("x-api-key");
  const cronSecret = req.nextUrl.searchParams.get("cronSecret");
  const authToken = req.cookies.get("auth-token")?.value || req.cookies.get("custom-member-token")?.value;

  if (req.method === "GET" && PUBLIC_GET_ROUTES.has(pathname)) {
    return NextResponse.next({
      request: { headers: strippedHeaders },
    });
  }

  const authHeader = req.headers.get("authorization");
  if (cronSecret === process.env.CRON_SECRET || authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.next({
      request: { headers: strippedHeaders },
    });
  }

  if (req.nextUrl.pathname.includes("/api/auth")) {
    return NextResponse.next({
      request: { headers: strippedHeaders },
    });
  }

  // Allow authenticated users (with valid JWT) to access API without API key
  if (authToken) {
    try {
      const { payload } = await jwtVerify(authToken, SECRET_KEY);
      const effectiveUserId = payload.userId || payload.email;

      const resolvedUser = await resolveUserFromRequest(req, payload, effectiveUserId);
      const clientActiveRole = req.headers.get("active-role") || req.cookies.get("active-role")?.value;

      // Determine user roles from resolved profile/token; fallback to clientActiveRole only if empty
      const userRoles = Array.isArray(resolvedUser?.roles) && resolvedUser.roles.length > 0
        ? resolvedUser.roles
        : (clientActiveRole ? [clientActiveRole] : ["User"]);

      const user = {
        ...(resolvedUser || {}),
        _id: resolvedUser?._id || payload.userId,
        userId: resolvedUser?._id || payload.userId,
        roles: userRoles,
        name: resolvedUser?.name || payload.name || "User",
        profilePic: resolvedUser?.profilePic || payload.profilePic,
      };

      const requestHeaders = new Headers(strippedHeaders);
      try {
        requestHeaders.set("x-user", JSON.stringify(user));
      } catch {
        try {
          requestHeaders.set("x-user", encodeURIComponent(JSON.stringify(user)));
        } catch (e) {
          console.error("Error setting x-user in handleApiRequest:", e.message);
        }
      }

      // ✅ Validate active-role: only allow a role that actually belongs to the verified user's roles
      const verifiedActiveRole = (clientActiveRole && userRoles.includes(clientActiveRole))
        ? clientActiveRole
        : userRoles[0];
      requestHeaders.set("active-role", verifiedActiveRole);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // Token is invalid, continue to check API key
      console.error("Invalid auth token in API request:", error.message);
    }
  }

  // If no valid auth token, require API key
  if (apiKey !== process.env.API_KEY) {
    return NextResponse.json(
      { message: "Unauthorized - API key missing" },
      { status: 401 }
    );
  }

  return NextResponse.next({
    request: { headers: strippedHeaders },
  });
}

async function handleAuthRequest(req) {
  // ✅ FIX #1: E2E bypass ONLY allowed in non-production environments
  const isE2ETest =
    process.env.NODE_ENV !== "production" &&
    req.headers.get("x-e2e-test") === "true";

  if (isE2ETest) {
    const activeRole = req.headers.get("active-role") || "College Admin";

    const mockUser = {
      _id: "e2e-test-user-id",
      roles: [activeRole],
      name: "E2E Test User",
    };

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user", JSON.stringify(mockUser));
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    // Also keep response header just in case client needs it
    res.headers.set("x-user", JSON.stringify(mockUser));
    res.cookies.set("active-role", activeRole, {
      path: "/",
      sameSite: "lax",
    });

    if (!isUserAllowed(activeRole, req.nextUrl.pathname)) {
      return redirectTo404(req);
    }
    return res;
  }

  // Check for standard auth token first
  const token = req.cookies.get("auth-token")?.value;
  // Check for custom member token as fallback
  const customToken = req.cookies.get("custom-member-token")?.value;

  if (!token && !customToken) {
    return redirectToLogin(req);
  }

  let activeToken = token;
  let decoded = null;

  if (token) {
    try {
      decoded = await jwtVerify(token, SECRET_KEY);
    } catch {
      // Standard token invalid or expired; will attempt customToken
    }
  }

  if (!decoded && customToken) {
    try {
      decoded = await jwtVerify(customToken, SECRET_KEY);
      activeToken = customToken;
    } catch {
      // Both tokens failed verification
    }
  }

  if (!decoded) {
    return redirectToLogin(req);
  }

  const { payload } = decoded;
  const effectiveUserId = payload.userId || payload.email;

  if (!effectiveUserId) {
    return redirectToLogin(req);
  }

  try {
    const user = await resolveUserFromRequest(req, payload, effectiveUserId);
    return prepareResponse(req, activeToken, user);
  } catch (error) {
    console.error("Authentication error:", error.message);
    return redirectToLogin(req);
  }
}

async function getVerifiedProfileFromCookie(req, effectiveUserId) {
  const forceRefresh = req.cookies.has("force-profile-refresh");
  const profileCacheToken = req.cookies.get("profile-cache")?.value;
  if (!profileCacheToken || forceRefresh) return null;

  try {
    const { payload: cachedProfile } = await jwtVerify(profileCacheToken, SECRET_KEY);
    const effectiveStr = String(effectiveUserId || "");
    const cachedUserId = String(cachedProfile.userId || "");
    const cachedDocId = String(cachedProfile._id || "");
    const cachedEmail = String(cachedProfile.email || "");
    const matchesUser =
      (cachedUserId && cachedUserId === effectiveStr) ||
      (cachedDocId && cachedDocId === effectiveStr) ||
      (cachedEmail && effectiveStr.includes("@") && cachedEmail.toLowerCase() === effectiveStr.toLowerCase());

    if (matchesUser && Array.isArray(cachedProfile.roles) && cachedProfile.roles.length > 0) {
      return cachedProfile;
    }
  } catch (err) {
    console.error("Profile cache cookie verification failed:", err?.message || err);
  }
  return null;
}

async function resolveUserFromRequest(req, payload, effectiveUserId) {
  const forceRefresh = req.cookies.has("force-profile-refresh");

  // 1. Signed cookie-based profile cache carries DB-synced roles (overrides stale long-lived JWTs)
  const cachedProfile = await getVerifiedProfileFromCookie(req, effectiveUserId);
  if (cachedProfile) {
    storeUserInCache(effectiveUserId, cachedProfile);
    return cachedProfile;
  }

  // 2. Cryptographically verified JWT payload roles (prevents stale isolate RAM cache shadowing fresh logins)
  const hasTokenRoles =
    (Array.isArray(payload.roles) && payload.roles.length > 0) ||
    (Array.isArray(payload.customRoles) && payload.customRoles.length > 0);
  if (hasTokenRoles) {
    const tokenUser = createFallbackUser(payload);
    storeUserInCache(effectiveUserId, tokenUser);
    return tokenUser;
  }

  // 3. In-memory LRU fallback for legacy tokens without embedded roles
  const cachedEntry = !forceRefresh ? getUserFromCache(effectiveUserId) : null;
  if (cachedEntry?.user) {
    return cachedEntry.user;
  }

  const fallbackUser = createFallbackUser(payload);
  storeUserInCache(effectiveUserId, fallbackUser);
  return fallbackUser;
}

function createFallbackUser(payload) {
  const payloadRoles = Array.isArray(payload.roles) && payload.roles.length > 0
    ? payload.roles
    : (Array.isArray(payload.customRoles) && payload.customRoles.length > 0 ? payload.customRoles : ["User"]);

  return {
    _id: payload.userId || payload.email,
    userId: payload.userId || payload.email,
    roles: payloadRoles,
    name: payload.name || "User",
    email: payload.email,
    profilePic: payload.profilePic,
    teacherSpecificField: payload.teacherSpecificField,
    studentSpecificField: payload.studentSpecificField,
  };
}

function isUserAllowed(activeRole, path) {
  if (!activeRole) return false;

  if (path === "/dashboard") {
    // Librarian has their own dashboard at /library-dashboard
    if (activeRole === "Librarian") return false;
    return true; // Any other authenticated role can see the dashboard
  }

  let allowedRoles = exactPagesMap.get(path);
  if (!allowedRoles) {
    const matchedPage = patternPages.find((p) => p.pattern.test(path));
    if (matchedPage) {
      allowedRoles = matchedPage.allowedRoles;
    }
  }

  if (!allowedRoles) return false;

  // Check if user has the required role
  return allowedRoles.includes(activeRole);
}

function getUserFromCache(userId) {
  const cached = userCache.get(userId);
  if (!cached) return null;

  const { timestamp, ttl } = cached;
  const now = Date.now();

  if (now - timestamp > ttl) {
    userCache.delete(userId);
    return null;
  }

  // Move to the end of Map to maintain LRU order
  userCache.delete(userId);
  userCache.set(userId, cached);

  return cached;
}

function storeUserInCache(userId, user, customTtl = CACHE_TTL) {
  // Enforce size limit (LRU eviction)
  if (userCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = userCache.keys().next().value;
    if (oldestKey) {
      userCache.delete(oldestKey);
    }
  }

  userCache.set(userId, {
    user,
    timestamp: Date.now(),
    ttl: customTtl,
  });
}


function createRedirectWithCookies(url, activeRole, req) {
  const res = NextResponse.redirect(url);
  if (activeRole) {
    res.cookies.set("active-role", activeRole, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  if (req.cookies.has("force-profile-refresh")) {
    res.cookies.delete("force-profile-refresh");
  }
  return res;
}

function prepareResponse(req, token, user) {
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];

  if (userRoles.includes("Teacher") && user?.teacherSpecificField?.status === "Retired") {
    const loginUrl = new URL("/login", req.url);
    const logoutRes = NextResponse.redirect(loginUrl);
    logoutRes.cookies.delete("auth-token");
    logoutRes.cookies.delete("active-role");
    logoutRes.cookies.delete("profile-cache");
    logoutRes.cookies.delete("custom-member-token");
    return logoutRes;
  }

  // Resolve the active role FIRST — before any access checks.
  let activeRole = req.cookies.get("active-role")?.value;

  // If the current cookie value is missing or not one of the user's verified roles, reset it
  if (!activeRole || !userRoles.includes(activeRole)) {
    activeRole = userRoles.includes("Teacher") ? "Teacher" : (userRoles[0] || "User");
  }

  // Handle role-specific portals and landing redirects
  if (req.nextUrl.pathname === "/dashboard") {
    if (activeRole === "Org Admin") {
      return createRedirectWithCookies(new URL("/dashboard/accounts", req.url), activeRole, req);
    }
    if (activeRole === "Program Committee") {
      return createRedirectWithCookies(new URL("/dashboard/results", req.url), activeRole, req);
    }
    if (activeRole === "Program Leader") {
      return createRedirectWithCookies(new URL("/dashboard/program-registration", req.url), activeRole, req);
    }
    if (activeRole === "Librarian") {
      return createRedirectWithCookies(new URL("/library-dashboard", req.url), activeRole, req);
    }
    if (activeRole === "Gate Keeper") {
      return createRedirectWithCookies(new URL("/dashboard/gate-pass", req.url), activeRole, req);
    }
    if (activeRole === "Judge") {
      return createRedirectWithCookies(new URL("/judge-portal", req.url), activeRole, req);
    }
  }

  // Validate access using the resolved active role
  if (!isUserAllowed(activeRole, req.nextUrl.pathname)) {
    // If user has multiple roles (e.g. Teacher + Admin) and navigated to a page
    // allowed for another of their roles (e.g. /dashboard/my-periods), switch activeRole
    const matchingRole = userRoles.find((r) => isUserAllowed(r, req.nextUrl.pathname));
    if (matchingRole) {
      activeRole = matchingRole;
    }
  }

  // If still not allowed, redirect to 404
  if (!isUserAllowed(activeRole, req.nextUrl.pathname)) {
    return redirectTo404(req);
  }

  // Validate user object before JSON.stringify to prevent errors
  const safeUser = {
    ...user,
    _id: user?._id || user?.userId,
    userId: user?._id || user?.userId,
    roles: userRoles,
  };

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("active-role", activeRole);

  try {
    requestHeaders.set("x-user", JSON.stringify(safeUser));
  } catch (error) {
    try {
      requestHeaders.set("x-user", encodeURIComponent(JSON.stringify(safeUser)));
    } catch (e) {
      console.error("Error setting x-user request header:", e.message);
    }
  }

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  try {
    res.headers.set("x-user", JSON.stringify(safeUser));
  } catch {
    try {
      res.headers.set("x-user", encodeURIComponent(JSON.stringify(safeUser)));
    } catch {}
  }

  res.cookies.set("active-role", activeRole, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  if (req.cookies.has("force-profile-refresh")) {
    res.cookies.delete("force-profile-refresh");
  }


  return res;
}

function redirectToLogin(req) {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectTo404(req) {
  const notFoundUrl = new URL("/404", req.url);
  return NextResponse.redirect(notFoundUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/library-dashboard/:path*",
    "/library-dashboard",
    "/judge-portal",
    "/judge-portal/:path*",
    "/api/:path*",
    "/login",
  ],
};
