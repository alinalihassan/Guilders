import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  const transactionsMenu = (
    <Link to="/transactions">
      <Button variant="secondary">
        View All
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Link>
  );

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{title}</CardTitle>
        {menuComponent ? (
          <div className="flex items-center gap-2">{menuComponent}</div>
        ) : (
          transactionsMenu
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <ScrollArea className="h-full w-full">
          {children || <TransactionsTable accountId={accountId} />}
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
