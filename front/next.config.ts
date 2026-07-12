import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/images/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000", pathname: "/images/**" },
      { protocol: "http", hostname: "192.168.18.6", port: "9000", pathname: "/images/**" },
      { protocol: "https", hostname: "**.railway.app", pathname: "/api/storage/**" },
      { protocol: "https", hostname: "**.railway.app", pathname: "/images/**" },
      { protocol: "https", hostname: "**.up.railway.app", pathname: "/**" },
      { protocol: "http", hostname: "**.sslip.io", port: "9010", pathname: "/images/**" },
      { protocol: "https", hostname: "**.sslip.io", port: "9010", pathname: "/images/**" },
    ],
    dangerouslyAllowLocalIP: true,
    qualities: [75, 90],
  },
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
};

export default nextConfig;
