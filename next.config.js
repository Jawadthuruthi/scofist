import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
// trigger restart 7
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "lodash",
      "@tanstack/react-query",
      "@tanstack/react-table",
      "cmdk",
      "date-fns-tz",
    ],
  },
  turbopack: {},
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const r2PublicDomain = (process.env.R2_PUBLIC_DOMAIN || "").trim().replace(/\/+$/, "");
    const r2Sources = [
      "https://*.r2.cloudflarestorage.com",
      "https://*.r2.dev",
      r2PublicDomain,
    ]
      .filter(Boolean)
      .join(" ");

    const securityHeaders = [
      {
        // Stops browsers from "sniffing" the MIME type, preventing
        // content-type confusion attacks.
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        // Restricts which browser features this site can access.
        // Camera is allowed for self (barcode/QR scanners), others denied by default.
        key: 'Permissions-Policy',
        value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()',
      },
      {
        // Content Security Policy — restricts which external resources can be loaded.
        // Explicitly allows framing for documents (Google Docs, Cloudinary, blob) and YouTube videos.
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com https://*.cdnfonts.com",
          "font-src 'self' https://fonts.gstatic.com https://fonts.cdnfonts.com https://*.cdnfonts.com data:",
          `img-src 'self' data: blob: https://res.cloudinary.com ${r2Sources}`,
          isDev
            ? `connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com ${r2Sources} ws: wss: http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*`
            : `connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com https://fonts.googleapis.com https://fonts.gstatic.com https://fonts.cdnfonts.com ${r2Sources}`,
          `frame-src 'self' https://docs.google.com https://drive.google.com https://www.youtube.com https://www.youtube-nocookie.com https://res.cloudinary.com ${r2Sources} blob: data:`,
          "object-src 'self' blob: data:",
          "worker-src 'self' blob:",
          isDev
            ? "frame-ancestors 'self' vscode-webview: http://localhost:* https://localhost:*"
            : "frame-ancestors 'self'",
        ].join('; '),
      },
      {
        // Referrer Policy — limits how much referrer info is sent
        // when navigating away from the site.
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
    ];

    if (!isDev) {
      securityHeaders.unshift({
        // Prevents clickjacking by disallowing cross-domain embedding in production
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      });
    }

    return [
      // ── Security headers applied to every route ──────────────────────────
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // ── Per-file headers ─────────────────────────────────────────────────
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
      {
        source: '/api/app-icon',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
      {
        source: '/sdc_seal.png',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
    ];
  },
};

// Create PWA configuration
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
  disable: true, // Disable next-pwa plugin so Vercel serves the static sw.js we committed to git!
  buildExcludes: [
    /middleware-manifest\.json$/,
    /^pages\/index\.html$/,
    /^index\.html$/,
  ],
  runtimeCaching: [
    {
      urlPattern: /^\/$/,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^\/(.*)$/,
      handler: "NetworkOnly",
    },
  ],
})(nextConfig);

// In development, export raw nextConfig without withPWA to prevent Turbopack-Webpack conflict warnings
export default process.env.NODE_ENV === "development" ? nextConfig : pwaConfig;
 
