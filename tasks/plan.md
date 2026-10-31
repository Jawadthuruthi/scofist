# Implementation Plan: Cloudflare R2 Hybrid Storage Integration

## Overview
Enable direct-to-storage uploads of large academic documents (PDFs, books, syllabi up to 50MB) to Cloudflare R2 using S3-compatible presigned PUT URLs. This completely eliminates Vercel's 4.5MB serverless payload limit and function timeout risks, avoids Cloudinary's 10MB raw file limit, and incurs zero egress fees, while keeping existing images/avatars on Cloudinary.

## Architecture Decisions
1. **Presigned Direct-to-R2 Uploads:** The browser requests a short-lived (60s) presigned PUT URL from Next.js (`POST /api/r2/presigned-url`) and PUTs the file directly to Cloudflare R2. File streams never transit through Vercel serverless functions.
2. **SDK Selection:** Use official lightweight `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`. R2's endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. **Dual Deletion Support:** Deletion endpoints in `books`, `syllabus`, and `downloads` inspect the file URL. If it's a Cloudinary URL, it calls Cloudinary destroy; if it's an R2 URL, it calls R2 `DeleteObjectCommand`. This prevents orphaned files while preserving backwards compatibility.
4. **Client-Side Abstraction:** Encapsulate the two-step upload (presigned URL request + direct binary PUT) in a clean helper `lib/r2Client.js` (`uploadFileToR2(file, folder)`).

---

## Task List

### Phase 1: Foundation & Backend Services
- [ ] **Task 1: Dependencies and Environment Variables**
  - Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
  - Add R2 environment variable templates to `.env.example`.
- [ ] **Task 2: R2 Server Client and Utilities (`lib/r2.js`)**
  - Initialize the S3Client configured for Cloudflare R2.
  - Implement helper functions for generating presigned upload URLs and deleting objects by URL/key.
- [ ] **Task 3: Presigned URL API Route (`app/api/r2/presigned-url/route.js`)**
  - Create secure API route checking user role permissions (`x-user` session header).
  - Validate file extension and size constraints (<= 50MB).
  - Return `{ presignedUrl, publicUrl, key }`.

### Checkpoint: Foundation
- [ ] Dependencies resolve cleanly without npm conflicts.
- [ ] Next.js dev server starts and compiles without errors.
- [ ] Unit/isolated verification of `lib/r2.js` client initialization.

---

### Phase 2: Client Helper & Feature Integrations
- [ ] **Task 4: Client Upload Utility (`lib/r2Client.js`)**
  - Implement `uploadFileToR2(file, folder, onProgress)` with proper HTTP headers and error handling.
- [ ] **Task 5: Books Module Integration**
  - Update `components/Books.jsx` to upload book PDFs via `uploadFileToR2`.
  - Update `app/api/books/route.js` DELETE handler to delete from R2 if URL belongs to R2.
- [ ] **Task 6: Syllabus Module Integration**
  - Update `components/Syllabus.jsx` to upload syllabus files via `uploadFileToR2`.
  - Update `app/api/syllabus/route.js` DELETE handler to support R2 object deletion.
- [ ] **Task 7: Downloads Module Integration**
  - Update `components/Downloads.jsx` to upload general downloads via `uploadFileToR2`.
  - Update `app/api/downloads/route.js` DELETE handler to support R2 object deletion.

### Checkpoint: Core Features
- [ ] All document upload modals correctly delegate to R2 direct PUT.
- [ ] Deletion logic handles both legacy Cloudinary URLs and new R2 URLs seamlessly.

---

### Phase 3: Verification, Setup Documentation & Production Readiness
- [ ] **Task 8: Production Build & Setup Documentation**
  - Run full production build (`npm run build`) to ensure zero bundling or dynamic import errors.
  - Create `docs/r2-setup-guide.md` with Cloudflare bucket CORS rules and environment variable setup instructions.

### Checkpoint: Complete
- [ ] Production build succeeds without errors.
- [ ] All acceptance criteria met across all modules.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Cloudflare R2 CORS Blocking** | High | Document exact CORS JSON policy required in Cloudflare dashboard (`PUT`, `GET`, `HEAD` for app domains). |
| **Missing R2 Credentials at Runtime** | Medium | Provide clear fallback / error messaging in `lib/r2.js` if env vars are unset. |
| **Bundle Size Overhead** | Low | Tree-shake AWS SDK using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (v3 modular SDK). |
| **Legacy File Breakage** | High | Dual deletion logic checks URL prefix (`cloudinary.com` vs R2 domain) before deleting. |

---

## Open Questions
- What is your Cloudflare public bucket domain? (Defaulting to placeholder `https://pub-<id>.r2.dev` or custom domain via `R2_PUBLIC_DOMAIN` in `.env`).
