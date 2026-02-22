import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Briefcase,
  ConciergeBell,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";

export interface NavItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  onClick?: () => void;
  breadcrumb?: {
    parent?: { name: string; href: string };
  };
}

export const mainNavigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    name: "Advisor",
    href: "/advisor",
    icon: ConciergeBell,
    breadcrumb: {
      parent: { name: "Dashboard", href: "/" },
    },
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: Briefcase,
    breadcrumb: {
      parent: { name: "Dashboard", href: "/" },
    },
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: ArrowRightLeft,
    breadcrumb: {
      parent: { name: "Dashboard", href: "/" },
    },
  },
];

export const bottomNavigation: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Log Out", icon: LogOut },
];
