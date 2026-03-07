
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { AdvisorSidebar } from "@/components/advisor/advisor-sidebar";
import { Dialogs } from "@/components/dialogs/dialogs";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AppTopBar } from "@/components/nav/app-top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSession } from "@/lib/session.functions";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ADVISOR_SIDEBAR_WIDTH = 400;

export const Route = createFileRoute("/(pages)/(protected)")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const advisorOpen = useStore((state) => state.advisorOpen);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleMainScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setIsScrolled((e.target as HTMLElement).scrollTop > 0);
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] flex-row overflow-hidden",
          advisorOpen && "gap-3",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <AppTopBar scrolled={isScrolled} />
          <main
            className="flex flex-1 flex-col overflow-auto px-4 md:px-6"
            onScroll={handleMainScroll}
          >
            <Outlet />
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
            className="flex h-full min-h-0 min-w-[400px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
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
