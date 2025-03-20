import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { baseURL } from "./lib/utils";

// Pre-encode the secret key once outside the middleware function
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Authentication middleware for protected routes
 * Verifies JWT token and attaches user data to the request
 */
export async function middleware(req) {
  const token = req.cookies.get("auth-token")?.value;

  // Redirect to login if no token exists
  if (!token) {
    return redirectToLogin(req);
  }

  try {
    // Verify JWT and extract user ID
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const { userId } = payload;

    // Fetch user profile from API
    const user = await fetchUserProfile(userId);

    if (!user) {
      return redirectToLogin(req);
    }

    // Proceed with authenticated request
    return prepareResponse(req, token, user);
  } catch (error) {
    console.error("Authentication error:", error.message);
    return redirectToLogin(req);
  }
}

/**
 * Fetches user profile from the API
 * @param {string} userId - The user's ID
 * @returns {Object|null} User object or null if request fails
 */
async function fetchUserProfile(userId) {
  try {
    const response = await fetch(`${baseURL}/api/users/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      return null;
    }

    const { user } = await response.json();
    return user;
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return null;
  }
}

/**
 * Prepares the response with user data in headers
 * @param {Request} req - The original request
 * @param {string} token - The authentication token
 * @param {Object} user - The user data
 * @returns {NextResponse} The prepared response
 */
function prepareResponse(req, token, user) {
  const res = NextResponse.next();

  // Add user data and token to headers
  res.headers.set("x-user", JSON.stringify({ ...user, userId: user._id }));
  res.headers.set("x-auth-token", token);

  // Set active role cookie if not already present
  if (!req.cookies.has("active-role")) {
    res.cookies.set("active-role", user.roles[0], {
      path: "/",
    });
  }

  return res;
}

/**
 * Redirects to the login page
 * @param {Request} req - The original request
 * @returns {NextResponse} Redirect response
 */
function redirectToLogin(req) {
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: "/dashboard/:path*",
};
