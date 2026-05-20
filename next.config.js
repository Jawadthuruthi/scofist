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
};

// Create PWA configuration
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
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
 
