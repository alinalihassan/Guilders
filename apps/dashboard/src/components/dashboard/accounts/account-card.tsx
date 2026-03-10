import type { Account } from "@guilders/api/types";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { AccountsTable } from "@/components/dashboard/accounts/accounts-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const accountsMenu = (
    <Link to="/accounts">
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
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <AccountsTable accounts={accounts} />
      </CardContent>
    </Card>
  );
}
