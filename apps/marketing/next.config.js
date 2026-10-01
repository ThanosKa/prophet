import { noindexPaths } from './lib/seo/pruned.mjs'
import { permanentRedirects } from './lib/seo/redirects.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode in development
  reactStrictMode: process.env.NODE_ENV === "production",

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Move dev indicator to bottom right
  devIndicators: {
    position: "bottom-right",
  },

  // Configure headers for security and CORS
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      // Reversible pruning: noindex pages stay reachable for users but drop out of the index.
      // See lib/seo/pruned.mjs.
      ...[...noindexPaths].map((path) => ({
        source: path,
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      })),
    ];
  },

  async redirects() {
    return permanentRedirects
  },
};

export default nextConfig;
