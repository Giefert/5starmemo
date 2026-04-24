import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: process.env.R2_PUBLIC_URL
      ? [{ protocol: 'https', hostname: new URL(process.env.R2_PUBLIC_URL).hostname }]
      : [],
  },
};

export default nextConfig;
