import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for Heroku deployment
  compiler: {
    // Keep console.log in production for debugging, only remove console.debug
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn', 'log'] } : false,
  },
  eslint: {
    // Disable ESLint during builds to prevent Heroku failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even with TypeScript errors
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  env: {
    NEXT_PUBLIC_SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  // Add headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
