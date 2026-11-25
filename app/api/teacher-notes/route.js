import mongoose from "mongoose";
import { cookies, headers } from "next/headers";
import connectToDB from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import {
  apiBadRequest,
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/apiResponse";
import TeacherNote from "@/models/TeacherNote";

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 5000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const NOTE_PROJECTION = "_id title content createdAt updatedAt";

export const dynamic = "force-dynamic";

/**
 * Resolves the authenticated teacher exclusively from server-verified headers
 * or cryptographic JWT cookies. Never trusts client-supplied teacherId values.
 */
async function resolveAuthenticatedTeacher() {
  const headerStore = await headers();
  const rawUser = headerStore.get("x-user");
  let user = null;

  if (rawUser && rawUser !== "undefined") {
    try {
      user = JSON.parse(rawUser);
    } catch {
      try {
        user = JSON.parse(decodeURIComponent(rawUser));
      } catch (decodeError) {
        console.error("Failed to parse x-user header:", decodeError.message);
        user = null;
      }
    }
  }

  if (!user) {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("auth-token")?.value ||
      cookieStore.get("custom-member-token")?.value;

    if (token) {
      const verified = await verifyToken(token);
      if (verified?.payload) {
        const p = verified.payload;
        user = {
          _id: p.userId || p._id,
          userId: p.userId || p._id,
          roles: Array.isArray(p.roles)
            ? p.roles
            : Array.isArray(p.customRoles)
              ? p.customRoles
              : [],
        };
      }
    }
  }

  const userId = user?._id || user?.userId;
  if (!userId) {
    return { error: apiUnauthorized("Authentication required") };
  }

  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (!roles.includes("Teacher")) {
    return { error: apiForbidden("Only teachers can access personal notes") };
  }

  return { teacherId: String(userId) };
}

function validateNoteInput(body, { requireContent = true, partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: apiBadRequest("Invalid request payload") };
  }

  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
  const hasContent = Object.prototype.hasOwnProperty.call(body, "content");

  if (partial && !hasTitle && !hasContent) {
    return { error: apiBadRequest("Provide title or content to update") };
  }

  const fields = {};

  if (hasTitle || !partial) {
    if (body.title !== undefined && body.title !== null) {
      if (typeof body.title !== "string") {
        return { error: apiBadRequest("Note title must be text") };
      }
      const trimmedTitle = body.title.trim();
      if (trimmedTitle.length > MAX_TITLE_LENGTH) {
        return {
          error: apiBadRequest(
            `Note title cannot exceed ${MAX_TITLE_LENGTH} characters`
          ),
        };
      }
      fields.title = trimmedTitle;
    } else {
      fields.title = "";
    }
  }

  if (hasContent || requireContent) {
    if (body.content !== undefined && body.content !== null) {
      if (typeof body.content !== "string") {
        return { error: apiBadRequest("Note content must be text") };
      }
      const trimmedContent = body.content.trim();
      if (!trimmedContent) {
        return { error: apiBadRequest("Note content cannot be empty") };
      }
      if (trimmedContent.length > MAX_CONTENT_LENGTH) {
        return {
          error: apiBadRequest(
            `Note content cannot exceed ${MAX_CONTENT_LENGTH} characters`
          ),
        };
      }
      fields.content = trimmedContent;
    } else if (requireContent) {
      return { error: apiBadRequest("Note content is required") };
    }
  }

  return fields;
}

