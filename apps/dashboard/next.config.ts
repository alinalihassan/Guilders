import createMDX from "@next/mdx";
import type { NextConfig } from "next";

// Validate environment variables
import "@/lib/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  images: {
    remotePatterns: [
      {
        hostname: "db.guilders.app",
      },
      {
        hostname: "passiv-brokerage-logos.s3.ca-central-1.amazonaws.com",
      },
      {
        hostname: "storage.googleapis.com",
        pathname: "/iexcloud-hl37opg/api/logos/**",
      },
      {
        hostname: "enablebanking.com",
      },
    ],
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
