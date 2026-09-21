import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.uet.edu.pk',
      },
    ],
  },
};

export default nextConfig;
