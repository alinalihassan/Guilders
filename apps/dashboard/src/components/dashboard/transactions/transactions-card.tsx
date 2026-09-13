import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TransactionsTable } from "./transactions-table";

interface TransactionsCardProps {
  className?: string;
  title?: string;
  menuComponent?: ReactNode;
  accountId?: number;
  children?: ReactNode;
}

export function TransactionsCard({
  className,
  title = "Transactions",
  menuComponent,
  accountId,
  children,
}: TransactionsCardProps) {
  return (
    <Card className={cn("flex flex-col shadow-none", className)}>
      <CardContent className="flex h-full min-h-0 flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            {title}
          </p>
          {menuComponent !== undefined ? (
            <div className="flex min-w-0 items-center gap-2">{menuComponent}</div>
          ) : (
            <Link
              to="/transactions"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="@container min-h-0 flex-1 overflow-hidden">
          {children || <TransactionsTable accountId={accountId} />}
        </div>
      </CardContent>
    </Card>
  );
}
