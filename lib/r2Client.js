/**
 * Client-side utility for direct-to-R2 file uploads.
 * Bypasses Vercel's 4.5MB serverless payload limit and Cloudinary raw limits.
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Checks if a URL is hosted on Cloudflare R2 or direct CDN.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isR2Url(url) {
  if (!url || typeof url !== "string") return false;
  if (url.includes(".r2.cloudflarestorage.com")) return true;
  if (url.includes(".r2.dev")) return true;
  if (!url.includes("cloudinary.com") && (url.startsWith("http://") || url.startsWith("https://"))) {
    return true;
  }
  return false;
}

/**
 * Uploads a file directly to Cloudflare R2 using a short-lived presigned PUT URL.
 *
 * @param {File} file - Browser File object to upload
 * @param {string} folder - Destination folder ("books", "syllabus", "downloads", etc.)
 * @returns {Promise<{ fileUrl: string, key: string, fileName: string }>}
 */
export async function uploadFileToR2(file, folder = "downloads") {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" exceeds the maximum allowed upload size of 50MB.`
    );
  }

  const contentType = file.type || "application/octet-stream";

  // 1. Request presigned upload URL from Next.js API
  const presignResponse = await fetch("/api/r2/presigned-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType,
      fileSize: file.size,
      folder,
    }),
  });

  const presignResult = await presignResponse.json();

  if (!presignResponse.ok || !presignResult.success) {
    const errorMsg =
      presignResult.error ||
      presignResult.message ||
      `Failed to generate upload URL (status ${presignResponse.status})`;
    throw new Error(errorMsg);
  }

  const { presignedUrl, publicUrl, key } = presignResult.data;

  if (!presignedUrl) {
    throw new Error("Invalid presigned URL returned from server.");
  }

  // 2. Direct binary PUT upload straight to Cloudflare R2
  try {
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Cloudflare R2 upload rejected with status: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }
  } catch (err) {
    console.error("Direct R2 upload error:", err);
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error(
        "Upload blocked by browser security (CSP) or CORS. Please verify Content-Security-Policy and R2 bucket CORS permit PUT requests."
      );
    }
    throw err;
  }

  return {
    fileUrl: publicUrl,
    key,
    fileName: file.name,
  };
}
