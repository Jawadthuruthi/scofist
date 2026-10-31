# Tasks: Cloudflare R2 Hybrid Storage Integration

## Task 1: Dependencies and Environment Variables

**Description:** Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to provide S3-compatible client access for Cloudflare R2, and update `.env.example` with the required configuration keys.

**Acceptance criteria:**
- [x] `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are installed in `package.json` dependencies.
- [x] `.env.example` includes `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_DOMAIN`.

**Verification:**
- [x] Build succeeds: `npm run lint` or `npm ls @aws-sdk/client-s3`
- [x] Manual check: verify `.env.example` contains documented placeholders.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `.env.example`

**Estimated scope:** Small (2 files)

---

## Task 2: R2 Server Client and Utilities (`lib/r2.js`)

**Description:** Create a server-side utility `lib/r2.js` that instantiates the S3Client targeting Cloudflare R2 (`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`), and export helpers to generate presigned upload URLs and delete objects from R2.

**Acceptance criteria:**
- [x] S3 client is initialized with proper endpoint, region (`auto`), and credentials.
- [x] `createPresignedUploadUrl(key, contentType, expiresInSeconds)` function generates a valid presigned PUT URL.
- [x] `deleteR2Object(keyOrUrl)` extracts the object key and issues a `DeleteObjectCommand`.
- [x] Safe fallback/error handling if R2 environment variables are not yet populated.

**Verification:**
- [x] Build succeeds: `node --check lib/r2.js`
- [x] Manual check: helper functions handle edge cases (e.g. invalid URLs, missing env vars) gracefully.

**Dependencies:** Task 1

**Files likely touched:**
- `lib/r2.js`

**Estimated scope:** Small (1 file)

---

## Task 3: Presigned URL API Route (`app/api/r2/presigned-url/route.js`)

**Description:** Implement an authenticated Next.js API route that validates the user's role, sanitizes the requested file name and content type, verifies file size limits (<= 50MB), and returns a short-lived presigned PUT URL.

**Acceptance criteria:**
- [x] Verifies user authentication and role permissions from `x-user` header (matching permissions in `app/api/upload/route.js`).
- [x] Validates file extension against allowed document formats (`pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`).
- [x] Generates unique storage key (e.g. `${folder}/${Date.now()}-${sanitizedFileName}`).
- [x] Returns standardized JSON via `apiSuccess`: `{ presignedUrl, publicUrl, key }`.

**Verification:**
- [x] Build succeeds: `node --check app/api/r2/presigned-url/route.js`
- [x] Manual check: route returns 401 for unauthenticated calls and 400 for disallowed file types.

**Dependencies:** Task 2

**Files likely touched:**
- `app/api/r2/presigned-url/route.js`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Foundation
- [x] SDK packages installed and clean in `package.json`.
- [x] Server-side R2 module and API route compile cleanly.
- [x] User role verification and document type validation in place.

---

## Task 4: Client Upload Utility (`lib/r2Client.js`)

**Description:** Create a client-side utility `lib/r2Client.js` that abstracts the direct upload process: requests the presigned URL from `/api/r2/presigned-url`, performs the direct HTTP `PUT` to Cloudflare R2, and returns the public URL.

**Acceptance criteria:**
- [x] `uploadFileToR2(file, folder)` handles errors with clear user feedback.
- [x] Validates client-side file size (<= 50MB) before requesting presigned URL.
- [x] Performs `fetch(presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })`.
- [x] Returns `{ fileUrl, key, fileName }` on success.

**Verification:**
- [x] Build succeeds: `node --check lib/r2Client.js`
- [x] Manual check: correct error propagation when network or CORS errors occur.

**Dependencies:** Task 3

**Files likely touched:**
- `lib/r2Client.js`

**Estimated scope:** Small (1 file)

---

## Task 5: Books Module Integration

**Description:** Connect `components/Books.jsx` to upload book PDFs directly to R2 using `uploadFileToR2`, and update `app/api/books/route.js` DELETE handler to delete objects from R2 when an R2 URL is provided.

**Acceptance criteria:**
- [x] `components/Books.jsx` uses `uploadFileToR2` instead of posting large files to `/api/upload`.
- [x] Books API DELETE handler detects R2 URLs and calls `deleteR2Object`.
- [x] Cloudinary deletion remains intact for existing legacy book records.

**Verification:**
- [x] Build succeeds: `node --check app/api/books/route.js`
- [x] Manual check: Books upload flow passes `fileUrl` to `addBook.mutateAsync`.

**Dependencies:** Task 4

**Files likely touched:**
- `components/Books.jsx`
- `app/api/books/route.js`

**Estimated scope:** Small (2 files)

---

## Task 6: Syllabus Module Integration

**Description:** Connect `components/Syllabus.jsx` to upload syllabus files directly to R2 using `uploadFileToR2`, and update `app/api/syllabus/route.js` DELETE handler to delete objects from R2.

**Acceptance criteria:**
- [x] `components/Syllabus.jsx` uses `uploadFileToR2` instead of `/api/upload`.
- [x] Syllabus API DELETE handler detects R2 URLs and calls `deleteR2Object`.
- [x] Backward compatibility with Cloudinary files preserved.

**Verification:**
- [x] Build succeeds: `node --check app/api/syllabus/route.js`
- [x] Manual check: Syllabus creation and deletion work without 4.5MB payload limits.

**Dependencies:** Task 4

**Files likely touched:**
- `components/Syllabus.jsx`
- `app/api/syllabus/route.js`

**Estimated scope:** Small (2 files)

---

## Task 7: Downloads Module Integration

**Description:** Connect `components/Downloads.jsx` to upload general course material and downloads directly to R2 using `uploadFileToR2`, and update `app/api/downloads/route.js` DELETE handler to delete objects from R2.

**Acceptance criteria:**
- [x] `components/Downloads.jsx` uses `uploadFileToR2`.
- [x] Downloads API DELETE handler detects R2 URLs and calls `deleteR2Object`.
- [x] Dual deletion logic preserves legacy Cloudinary file deletion.

**Verification:**
- [x] Build succeeds: `node --check app/api/downloads/route.js`
- [x] Manual check: Course downloads upload directly to R2.

**Dependencies:** Task 4

**Files likely touched:**
- `components/Downloads.jsx`
- `app/api/downloads/route.js`

**Estimated scope:** Small (2 files)

---

## Checkpoint: Core Features
- [x] Books, Syllabus, and Downloads modules all upload directly to R2.
- [x] None of the three modules send file bodies through Next.js serverless functions.
- [x] Deletion logic successfully handles both Cloudinary and R2 URLs.

---

## Task 8: Production Build Verification & Setup Documentation

**Description:** Run a complete Next.js production build (`npm run build`) to verify bundle integrity, and document bucket setup, CORS configuration, and environment variables in `docs/r2-setup-guide.md`.

**Acceptance criteria:**
- [x] `npm run build` succeeds with zero errors.
- [x] `docs/r2-setup-guide.md` provides clear instructions for:
  - Creating Cloudflare R2 bucket.
  - Applying bucket CORS policy.
  - Enabling public bucket access.
  - Configuring `.env.local` / Vercel environment variables.

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Documentation check: CORS JSON and env var keys match codebase usage.

**Dependencies:** Tasks 5, 6, 7

**Files likely touched:**
- `docs/r2-setup-guide.md`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Complete
- [x] All 8 tasks implemented and verified.
- [x] Application builds without warnings or errors.
- [x] Ready for deployment to Vercel.
