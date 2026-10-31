import { NextResponse } from "next/server";
import { createPresignedUploadUrl } from "@/lib/r2";
import { apiSuccess } from "@/lib/apiResponse";
import { handleApiError, ApiError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
  "College Admin",
  "Program Committee",
  "Org Admin",
  "Teacher",
  "Spark Admin",
];

const ALLOWED_FOLDERS = ["books", "syllabus", "downloads", "documents", "general"];

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "csv",
  "zip",
  "jpg",
  "jpeg",
  "png",
  "webp",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req) {
  try {
    // 1. Authenticate user from middleware-injected x-user header
    const xUser = req.headers.get("x-user");
    if (!xUser) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    let user;
    try {
      user = JSON.parse(xUser);
    } catch (err) {
      throw new ApiError("Invalid user session", 401, "INVALID_SESSION");
    }

    const hasPermission = user?.roles?.some((r) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      throw new ApiError(
        "Forbidden: Insufficient permissions to generate upload URL",
        403,
        "FORBIDDEN"
      );
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { fileName, contentType, fileSize, folder = "downloads" } = body;

    if (!fileName || typeof fileName !== "string") {
      throw new ApiError("Missing or invalid fileName", 400, "BAD_REQUEST");
    }

    if (!contentType || typeof contentType !== "string") {
      throw new ApiError("Missing or invalid contentType", 400, "BAD_REQUEST");
    }

    if (fileSize && Number(fileSize) > MAX_FILE_SIZE) {
      throw new ApiError(
        `File size exceeds maximum allowed limit of 50MB`,
        400,
        "FILE_TOO_LARGE"
      );
    }

    const targetFolder = ALLOWED_FOLDERS.includes(folder) ? folder : "downloads";

    // 3. Validate file extension
    const extension = fileName.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new ApiError(
        `File extension .${extension} is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        400,
        "INVALID_FILE_TYPE"
      );
    }

    // 4. Sanitize file name and construct storage key
    const baseName = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    const uniqueKey = `${targetFolder}/${Date.now()}-${baseName}.${extension}`;

    // 5. Generate presigned URL
    const { presignedUrl, publicUrl, key } = await createPresignedUploadUrl(
      uniqueKey,
      contentType,
      60 // 60 seconds expiration
    );

    return apiSuccess(
      {
        presignedUrl,
        publicUrl,
        key,
        fileName,
      },
      "Presigned upload URL generated successfully"
    );
  } catch (error) {
    return handleApiError(error, "POST /api/r2/presigned-url");
  }
}
