import type { NextConfig } from "next";

// oxlint-disable-next-line import/no-unassigned-import: Used to validate environment variables
import "@/lib/env";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "radix-ui",
      "motion",
      "streamdown",
      "cmdk",
      "@tanstack/react-query",
      "zod",
    ],
  },
  images: {
    remotePatterns: [
      {
        hostname: "db.guilders.app",
      },
      {
        hostname: "bucket.guilders.app",
      },
      {
        hostname: "storage.googleapis.com",
        pathname: "/iexcloud-hl37opg/api/logos/**",
      },
      // Enable Banking
      {
        hostname: "enablebanking.com",
      },
      // SnapTrade
      {
        hostname: "logo.twelvedata.com",
      },
      {
        hostname: "api.twelvedata.com",
      },
      {
        hostname: "passiv-brokerage-logos.s3.ca-central-1.amazonaws.com",
      },
      // Teller
      {
        hostname: "teller.io",
      },
    ],
  },
};

export default nextConfig;
