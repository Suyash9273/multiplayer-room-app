import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@multiplayer/db", "@multiplayer/shared"],
};

export default nextConfig;
