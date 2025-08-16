import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { baseURL } from "./lib/utils";

// Pre-encode the secret key
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

// Cache configuration
const userCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for user cache

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
    title: "Classes",
    path: "/dashboard/classes",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Students",
    path: "/dashboard/students",
    allowedRoles: ["College Admin", "Teacher", "Student"],
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
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Leave Register",
    path: "/dashboard/leave-register",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    path: "/dashboard/leave-register",
    pattern: /^\/dashboard\/leave-register(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin", "Teacher"],
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
    title: "Attendance Tracking",
    path: "/dashboard/attendance-tracking",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Students Reports",
    path: "/dashboard/students-reports",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Students ID Card",
    path: "/dashboard/students-id-card",
    allowedRoles: ["College Admin"],
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
    title: "Literary Attendance Mark",
    path: "/dashboard/literary-attendance/mark-attendance",
    pattern: /^\/dashboard\/literary-attendance\/mark-attendance(?:\/[^/]+)?$/,
    allowedRoles: ["Literary Leader"],
  },

  {
    title: "Attendance Tracking",
    path: "/dashboard/literary-attendance/attendance-tracking",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Students Fund",
    path: "/dashboard/students-fund",
    allowedRoles: ["College Admin", "Teacher"],
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
    title: "Settings",
    path: "/dashboard/settings",
    allowedRoles: ["College Admin"],
  },
];

export async function middleware(req) {
  if (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/login") {
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
  const activeRole = req.cookies.get("active-role")?.value;

  // If no token, allow access to login page
  if (!token) {
    return NextResponse.next();
  }

  try {
    // Verify JWT token to check if it's valid
    const { payload } = await jwtVerify(token, SECRET_KEY);

    if (activeRole === "Teacher") {
      return NextResponse.redirect(new URL("/dashboard/my-periods", req.url));
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    // Token is invalid, allow access to login page
    console.error("Login page token verification error:", error.message);
    return NextResponse.next();
  }
}

async function handleApiRequest(req) {
  const url = new URL(req.url);
  const apiKey = req.headers.get("api-key");
  const cronSecret = url.searchParams.get("cronSecret");

  if (cronSecret === process.env.CRON_SECRET) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.includes("/api/auth")) {
    return NextResponse.next();
  }

  if (apiKey !== process.env.API_KEY) {
    return NextResponse.json(
      { message: "Unauthorized - API key missing" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

async function handleAuthRequest(req) {
  const token = req.cookies.get("auth-token")?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const { userId } = payload;

    // Check if user is allowed to access this page

    // Check cache first
    const cachedUser = getUserFromCache(userId);

    if (cachedUser) {
      // Use cached user data to avoid API calls
      return prepareResponse(req, token, cachedUser);
    }

    try {
      // Try to fetch user with increased timeout
      const user = await fetchUserProfile(userId, process.env.API_KEY);

      if (user) {
        storeUserInCache(userId, user);
        return prepareResponse(req, token, user);
      }
    } catch (fetchError) {
      console.error("Error fetching user profile:", fetchError.message);

      // Important: Create minimal valid user object from JWT payload
      // This allows the application to continue working even when API fails
      const fallbackUser = createFallbackUser(payload);

      // Store fallback user with shorter TTL
      storeUserInCache(userId, fallbackUser, 1 * 60 * 1000); // 1 minutes

      return prepareResponse(req, token, fallbackUser);
    }

    return redirectToLogin(req);
  } catch (error) {
    console.error("Authentication error:", error.message);
    return redirectToLogin(req);
  }
}

function isUserAllowed(activeRole, path) {
  const page = pages.find(
    (page) => page.path === path || (page.pattern && page.pattern.test(path))
  );

  // Check if user has the required role
  const allowedRoles = page?.allowedRoles || [];
  return allowedRoles.includes(activeRole);
}

function createFallbackUser(payload) {
  // Create minimal user object from JWT token payload
  return {
    _id: payload.userId,
    roles: payload.roles || ["User"], // Use fallback role if not in token
    name: payload.name || "User",
    // Add other critical fields that your app needs
  };
}

function getUserFromCache(userId) {
  const cached = userCache.get(userId);
  if (!cached) return null;

  const { user, timestamp, ttl } = cached;
  const now = Date.now();

  if (now - timestamp > ttl) {
    userCache.delete(userId);
    return null;
  }

  return user;
}

function storeUserInCache(userId, user, customTtl = CACHE_TTL) {
  userCache.set(userId, {
    user,
    timestamp: Date.now(),
    ttl: customTtl,
  });
}

async function fetchUserProfile(userId, apiKey) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Extend to 5 seconds

    const response = await fetch(`${baseURL}/api/users/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({ userId }),
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      throw new Error("Empty response from API");
    }

    // Parse JSON safely
    const data = JSON.parse(text);
    return data.user;
  } catch (error) {
    throw error;
  }
}

function prepareResponse(req, token, user) {
  const res = NextResponse.next();

  if (
    req.cookies.has("active-role") &&
    !isUserAllowed(req.cookies.get("active-role")?.value, req.nextUrl.pathname)
  ) {
    return redirectTo404(req);
  }

  // Validate user object before JSON.stringify to prevent errors
  const safeUser = {
    ...user,
    userId: user?._id,
  };

  // Set headers safely with try/catch
  try {
    res.headers.set("x-user", JSON.stringify(safeUser));
    res.headers.set("x-auth-token", token);
  } catch (error) {
    console.error("Error setting headers:", error.message);
  }

  // Set cookie if not present
  // Get current activeRole from cookie or default to first valid role
  let activeRole = req.cookies.get("active-role")?.value;

  // If the current cookie value is not one of the user's roles, reset it
  if (!activeRole || !user.roles.includes(activeRole)) {
    activeRole = user.roles.includes("Teacher") ? "Teacher" : user.roles[0];

    res.cookies.set("active-role", activeRole, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Now validate access
  if (!isUserAllowed(activeRole, req.nextUrl.pathname)) {
    return redirectTo404(req);
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
  matcher: ["/dashboard/:path*", "/api/:path*", "/", "/login"],
};
