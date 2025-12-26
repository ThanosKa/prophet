/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode in development
  reactStrictMode: process.env.NODE_ENV === 'production',

  // Enable image optimization
  images: {
    unoptimized: true,
  },

  // Configure headers for security and CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default nextConfig
