import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["web-push"],
  eslint: {
    // ESLint chạy riêng, không block build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
