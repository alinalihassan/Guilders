import { RootProvider } from "fumadocs-ui/provider/next";

// oxlint-disable-next-line import/no-unassigned-import: Used for global styles
import "./global.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.guilders.app"),
  title: {
    default: "Guilders Docs",
    template: "%s | Guilders Docs",
  },
  description: "Documentation for the Guilders personal finance platform.",
  openGraph: {
    title: "Guilders Docs",
    description: "Documentation for the Guilders personal finance platform.",
    siteName: "Guilders Docs",
    images: [
      {
        url: "/assets/logo/cover.jpg",
        width: 1200,
        height: 630,
        alt: "Guilders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guilders Docs",
    description: "Documentation for the Guilders personal finance platform.",
    images: ["/assets/logo/cover.jpg"],
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: "static" } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
