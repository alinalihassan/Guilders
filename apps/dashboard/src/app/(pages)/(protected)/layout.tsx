"use client";

import type { ReactNode } from "react";

import { AdvisorSidebar } from "@/components/advisor/advisor-sidebar";
import { Dialogs } from "@/components/dialogs/dialogs";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AppTopBar } from "@/components/nav/app-top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ADVISOR_SIDEBAR_WIDTH = 400;

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const advisorOpen = useStore((state) => state.advisorOpen);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] flex-row overflow-hidden",
          advisorOpen && "gap-3",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <AppTopBar />
          <main className="flex flex-1 flex-col overflow-auto bg-muted/40 px-4 md:px-8">
            {children}
          </main>
        </div>
        <aside
          className={cn(
            "flex min-h-0 shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-out",
            advisorOpen ? "w-[400px]" : "w-0",
            !advisorOpen && "pointer-events-none",
          )}
          aria-hidden={!advisorOpen}
        >
          <div
            hidden={!advisorOpen}
            className="flex h-full min-h-0 min-w-[400px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm"
            style={{ width: ADVISOR_SIDEBAR_WIDTH }}
          >
            <AdvisorSidebar />
          </div>
        </aside>
      </SidebarInset>
      <Dialogs />
    </SidebarProvider>
  );
}
