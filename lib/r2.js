import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || "").replace(/\/+$/, "");

/**
 * Returns an instantiated S3Client configured for Cloudflare R2.
 */
export function getR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "Cloudflare R2 is not fully configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generates an S3 presigned PUT URL and the target public CDN URL.
 *
 * @param {string} key - S3 object key (e.g. "books/1730000000-math.pdf")
 * @param {string} contentType - MIME type of the file (e.g. "application/pdf")
 * @param {number} expiresIn - Expiration time in seconds (default: 60)
 * @returns {Promise<{ presignedUrl: string, publicUrl: string, key: string }>}
 */
export async function createPresignedUploadUrl(key, contentType, expiresIn = 60) {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not set in environment variables.");
  }

  const s3 = getR2Client();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn });
  const publicUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${key}` : "";

  return {
    presignedUrl,
    publicUrl,
    key,
  };
}

/**
 * Extracts the R2 key from an R2 public URL or returns the key if already formatted.
 *
 * @param {string} keyOrUrl
 * @returns {string|null}
 */
export function extractR2Key(keyOrUrl) {
  if (!keyOrUrl || typeof keyOrUrl !== "string") return null;

  // If already a relative key (does not start with http/https)
  if (!keyOrUrl.startsWith("http://") && !keyOrUrl.startsWith("https://")) {
    return keyOrUrl;
  }

  try {
    const urlObj = new URL(keyOrUrl);
    // Key is the pathname without the leading slash
    return urlObj.pathname.replace(/^\/+/, "");
  } catch (err) {
    return null;
  }
}

/**
 * Checks if a given URL is an R2-managed URL.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isR2Url(url) {
  if (!url || typeof url !== "string") return false;
  if (url.includes(".r2.cloudflarestorage.com")) return true;
  if (url.includes(".r2.dev")) return true;
  if (R2_PUBLIC_DOMAIN && url.startsWith(R2_PUBLIC_DOMAIN)) return true;
  return false;
}

/**
 * Deletes an object from Cloudflare R2 by key or public URL.
 *
 * @param {string} keyOrUrl
 * @returns {Promise<boolean>}
 */
export async function deleteR2Object(keyOrUrl) {
  const key = extractR2Key(keyOrUrl);
  if (!key || !R2_BUCKET_NAME) {
    return false;
  }

  try {
    const s3 = getR2Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error("Failed to delete object from Cloudflare R2:", error);
    return false;
  }
}
