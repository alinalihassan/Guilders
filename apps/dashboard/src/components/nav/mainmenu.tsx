"use client";

import { Link, useRouter, useLocation } from "@tanstack/react-router";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import {
  type NavItem as NavItemType,
  bottomNavigation,
  mainNavigation,
} from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

interface NavItemProps {
  item: NavItemType;
  pathname: string;
}

const NavItem = ({ item, pathname }: NavItemProps) => {
  const href = item.href;
  const isActive = href ? pathname === href : false;

  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <Link
              to={href}
              className={cn(
                "flex items-center justify-center rounded-md text-sm transition-colors relative",
                "hover:text-accent-foreground",
                "group",
                isActive
                  ? [
                      "text-accent-foreground font-medium",
                      "after:absolute after:inset-0 after:bg-foreground/5 after:rounded-md",
                    ]
                  : "after:absolute after:inset-0 after:bg-foreground/0 after:rounded-md after:transition-colors hover:after:bg-foreground/5",
                "h-10 w-10",
              )}
            >
              <item.icon className="relative z-10 h-5 w-5" />
              <span className="sr-only">{item.name}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex items-center justify-center rounded-md text-sm transition-colors relative",
                "hover:text-accent-foreground",
                "group",
                isActive
                  ? [
                      "text-accent-foreground font-medium",
                      "after:absolute after:inset-0 after:bg-foreground/5 after:rounded-md",
                    ]
                  : "after:absolute after:inset-0 after:bg-foreground/0 after:rounded-md after:transition-colors hover:after:bg-foreground/5",
                "h-10 w-10",
              )}
            >
              <item.icon className="relative z-10 h-5 w-5" />
              <span className="sr-only">{item.name}</span>
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    </li>
  );
};

export function MainMenu() {
  const { pathname } = useLocation();
  const router = useRouter();
  const bottomItems = bottomNavigation.map((item) =>
    item.name === "Log Out"
      ? {
          ...item,
          onClick: async () => {
            try {
              await authClient.signOut();
            } catch {
              // Session may already be invalid; still redirect
            }
            router.navigate({
              to: "/login",
              search: { redirect: "", message: "", error: "", success: "" },
              replace: true,
            });
          },
        }
      : item,
  );

  return (
    <nav className="flex flex-1 flex-col py-4">
      <div className="flex-1">
        <TooltipProvider delayDuration={0}>
          <ul className="flex flex-col items-center gap-1.5">
            {mainNavigation.map((item) => (
              <NavItem key={item.name} item={item} pathname={pathname} />
            ))}
          </ul>
        </TooltipProvider>
      </div>

      <div>
        <TooltipProvider delayDuration={0}>
          <ul className="flex flex-col items-center gap-1.5">
            {bottomItems.map((item) => (
              <NavItem key={item.name} item={item} pathname={pathname} />
            ))}
          </ul>
        </TooltipProvider>
      </div>
    </nav>
  );
}
