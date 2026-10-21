import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(req) {
  // ✅ FIX #2: Require a valid authenticated user — middleware injects x-user after JWT verification
  const xUser = req.headers.get("x-user");
  if (!xUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let user;
  try {
    user = JSON.parse(xUser);
  } catch (err) {
    return NextResponse.json({ message: "Invalid user session" }, { status: 401 });
  }

  const allowedRoles = ["College Admin", "Program Committee", "Org Admin", "Teacher", "Spark Admin"];
  if (!user?.roles?.some((r) => allowedRoles.includes(r))) {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions to upload" }, { status: 403 });
  }

  const isE2ETest =
    process.env.NODE_ENV !== "production" &&
    req.headers.get("x-e2e-test") === "true";

  if (isE2ETest) {
    return NextResponse.json(
      {
        secure_url: "https://e2e-test-dummy-url.com/test_syllabus.txt",
        public_id: "e2e-test-public-id",
        format: "txt",
        resource_type: "raw",
      },
      { status: 200 }
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Limit maximum file size to 15MB
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File exceeds maximum size limit of 15MB" },
        { status: 400 }
      );
    }

    // Get file extension and validate against allowed list
    const fileName = file.name || "unnamed";
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const ALLOWED_EXTENSIONS = [
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "xls",
      "xlsx",
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "txt",
    ];

    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { message: `File type .${fileExtension} is not allowed` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine if it's a PDF or document (should be raw) vs image
    const isPdfOrDoc = [
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "xls",
      "xlsx",
      "txt",
    ].includes(fileExtension);

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "downloads",
          resource_type: isPdfOrDoc ? "raw" : "auto", // Use 'raw' for documents
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json(
      {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        resource_type: uploadResult.resource_type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return NextResponse.json(
      {
        message: "Error uploading file",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
