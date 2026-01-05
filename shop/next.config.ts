import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  compress: true,
  poweredByHeader: false,
  reactCompiler: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', 'react-icons'],
  },
  images: {
    remotePatterns: [
      
      {
        protocol: 'https',
        hostname: '**.up.railway.app',
        pathname: '/**',
      },
      
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
