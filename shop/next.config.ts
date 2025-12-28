import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compress: true,
  poweredByHeader: false,
  reactCompiler: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', 'react-icons'],
  },
  images: {
    remotePatterns: [
      // Cualquier servicio en Railway (MinIO, etc.)
      {
        protocol: 'https',
        hostname: '**.up.railway.app',
        pathname: '/**',
      },
      // Supabase Storage (legacy - para imágenes que aún no se migraron)
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
