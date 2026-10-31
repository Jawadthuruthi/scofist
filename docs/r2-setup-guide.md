# Cloudflare R2 Setup Guide for Scofist

This guide covers setting up your Cloudflare R2 bucket for direct browser uploads of academic documents (books, syllabus, and course downloads up to 50MB).

---

## 1. Create a Cloudflare R2 Bucket

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, navigate to **R2 Storage** > **Overview**.
3. Click **Create bucket**.
4. Enter a bucket name (e.g., `scofist-docs`) and choose **Automatic** (or your closest region) for Location.
5. Click **Create Bucket**.

---

## 2. Configure Bucket CORS Policy (Crucial)

Because browsers upload files directly to Cloudflare R2 via presigned PUT URLs, Cloudflare must permit cross-origin requests from your app.

1. In your bucket settings, go to the **Settings** tab.
2. Scroll down to **CORS Policy** and click **Add CORS policy** (or Edit).
3. Paste the following JSON policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://*.vercel.app",
      "https://scofist.com",
      "https://www.scofist.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
4. Click **Save**.

---

## 3. Enable Public Access for Direct Downloads

To allow students and staff to view/download documents without routing through Vercel serverless compute:

### Option A: Custom Subdomain (Recommended for Production)
1. In the **Settings** tab of your bucket, find **Public access**.
2. Click **Connect Domain**.
3. Enter your custom domain (e.g., `files.scofist.com` or `cdn.scofist.com`).
4. Follow the Cloudflare prompts to connect the DNS record.
5. Your `R2_PUBLIC_DOMAIN` will be `https://files.scofist.com`.

### Option B: Free R2.dev Subdomain (Quick Setup / Testing)
1. In the **Settings** tab, scroll to **R2.dev subdomain**.
2. Click **Allow Access** and type `allow` to confirm.
3. Copy the public URL provided (e.g. `https://pub-xxxxxxxxxxxxxx.r2.dev`).
4. Your `R2_PUBLIC_DOMAIN` will be `https://pub-xxxxxxxxxxxxxx.r2.dev`.

---

## 4. Generate R2 API Tokens

1. Return to the main **R2 Storage** > **Overview** page in Cloudflare.
2. On the right side, click **Manage R2 API Tokens**.
3. Click **Create API token**.
4. Configure permissions:
   - **Permissions:** `Object Read & Write`
   - **Specify bucket(s):** Apply to `scofist-docs` (or all buckets)
   - **TTL:** Leave as indefinite (unless you prefer periodic rotation)
5. Click **Create API Token**.
6. Copy the following credentials:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (visible on the R2 overview page or in the token endpoint URL: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)

---

## 5. Add Environment Variables

### Local Development (`.env.local`)
Add the following keys to your `.env.local`:

```bash
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_access_key_id"
R2_SECRET_ACCESS_KEY="your_secret_access_key"
R2_BUCKET_NAME="scofist-docs"
R2_PUBLIC_DOMAIN="https://pub-xxxxxxxxxxxxxx.r2.dev" # or https://files.scofist.com
```

### Vercel Production Deployment
1. Go to your project on the [Vercel Dashboard](https://vercel.com).
2. Navigate to **Settings** > **Environment Variables**.
3. Add the 5 variables above (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN`).
4. Ensure they are available for **Production**, **Preview**, and **Development**.
