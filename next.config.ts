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
  
  // CORS headers for Word add-in
  async headers() {
    // Allow both localhost (dev) and Vercel (production)
    const allowedOrigins = [
      "https://aticon-autodoc-new.vercel.app",
      "https://localhost:3000",
    ];
    
    return [
      {
        source: "/api/:path*",
        headers: [
          // Note: For multiple origins, we'll handle this dynamically in middleware
          // For now, allow all origins in development
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
