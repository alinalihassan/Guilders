import type { Account } from "@guilders/api/types";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { AccountsTable } from "@/components/dashboard/accounts/accounts-table";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AccountsCardProps {
  className?: string;
  title?: string;
  menuComponent?: ReactNode;
  accounts?: Account[];
}

export function AccountsCard({
  className,
  title = "Accounts",
  menuComponent,
  accounts,
}: AccountsCardProps) {
  return (
    <Card className={cn("flex flex-col shadow-none", className)}>
      <CardContent className="flex h-full min-h-0 flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            {title}
          </p>
          {menuComponent !== undefined ? (
            menuComponent
          ) : (
            <Link
              to="/accounts"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <AccountsTable accounts={accounts} />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
