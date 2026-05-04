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
      // Old /compare/X-alternative URLs got 404s in GSC — slugs live at /alternatives/X-alternative
      { source: "/compare/sider-alternative", destination: "/alternatives/sider-alternative", permanent: true },
      { source: "/compare/monica-ai-alternative", destination: "/alternatives/monica-ai-alternative", permanent: true },
      { source: "/compare/claude-in-chrome-alternative", destination: "/alternatives/claude-in-chrome-alternative", permanent: true },
      { source: "/compare/maxai-alternative", destination: "/alternatives/maxai-alternative", permanent: true },
      { source: "/compare/merlin-alternative", destination: "/alternatives/merlin-alternative", permanent: true },
      { source: "/compare/harpa-ai-alternative", destination: "/alternatives/harpa-ai-alternative", permanent: true },
    ];
  },
};

export default nextConfig;
