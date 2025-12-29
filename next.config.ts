import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // For API routes in App Router, we need to handle large payloads differently
  // The 413 error suggests the request is being rejected before reaching our handler
  output: 'standalone', // Optimizes for Vercel deployment
};

export default nextConfig;
