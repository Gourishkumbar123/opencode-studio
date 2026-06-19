/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@opencode/shared'],
  output: 'standalone',
  experimental: {
    serverActions: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