function isValidNoteId(id) {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

async function parseJsonBody(req) {
  try {
    return { data: await req.json() };
  } catch (parseError) {
    console.error("Invalid JSON payload in /api/teacher-notes:", parseError.message);
    return { error: apiBadRequest("Invalid JSON request body") };
  }
}

function safeApiError(error, context) {
  console.error(`[${context}] Error:`, error);
  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Internal server error");
  return apiError(normalized);
}

function getSearchParams(req) {
  return req?.nextUrl?.searchParams ?? new URL(req.url).searchParams;
}

export async function GET(req) {
  try {
    const auth = await resolveAuthenticatedTeacher();
    if (auth.error) return auth.error;

    await connectToDB();

    const searchParams = getSearchParams(req);
    const parsedPage = parseInt(searchParams.get("page") || "0", 10);
    const parsedLimit = parseInt(
      searchParams.get("limit") || String(DEFAULT_LIMIT),
      10
    );

    const page = Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    // Strictly isolate notes to the authenticated teacher only
    const query = { teacherId: auth.teacherId };

    const [notes, total] = await Promise.all([
      TeacherNote.find(query)
        .select(NOTE_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .lean(),
      TeacherNote.countDocuments(query),
    ]);

    return apiSuccess(notes, "Teacher notes fetched successfully", {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return safeApiError(error, "GET /api/teacher-notes");
  }
}

export async function POST(req) {
  try {
    const auth = await resolveAuthenticatedTeacher();
    if (auth.error) return auth.error;

    const parsedBody = await parseJsonBody(req);
    if (parsedBody.error) return parsedBody.error;

    const validated = validateNoteInput(parsedBody.data, {
      requireContent: true,
    });
    if (validated.error) return validated.error;

    await connectToDB();

    const created = await TeacherNote.create({
      teacherId: auth.teacherId,
      title: validated.title,
      content: validated.content,
    });

    const safeNote = {
      _id: created._id,
      title: created.title,
      content: created.content,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    return apiCreated(safeNote, "Note saved successfully");
  } catch (error) {
    return safeApiError(error, "POST /api/teacher-notes");
  }
}

async function handleUpdate(req, { partial = false } = {}) {
  try {
    const auth = await resolveAuthenticatedTeacher();
    if (auth.error) return auth.error;

    const parsedBody = await parseJsonBody(req);
    if (parsedBody.error) return parsedBody.error;

    const { _id } = parsedBody.data || {};
    if (!isValidNoteId(_id)) {
      return apiBadRequest("Valid note ID is required");
    }

    const validated = validateNoteInput(parsedBody.data, {
      requireContent: !partial,
      partial,
    });
    if (validated.error) return validated.error;

    await connectToDB();

    // Ownership filter ensures a teacher can never update another teacher's note
    const updated = await TeacherNote.findOneAndUpdate(
      { _id, teacherId: auth.teacherId },
      { $set: validated },
      { new: true, runValidators: true }
    )
      .select(NOTE_PROJECTION)
      .lean();

    if (!updated) {
      return apiNotFound("Note");
    }

    return apiSuccess(updated, "Note updated successfully");
  } catch (error) {
    return safeApiError(error, "UPDATE /api/teacher-notes");
  }
}

export async function PUT(req) {
  return handleUpdate(req, { partial: false });
}

export async function PATCH(req) {
  return handleUpdate(req, { partial: true });
}

export async function DELETE(req) {
  try {
    const auth = await resolveAuthenticatedTeacher();
    if (auth.error) return auth.error;

    const searchParams = getSearchParams(req);
    let noteId = searchParams.get("id");

    if (!noteId) {
      const parsedBody = await parseJsonBody(req);
      if (parsedBody.error) return parsedBody.error;
      noteId = parsedBody.data?._id;
    }

    if (!isValidNoteId(noteId)) {
      return apiBadRequest("Valid note ID is required");
    }

    await connectToDB();

    // Ownership filter ensures a teacher can never delete another teacher's note
    const deleted = await TeacherNote.findOneAndDelete({
      _id: noteId,
      teacherId: auth.teacherId,
    })
      .select("_id")
      .lean();

    if (!deleted) {
      return apiNotFound("Note");
    }

    return apiSuccess({ _id: deleted._id }, "Note deleted successfully");
  } catch (error) {
    return safeApiError(error, "DELETE /api/teacher-notes");
  }
}
