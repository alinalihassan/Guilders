import type { Metadata } from "next";

import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences.",
};

const tabItems = [
  {
    title: "Account",
    href: "/settings/account",
  },
  {
    title: "Security",
    href: "/settings/security",
  },
  {
    title: "Connections",
    href: "/settings/connections",
  },
  {
    title: "Categories",
    href: "/settings/categories",
  },
  {
    title: "API Key",
    href: "/settings/api-key",
  },
  {
    title: "Subscription",
    href: "/settings/subscription",
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="space-y-6">
      <SettingsTabs items={tabItems} />
      <div className="flex-1 lg:max-w-2xl">{children}</div>
    </div>
  );
}
