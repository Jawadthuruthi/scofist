import { NextResponse } from "next/server";
import { isR2Url } from "@/lib/r2";

const MIME_MAP = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "document.pdf";
    const isInline = searchParams.get("inline") === "true";

    if (!fileUrl) {
      return NextResponse.json(
        { message: "File URL is required" },
        { status: 400 }
      );
    }

    // SSRF protection: only allow trusted Cloudinary and Cloudflare R2 hosts
    const isCloudinary =
      fileUrl.startsWith("https://res.cloudinary.com/") ||
      fileUrl.startsWith("http://res.cloudinary.com/");
    const isR2 = isR2Url(fileUrl);

    if (!isCloudinary && !isR2) {
      return NextResponse.json(
        { message: "Invalid file host" },
        { status: 400 }
      );
    }

    // Forward range header if present (allows PDF.js and media players to stream chunks)
    const clientRange = req.headers.get("range");
    const fetchHeaders = {
      "User-Agent": "Mozilla/5.0",
    };
    if (clientRange) {
      fetchHeaders["Range"] = clientRange;
    }

    // Fetch upstream stream directly
    const upstreamResponse = await fetch(fileUrl, {
      headers: fetchHeaders,
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      const errorText = await upstreamResponse.text().catch(() => "");
      console.error("Upstream file fetch error:", upstreamResponse.status, errorText);
      throw new Error(
        `Failed to fetch file from storage host. Status: ${upstreamResponse.status}`
      );
    }

    // Determine content type
    let contentType = upstreamResponse.headers.get("content-type");
    if (!contentType || contentType === "application/octet-stream") {
      const ext = filename.toLowerCase().split(".").pop();
      contentType = MIME_MAP[ext] || "application/octet-stream";
    }

    // Format filename for headers (support UTF-8/Arabic)
    const encodedFilename = encodeURIComponent(filename).replace(/'/g, "%27");
    const asciiFilename = filename.replace(/[^\x00-\x7F]/g, "_");
    const dispositionType = isInline ? "inline" : "attachment";

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set(
      "Content-Disposition",
      `${dispositionType}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    responseHeaders.set("Cache-Control", "public, max-age=86400, must-revalidate");
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("Accept-Ranges", "bytes");

    const contentLength = upstreamResponse.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = upstreamResponse.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    // Stream upstream body directly without buffering into server RAM
    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("Download/Preview error:", error);
    return NextResponse.json(
      {
        message: "Failed to download/preview file",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
