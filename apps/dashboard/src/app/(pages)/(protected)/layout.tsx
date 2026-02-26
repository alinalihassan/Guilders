import type { ReactNode } from "react";

import { Dialogs } from "@/components/dialogs/dialogs";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AppTopBar } from "@/components/nav/app-top-bar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col md:ml-16">
        <AppTopBar />
        <main className="flex flex-1 flex-col bg-muted/40 px-8">{children}</main>
      </div>
      <Dialogs />
    </div>
  );
}
