import { AccountsTable } from "@/components/dashboard/accounts/accounts-table";
import type { Account } from "@guilders/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
  const accountsMenu = (
    <Link href="/accounts">
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
        {menuComponent || accountsMenu}
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <AccountsTable accounts={accounts} />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
