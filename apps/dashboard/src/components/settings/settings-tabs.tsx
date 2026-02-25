"use client";

import { CreditCard, Key, Satellite, Shield, Tag, UserCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SettingsTabsProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
  }[];
}

const getIcon = (title: string): React.ReactNode => {
  switch (title) {
    case "Account":
      return <UserCircle className="-ms-0.5 me-1.5 opacity-60" size={16} strokeWidth={2} />;
    case "Security":
      return <Shield className="-ms-0.5 me-1.5 opacity-60" size={16} strokeWidth={2} />;
    case "Connections":
      return <Satellite className="-ms-0.5 me-1.5 opacity-60" size={16} strokeWidth={2} />;
    case "API Key":
      return <Key className="-ms-0.5 me-1.5 opacity-60" size={16} strokeWidth={2} />;
    case "Categories":
      return <Tag className="-ms-0.5 me-1.5 opacity-60" size={16} strokeWidth={2} />;
    case "Subscription":
      return <CreditCard className="-ms-0.5 me-1.5 opacity-60" size={16} strokeWidth={2} />;
    default:
      return null;
  }
};

export function SettingsTabs({ className, items, ...props }: SettingsTabsProps) {
  const pathname = usePathname();

  return (
    <ScrollArea>
      <nav
        className={cn(
          "mb-3 flex h-auto gap-2 rounded-none border-b border-border bg-transparent px-0 py-1 text-foreground",
          className,
        )}
        {...props}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium relative transition-colors rounded-md",
              "hover:bg-accent hover:text-foreground",
              pathname === item.href
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {getIcon(item.title)}
            {item.title}
            {pathname === item.href && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-x-0 bottom-0 -mb-1 h-0.5 bg-primary"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 40,
                }}
              />
            )}
          </Link>
        ))}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
