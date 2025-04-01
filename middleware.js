import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { baseURL } from "./lib/utils";

// Pre-encode the secret key
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

// Cache configuration
const userCache = new Map();
const tokenCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for user cache
const TOKEN_TTL = 5 * 60 * 1000; // 5 minutes for API token cache

export async function middleware(req) {
  // Check if this is an API route
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return handleApiRequest(req);
  }

  // Handle regular authentication for dashboard routes
  return handleAuthRequest(req);
}

async function handleApiRequest(req) {
  const apiKey = req.headers.get("api-key");

  if (!apiKey) {
    return NextResponse.json(
      { message: "Unauthorized - API key missing" },
      { status: 401 }
    );
  }

  // Check token cache first
  const cachedToken = tokenCache.get(apiKey);
  if (cachedToken && cachedToken.expiry > Date.now()) {
    // API key is valid and cached
    return NextResponse.next();
  }

  try {
    // Verify JWT token
    const verified = await jwtVerify(apiKey, SECRET_KEY);

    // Store in cache with expiry
    tokenCache.set(apiKey, {
      payload: verified,
      expiry: Date.now() + TOKEN_TTL,
    });

    return NextResponse.next();
  } catch (error) {
    console.error("API authentication error:", error.message);
    return NextResponse.json(
      { message: "Unauthorized - Invalid API key" },
      { status: 401 }
    );
  }
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

    // Check cache first
    const cachedUser = getUserFromCache(userId);

    if (cachedUser) {
      // Use cached user data to avoid API calls
      return prepareResponse(req, token, cachedUser);
    }

    try {
      // Try to fetch user with increased timeout
      const user = await fetchUserProfile(userId, token);

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
      storeUserInCache(userId, fallbackUser, 5 * 60 * 1000); // 5 minutes

      return prepareResponse(req, token, fallbackUser);
    }

    return redirectToLogin(req);
  } catch (error) {
    console.error("Authentication error:", error.message);
    return redirectToLogin(req);
  }
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

async function fetchUserProfile(userId, token) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Extend to 5 seconds

    const response = await fetch(`${baseURL}/api/users/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": token,
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

  // Validate user object before JSON.stringify to prevent errors
  const safeUser = {
    ...user,
    userId: user._id,
  };

  // Set headers safely with try/catch
  try {
    res.headers.set("x-user", JSON.stringify(safeUser));
    res.headers.set("x-auth-token", token);
  } catch (error) {
    console.error("Error setting headers:", error.message);
  }

  // Set cookie if not present
  if (!req.cookies.has("active-role") && user.roles && user.roles.length > 0) {
    res.cookies.set("active-role", user.roles[0], {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60,
    });
  }

  return res;
}

function redirectToLogin(req) {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
