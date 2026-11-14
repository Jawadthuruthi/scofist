import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import CustomRole from "@/models/CustomRole";
import { NextResponse } from "next/server";

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json().catch(() => ({}));
    const rawUserId = body?.userId;

    if (!rawUserId || typeof rawUserId !== "string" || !rawUserId.trim()) {
      return NextResponse.json({ message: "Invalid or missing userId" }, { status: 400 });
    }

    const userId = rawUserId.trim();

    // Verify caller identity from trusted middleware headers or API key
    let caller = null;
    const userHeader = req.headers.get("x-user");
    if (userHeader) {
      try {
        caller = JSON.parse(decodeURIComponent(userHeader));
      } catch {
        try {
          caller = JSON.parse(userHeader);
        } catch {}
      }
    }

    const apiKey = req.headers.get("api-key") || req.headers.get("x-api-key");
    const isApiKeyAuth = apiKey && apiKey === process.env.API_KEY;

    if (!caller && !isApiKeyAuth) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (caller && !isApiKeyAuth) {
      const callerId = String(caller._id || caller.userId || "").toLowerCase();
      const callerEmail = String(caller.email || "").toLowerCase();
      const requestedId = userId.toLowerCase();

      const isSelf = callerId === requestedId || callerEmail === requestedId;
      const isAdmin = Array.isArray(caller.roles) && caller.roles.some((r) =>
        ["College Admin", "Org Admin", "Spark Admin"].includes(r)
      );

      if (!isSelf && !isAdmin) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    let user = null;
    let customRoleNames = [];

    if (userId.includes("@")) {
      const emailLower = userId.toLowerCase();
      const [userDoc, customRoles] = await Promise.all([
        User.findOne({ email: emailLower }).lean(),
        CustomRole.find({ "members.email": emailLower }).select("name").lean(),
      ]);
      user = userDoc;
      customRoleNames = customRoles.map((r) => r.name);
    } else {
      user = await User.findById(userId).lean();
      const email = user?.email;
      if (email) {
        const customRoles = await CustomRole.find({
          "members.email": email.toLowerCase(),
        }).select("name").lean();
        customRoleNames = customRoles.map((r) => r.name);
      }
    }

    if (!user) {
      // If not a standard user, check if they are at least a member of a custom role
      if (customRoleNames.length > 0) {
        user = {
          _id: userId,
          userId: userId,
          name: userId.split("@")[0].toUpperCase(),
          email: userId,
          roles: customRoleNames,
        };
      } else {
        return NextResponse.json({ user: null }, { status: 404 });
      }
    } else {
      // Merge custom roles into existing user object
      const allRoles = new Set([
        ...(user.roles || []),
        ...customRoleNames,
      ]);
      user.roles = Array.from(allRoles);
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
