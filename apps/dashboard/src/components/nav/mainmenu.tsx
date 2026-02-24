"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { authApi } from "@/lib/auth-client";
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

const NavItem = ({ item, pathname }: NavItemProps) => (
  <li>
    <Tooltip>
      <TooltipTrigger asChild>
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-center rounded-md text-sm transition-colors relative",
              "hover:text-accent-foreground",
              "group",
              pathname === item.href
                ? [
                    "text-accent-foreground font-medium",
                    "after:absolute after:inset-0 after:bg-foreground/5 after:rounded-md",
                  ]
                : "after:absolute after:inset-0 after:bg-foreground/0 after:rounded-md after:transition-colors hover:after:bg-foreground/5",
              "h-10 w-10",
            )}
          >
            <item.icon className="h-5 w-5 relative z-10" />
            <span className="sr-only">{item.name}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={item.onClick}
            className={cn(
              "flex items-center justify-center rounded-md text-sm transition-colors relative",
              "hover:text-accent-foreground",
              "after:absolute after:inset-0 after:bg-foreground/0 after:rounded-md after:transition-colors hover:after:bg-foreground/5",
              "h-11 w-11",
            )}
          >
            <item.icon className="h-5 w-5 relative z-10" />
            <span className="sr-only">{item.name}</span>
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="right">{item.name}</TooltipContent>
    </Tooltip>
  </li>
);

export function MainMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const bottomItems = bottomNavigation.map((item) =>
    item.name === "Log Out"
      ? {
          ...item,
          onClick: async () => {
            await authApi.signOut();
            router.push("/login");
          },
        }
      : item,
  );

  return (
    <nav className="flex flex-col flex-1 mt-4 py-4">
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
