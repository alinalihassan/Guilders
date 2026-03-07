import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SettingsTabs } from "@/components/settings/settings-tabs";

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
  return (
    <div className="space-y-6 pb-8">
      <SettingsTabs items={tabItems} />
      <div className="flex-1 lg:max-w-2xl">
        <Outlet />
      </div>
    </div>
  );
}
