import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.97.134.37:3000', '10.97.134.37'],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      },
      {
        source: "/scan",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, immutable" },
          { key: "Service-Worker-Allowed", value: "/" },
        ]
      },
      {
        source: "/(.*).js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, immutable" },
        ]
      },
    ]
  },
};

export default nextConfig;
