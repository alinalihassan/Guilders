"use client";

import { bottomNavigation, mainNavigation } from "@/lib/config/navigation";
import {
  Breadcrumb as BreadcrumbComponent,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import React from "react";
import { useAccount } from "../../lib/queries/useAccounts";

export type Breadcrumb = {
  name: string;
  href?: string;
};

export function getBreadcrumbs(pathname: string): Breadcrumb[] {
  // Find matching nav item
  const allNavItems = [...mainNavigation, ...bottomNavigation];
  // Find the most specific matching route
  const currentItem = allNavItems
    .filter((item) => item.href && pathname.startsWith(item.href))
    .sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0))[0];

  if (!currentItem) {
    // Handle dynamic routes
    if (
      pathname.startsWith("/accounts/") ||
      pathname.startsWith("/transactions/")
    ) {
      return [
        { name: "Dashboard", href: "/" },
        { name: "Accounts", href: "/accounts" },
        { name: "Loading..." }, // This will be replaced by the dynamic component
      ];
    }

    // Default fallback
    return [{ name: "Dashboard", href: "/" }];
  }

  // Build breadcrumb trail
  const breadcrumbs: Breadcrumb[] = [];

  // Add parent if it exists
  if (currentItem.breadcrumb?.parent) {
    breadcrumbs.push({
      name: currentItem.breadcrumb.parent.name,
      href: currentItem.breadcrumb.parent.href,
    });
  }

  // Add current page
  breadcrumbs.push({
    name: currentItem.name,
    href: currentItem.href,
  });

  return breadcrumbs;
}

export function DynamicBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const accountId = pathname.startsWith("/accounts/")
    ? Number.parseInt(pathname.split("/").pop() ?? "0")
    : undefined;
  const { data: account } = useAccount(accountId ?? 0);
  let breadcrumbs = getBreadcrumbs(pathname);

  // Update breadcrumbs if we have account data
  if (accountId && account) {
    breadcrumbs = [
      { name: "Dashboard", href: "/" },
      { name: "Accounts", href: "/accounts" },
      { name: account.name },
    ];
  }

  return (
    <BreadcrumbComponent className={className}>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={breadcrumb.name}>
            <BreadcrumbItem className="hidden md:block">
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className="text-[15px] font-medium">
                  {breadcrumb.name}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href={breadcrumb.href}
                  className="text-[15px] font-medium"
                >
                  {breadcrumb.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbComponent>
  );
}
