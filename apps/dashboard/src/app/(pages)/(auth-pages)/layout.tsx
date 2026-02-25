import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

import { defaultMetadata } from "../metadata";

export const metadata: Metadata = {
  ...defaultMetadata,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <Button asChild variant="ghost" size="sm" className="absolute left-4 top-4">
        <Link href={env.NEXT_PUBLIC_WEBSITE_URL}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>
      {children}
    </div>
  );
}
