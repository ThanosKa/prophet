import { noindexPaths } from './lib/seo/pruned.mjs'
import { permanentRedirects } from './lib/seo/redirects.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: process.env.NODE_ENV === "production",

  // vinext would otherwise stream generateMetadata tags into the body for browsers and crawlers.
  htmlLimitedBots: /.*/,

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  devIndicators: {
    position: "bottom-right",
  },

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
