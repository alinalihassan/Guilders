import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import { useMainScroll } from "@/lib/scroll-context";
import { cn } from "@/lib/utils";

const tabItems = [
  { title: "Account", href: "/settings/account" },
  { title: "Security", href: "/settings/security" },
  { title: "Connections", href: "/settings/connections" },
  { title: "Categories", href: "/settings/categories" },
  { title: "Developer", href: "/settings/developer" },
  { title: "Subscription", href: "/settings/subscription" },
];

export const Route = createFileRoute("/(pages)/(protected)/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { isScrolled } = useMainScroll();

  return (
    <div className="space-y-6 pb-8">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-card py-1 md:-mx-6">
        <div className="px-4 md:px-6">
          <SettingsTabs items={tabItems} />
          <div
            className={cn(
              "-mt-1 transition-shadow duration-200",
              isScrolled && "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08)]",
            )}
          />
        </div>
      </div>
      <div className="flex-1 lg:max-w-2xl">
        <Outlet />
      </div>
    </div>
  );
}
