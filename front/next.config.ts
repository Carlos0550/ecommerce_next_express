import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3001", pathname: "/api/storage/**" },
      { protocol: "https", hostname: "**.railway.app", pathname: "/api/storage/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
};

export default nextConfig;
