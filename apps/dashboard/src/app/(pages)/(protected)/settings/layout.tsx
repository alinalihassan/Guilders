import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { SettingsHeader } from "@/components/settings/settings-header";
import { MainScrollProvider } from "@/lib/scroll-context";

export const Route = createFileRoute("/(pages)/(protected)/settings")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path === "/settings") {
      throw redirect({ to: "/settings/account" });
    }
  },
  component: SettingsLayout,
});

function SettingsLayout() {
  const [isScrolled, setIsScrolled] = useState(false);

  return (
    <MainScrollProvider isScrolled={isScrolled}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SettingsHeader />
        <main
          className="flex flex-1 flex-col overflow-auto px-4 md:px-6"
          onScroll={(e) => setIsScrolled((e.currentTarget as HTMLElement).scrollTop > 0)}
        >
          <div className="mt-6 space-y-6 pb-8">
            <div className="flex-1 lg:max-w-2xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </MainScrollProvider>
  );
}
