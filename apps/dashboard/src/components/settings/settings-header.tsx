import { useMainScroll } from "@/lib/scroll-context";
import { cn } from "@/lib/utils";

import { SettingsTabs } from "./settings-tabs";

const SETTINGS_TAB_ITEMS = [
  { title: "Account", href: "/settings/account" },
  { title: "Security", href: "/settings/security" },
  { title: "Connections", href: "/settings/connections" },
  { title: "Categories", href: "/settings/categories" },
  { title: "Developer", href: "/settings/developer" },
  { title: "Subscription", href: "/settings/subscription" },
];

/**
 * Settings tabs header. Rendered outside the main scroll container (in protected
 * layout when on settings) so it stays fixed and doesn’t bounce with overscroll.
 */
export function SettingsHeader() {
  const { isScrolled } = useMainScroll();

  return (
    <div className="z-10 border-b border-border bg-card py-1">
      <div className="px-4 md:px-6">
        <SettingsTabs items={SETTINGS_TAB_ITEMS} />
        <div
          className={cn(
            "-mt-1 transition-shadow duration-200",
            isScrolled && "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08)]",
          )}
        />
      </div>
    </div>
  );
}
