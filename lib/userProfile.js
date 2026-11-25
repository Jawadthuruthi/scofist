import { cache } from "react";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import CustomRole from "@/models/CustomRole";

const USER_PROFILE_SELECT =
  "_id name email roles profilePic teacherSpecificField.status studentSpecificField.status";

export function hasRealRoles(roles) {
  return (
    Array.isArray(roles) &&
    roles.some((role) => typeof role === "string" && role.trim() !== "" && role !== "User")
  );
}

/**
 * Fetches a user's core profile and merged custom roles directly from MongoDB.
 */
export async function fetchUserWithMergedRoles(rawIdentifier) {
  if (!rawIdentifier || typeof rawIdentifier !== "string" || !rawIdentifier.trim()) {
    return null;
  }

  const identifier = rawIdentifier.trim();
  await connectToDB();

  let user = null;
  let customRoleNames = [];

  if (identifier.includes("@")) {
    const emailLower = identifier.toLowerCase();
    const [userDoc, customRoles] = await Promise.all([
      User.findOne({ email: emailLower }).select(USER_PROFILE_SELECT).lean(),
      CustomRole.find({ "members.email": emailLower }).select("name").lean(),
    ]);
    user = userDoc;
    customRoleNames = customRoles.map((r) => r.name);
  } else {
    user = await User.findById(identifier).select(USER_PROFILE_SELECT).lean();
    if (user?.email) {
      const customRoles = await CustomRole.find({
        "members.email": user.email.toLowerCase(),
      })
        .select("name")
        .lean();
      customRoleNames = customRoles.map((r) => r.name);
    }
  }

  if (!user) {
    if (customRoleNames.length === 0) return null;
    return {
      _id: identifier,
      userId: identifier,
      name: identifier.split("@")[0].toUpperCase(),
      email: identifier,
      roles: customRoleNames,
    };
  }

  return {
    ...user,
    userId: user._id,
    roles: Array.from(new Set([...(user.roles || []), ...customRoleNames])),
  };
}

export const getCachedUserProfile = cache(fetchUserWithMergedRoles);
