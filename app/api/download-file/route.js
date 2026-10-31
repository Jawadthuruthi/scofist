import { NextResponse } from "next/server";
import { isR2Url } from "@/lib/r2";

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

    console.log("Fetching file from:", fileUrl);
    console.log("Requested filename:", filename);

    // Fetch the file from Cloudinary with proper headers
    const response = await fetch(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    console.log("Cloudinary response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudinary error:", errorText);
      throw new Error(
        `Failed to fetch file from Cloudinary. Status: ${response.status}`
      );
    }

    // Get the buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    let contentType = response.headers.get("content-type");

    // Check magic bytes for PDF
    if (buffer.length >= 4 && buffer.slice(0, 4).toString() === "%PDF") {
      contentType = "application/pdf";
    } else if (!contentType || contentType === "application/octet-stream") {
      const ext = filename.toLowerCase().split(".").pop();
      const mimeTypes = {
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
      contentType = mimeTypes[ext] || "application/octet-stream";
    }

    console.log("Final Content-Type:", contentType, "isInline:", isInline);

    // Format filename for headers (support UTF-8/Arabic)
    const encodedFilename = encodeURIComponent(filename).replace(/'/g, "%27");
    const asciiFilename = filename.replace(/[^\x00-\x7F]/g, "_");

    const dispositionType = isInline ? "inline" : "attachment";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${dispositionType}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
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
