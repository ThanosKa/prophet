/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for deployment optimization
  output: 'standalone',

  // Disable strict mode in development to prevent double-rendering issues with streaming
  reactStrictMode: process.env.NODE_ENV === 'production',

  // Configure headers for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },

  // Webpack configuration for external packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark certain packages as external to prevent bundling issues
      config.externals = [...(config.externals || []), 'pg', 'pg-hstore']
    }
    return config
  },

  // Enable experimental features
  experimental: {
    // Server actions for form handling
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Turbopack configuration for Next.js 16
  turbopack: {},
}

export default nextConfig
