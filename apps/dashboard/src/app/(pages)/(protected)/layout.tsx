"use client";

import type { ReactNode } from "react";

import { AdvisorSidebar } from "@/components/advisor/advisor-sidebar";
import { Dialogs } from "@/components/dialogs/dialogs";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AppTopBar } from "@/components/nav/app-top-bar";
import { useStore } from "@/lib/store";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const advisorOpen = useStore((state) => state.advisorOpen);

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-16">
        <AppTopBar />
        <main className="flex flex-1 flex-col bg-muted/40 px-8">{children}</main>
      </div>
      {advisorOpen && (
        <aside className="flex h-screen w-[400px] shrink-0 flex-col border-l bg-background">
          <AdvisorSidebar />
        </aside>
      )}
      <Dialogs />
    </div>
  );
}
