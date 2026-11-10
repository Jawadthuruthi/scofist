import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const response = NextResponse.json(
      { message: "Logout successful" },
      { status: 200 }
    );

    // Remove the cookies by setting them to an expired date
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      expires: new Date(0), // Expire the cookie immediately
      path: "/",
    });
    response.cookies.set("active-role", "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("profile-cache", "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("custom-member-token", "", {
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error logging out:", error.message);
    return NextResponse.json({ message: "Failed to log out" }, { status: 500 });
  }
}
