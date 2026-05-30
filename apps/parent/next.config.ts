import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pp5/database", "@pp5/ui"],
};

export default nextConfig;
