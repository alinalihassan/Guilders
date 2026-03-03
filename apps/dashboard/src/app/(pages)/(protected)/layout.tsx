"use client";

import type { ReactNode } from "react";

import { AdvisorSidebar } from "@/components/advisor/advisor-sidebar";
import { Dialogs } from "@/components/dialogs/dialogs";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AppTopBar } from "@/components/nav/app-top-bar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ADVISOR_SIDEBAR_WIDTH = 400;

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const advisorOpen = useStore((state) => state.advisorOpen);

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-16">
        <AppTopBar />
        <main className="flex flex-1 flex-col bg-muted/40 px-8">{children}</main>
      </div>
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col overflow-hidden border-l bg-background transition-[width] duration-300 ease-out",
          advisorOpen ? "w-[400px]" : "w-0 border-transparent",
          !advisorOpen && "pointer-events-none",
        )}
        aria-hidden={!advisorOpen}
      >
        <div
          className="flex h-full min-w-[400px] flex-col"
          style={{ width: ADVISOR_SIDEBAR_WIDTH }}
        >
          <AdvisorSidebar />
        </div>
      </aside>
      <Dialogs />
    </div>
  );
}
