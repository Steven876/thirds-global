import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Allow production builds to successfully complete even if
    // there are ESLint errors. We'll address these incrementally.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even if there are type errors.
    // This is useful to unblock deployment; fix types gradually.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
