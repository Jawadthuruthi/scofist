import { cache } from "react";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import CustomRole from "@/models/CustomRole";
import { parseUser } from "@/lib/utils";

const USER_PROFILE_SELECT =
  "_id name email roles profilePic teacherSpecificField.status studentSpecificField.status";

function mergeRoleLists(...roleLists) {
  const merged = new Set();
  for (const list of roleLists) {
    if (!Array.isArray(list)) continue;
    for (const role of list) {
      if (typeof role === "string" && role.trim() !== "") {
        merged.add(role);
      }
    }
  }
  return Array.from(merged);
}

export function hasRealRoles(roles) {
  return (
    Array.isArray(roles) &&
    roles.some((role) => typeof role === "string" && role.trim() !== "" && role !== "User")
  );
}

/**
 * Merges a user's stored roles with any CustomRole memberships matching their email.
 */
export async function getMergedUserRoles(baseRoles = [], email = null) {
  const emailLower = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!emailLower) {
    return mergeRoleLists(baseRoles);
  }

  const customRoles = await CustomRole.find({ "members.email": emailLower })
    .select("name")
    .lean();
  const customRoleNames = customRoles.map((r) => r?.name);
  return mergeRoleLists(baseRoles, customRoleNames);
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
      roles: mergeRoleLists(customRoleNames),
    };
  }

  return {
    ...user,
    userId: user._id,
    roles: mergeRoleLists(user.roles, customRoleNames),
  };
}

export const getCachedUserProfile = cache(fetchUserWithMergedRoles);

/**
 * Resolves the SSR user profile (hydrating from MongoDB when roles or profile-cache
 * are missing/stale) and the active role from cookie/header fallbacks.
 */
export async function resolveLayoutUserAndRole(headerStore, cookiesStore) {
  const headerUser = parseUser(headerStore);
  const uid = headerUser?._id || headerUser?.userId || headerUser?.email;
  const hasProfileCacheCookie = Boolean(cookiesStore.get("profile-cache")?.value);
  const forceProfileRefresh = cookiesStore.has("force-profile-refresh");
  const needsProfileCacheSync = Boolean(
    uid && (!hasRealRoles(headerUser?.roles) || !hasProfileCacheCookie || forceProfileRefresh)
  );

  let user = headerUser;
  if (needsProfileCacheSync) {
    try {
      const dbUser = await getCachedUserProfile(String(uid));
      if (dbUser) {
        user = {
          ...headerUser,
          ...dbUser,
          profilePic: dbUser.profilePic || headerUser?.profilePic,
        };
      }
    } catch (err) {
      console.error("Failed to hydrate user roles in layout:", err?.message || err);
    }
  }

  const resolvedRoles = Array.isArray(user?.roles) ? user.roles : [];
  const cookieRole = cookiesStore.get("active-role")?.value;
  const headerRole = headerStore.get("active-role");
  let activeRole =
    cookieRole && (resolvedRoles.length === 0 || resolvedRoles.includes(cookieRole))
      ? cookieRole
      : headerRole && (resolvedRoles.length === 0 || resolvedRoles.includes(headerRole))
        ? headerRole
        : resolvedRoles[0];

  if ((!activeRole || activeRole === "User") && hasRealRoles(resolvedRoles)) {
    activeRole = resolvedRoles.includes("Teacher")
      ? "Teacher"
      : resolvedRoles.find((r) => r && r !== "User") || resolvedRoles[0];
  }

  return {
    user,
    activeRole,
    needsProfileCacheSync,
  };
}
