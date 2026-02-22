import { env } from "@/lib/env";
import type { Metadata } from "next/types";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_DASHBOARD_URL),
  title: {
    default: "Guilders - AI-Powered Personal Finance Management",
    template: "%s | Guilders",
  },
  description:
    "Take control of your finances with Guilders. Track accounts, investments, and spending all in one place.",
  keywords: [
    "personal finance",
    "money management",
    "investment tracking",
    "budgeting",
    "financial planning",
    "net worth tracking",
    "financial dashboard",
  ],
  authors: { name: "Guilders", url: "https://guilders.app" },
  creator: "Guilders",
  publisher: "Guilders",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/src/app/favicon.ico",
  },
  openGraph: {
    title: "Guilders - AI-Powered Personal Finance Management",
    description:
      "Take control of your finances with Guilders. Connect your accounts, track investments, and manage your money smarter.",
    type: "website",
    url: "https://guilders.app",
    images: { url: "/assets/logo/cover.jpg", width: 2460, height: 1110 },
  },
  twitter: {
    card: "summary_large_image",
    title: "Guilders - AI-Powered Personal Finance Management",
    description:
      "Take control of your finances with Guilders. Connect your accounts, track investments, and manage your money smarter.",
    images: { url: "/assets/logo/cover.jpg", width: 2460, height: 1110 },
  },
};
