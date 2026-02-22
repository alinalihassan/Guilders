import type { Metadata } from "next";
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
    <div className="min-h-screen flex items-center justify-center">
      {children}
    </div>
  );
}
