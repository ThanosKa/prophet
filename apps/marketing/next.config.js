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
    ];
  },

  async redirects() {
    return [
      {
        source: "/blog/best-ai-chrome-extensions-2026",
        destination: "/best-ai-chrome-extensions",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
