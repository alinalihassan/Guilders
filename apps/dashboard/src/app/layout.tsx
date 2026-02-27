import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

// oxlint-disable-next-line import/no-unassigned-import: Used for global styles
import "@/styles/globals.css";
import { Providers } from "@/components/common/providers";
import { Toaster } from "@/components/ui/sonner";

import { defaultMetadata } from "./(pages)/metadata";

export const metadata = {
  ...defaultMetadata,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
