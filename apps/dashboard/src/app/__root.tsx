import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import { Providers } from "@/components/common/providers";
import { Toaster } from "@/components/ui/sonner";

import appCss from "@/styles/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Guilders - AI-Powered Personal Finance Management",
      },
      {
        name: "description",
        content:
          "Take control of your finances with Guilders. Track accounts, investments, and spending all in one place.",
      },
      {
        name: "keywords",
        content:
          "personal finance, money management, investment tracking, budgeting, financial planning, net worth tracking, financial dashboard",
      },
      { name: "authors", content: "Guilders", attrs: { url: "https://guilders.app" } },
      { name: "creator", content: "Guilders" },
      { name: "publisher", content: "Guilders" },
      { property: "og:title", content: "Guilders - AI-Powered Personal Finance Management" },
      {
        property: "og:description",
        content:
          "Take control of your finances with Guilders. Connect your accounts, track investments, and manage your money smarter.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://guilders.app" },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:title", content: "Guilders - AI-Powered Personal Finance Management" },
      {
        property: "twitter:description",
        content:
          "Take control of your finances with Guilders. Connect your accounts, track investments, and manage your money smarter.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/src/app/favicon.ico" },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className="font-mono font-sans" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <Providers>
          <Outlet />
        </Providers>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
