import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fail builds on TypeScript errors so issues are caught at build time
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Allow next/image to load avatars from any HTTPS host (chat platform avatars etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Allow large response bodies from AI/webhook endpoints
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Packages that should not be bundled into serverless functions
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
