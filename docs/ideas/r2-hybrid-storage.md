# Cloudflare R2 Hybrid Storage for Academic Documents

## Problem Statement
How might we allow teachers and administrators to upload large academic materials (PDFs, books, syllabi up to 50MB) without hitting Vercel's 4.5MB serverless payload ceiling or Cloudinary's 10MB raw file limit, while maintaining zero egress costs?

## Recommended Direction
Adopt a **Hybrid Direct-to-Storage Architecture**:
1. **Presigned Upload Flow:** The browser requests `POST /api/r2/presigned-url` with the filename, MIME type, and destination folder. The Next.js server validates role permissions (via JWT session) and generates a 60-second S3 presigned PUT URL and the final public CDN URL.
2. **Direct Browser Upload:** The client frontend uploads the raw binary file directly to Cloudflare R2 via `fetch(presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })`. This bypasses Vercel's 4.5MB serverless payload limit and function timeouts entirely.
3. **Metadata Storage:** Upon upload completion, the client submits document metadata (`title`, `fileUrl`, `fileSize`, etc.) to the existing Next.js database API endpoints (saving to `Book`, `Syllabus`, `Download` MongoDB collections).
4. **Cloudinary Retention:** Existing profile pictures, student avatars, and gallery photos remain on Cloudinary to continue leveraging automatic image transformations, webp conversion, and responsive scaling.

## Key Assumptions to Validate
- [ ] **R2 S3 Compatibility:** `@aws-sdk/s3-request-presigner` generates working presigned PUT URLs compatible with Cloudflare R2 endpoints.
- [ ] **R2 Bucket CORS:** An R2 bucket CORS rule (`AllowedOrigins: ["http://localhost:3000", "https://*.vercel.app"]`, `AllowedMethods: ["PUT", "GET", "OPTIONS"]`) permits browser PUT requests.
- [ ] **Public Bucket Access:** Public download URLs work directly in browsers for PDFs without requiring authenticated read endpoints.

## MVP Scope
- Add Cloudflare R2 credentials to `.env.example` and local environment:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_DOMAIN`
- Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Create `lib/r2.js` to initialize the S3/R2 client singleton.
- Implement `app/api/r2/presigned-url/route.js` (role-gated: Admin, Teacher, Spark Admin).
- Update document upload modals (e.g., syllabus, book, course download components) to fetch presigned URLs and PUT directly to R2.
- Update document deletion endpoints to remove deleted objects from R2 via `DeleteObjectCommand`.

## Not Doing (and Why)
- **Migrating Existing Gallery / Profile Photos:** Unnecessary churn. Cloudinary excels at responsive images and auto-formatting; R2 provides no transformation engine out of the box.
- **Serverless File Proxying:** We will NOT stream uploads or downloads through Next.js API routes (`/api/download-file`). Proxying re-introduces the 4.5MB payload limit and consumes serverless compute.
- **Private Presigned Download URLs:** Not needed for general syllabus, public books, and academic downloads. Public CDN URLs are faster and zero-overhead.
- **Multipart Uploads for Gigabyte Files:** Capped at 50MB single-PUT uploads to keep client code lightweight and avoid chunk management complexity.

## Open Questions & Next Steps
1. Configure Cloudflare R2 bucket with appropriate CORS policy:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://*.vercel.app"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": [],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
2. Enable public access on the bucket (either via Cloudflare custom domain or `r2.dev` public subdomain).
3. Proceed with implementation planning via `/plan` or `planning-and-task-breakdown`.
