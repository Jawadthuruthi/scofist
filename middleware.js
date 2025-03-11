import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { baseURL } from "./lib/utils";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  try {
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const { userId } = payload;

    // Fetch user profile
    const userResponse = await fetch(`${baseURL}/api/users/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: userId }),
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const { user } = await userResponse.json();

    if (!user) {
      console.error(
        "User data is missing in the response. Redirecting to login."
      );
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const activeRole = req.cookies.get("active-role")?.value || user.roles?.[0];

    // Proceed with the request
    const res = NextResponse.next();
    res.headers.set("x-user", JSON.stringify({ ...user, userId: user._id }));
    res.headers.set("x-auth-token", token);
    if (!req.cookies.has("active-role")) {
      res.cookies.set("active-role", user.roles[0], {
        path: "/",
      });
    }

    return res;
  } catch (error) {
    console.error("Error:", error.message);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: "/dashboard/:path*",
};
