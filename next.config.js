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
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns", "lodash"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      // ── Security headers applied to every route ──────────────────────────
      {
        source: '/(.*)',
        headers: [
          {
            // Prevents clickjacking by disallowing the site from being
            // embedded in an <iframe> on another domain.
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Stops browsers from "sniffing" the MIME type, preventing
            // content-type confusion attacks.
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Restricts which browser features (camera, mic, geolocation)
            // this site can access — deny all by default.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            // Content Security Policy — restricts which external resources
            // (scripts, styles, images, fonts) can be loaded.
            // Allows self + Cloudinary images + Google Fonts.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://res.cloudinary.com",
              "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            // Referrer Policy — limits how much referrer info is sent
            // when navigating away from the site.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // ── Per-file headers ─────────────────────────────────────────────────
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

export default pwaConfig;
 
