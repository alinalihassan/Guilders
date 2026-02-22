import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { defaultMetadata } from "../metadata";

export const metadata: Metadata = {
  ...defaultMetadata,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4"
      >
        <Link href={env.NEXT_PUBLIC_WEBSITE_URL}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
      </Button>
      {children}
    </div>
  );
}
