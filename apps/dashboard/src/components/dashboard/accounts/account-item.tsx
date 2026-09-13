import type { Account } from "@guilders/api/types";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { ChangeBadge } from "@/components/common/change-badge";
import NumberFlow from "@/components/ui/number-flow";

import { AccountIcon } from "./account-icon";

interface AccountItemProps {
  account: Account;
}

export function AccountItem({ account }: AccountItemProps) {
  const [imageError, setImageError] = useState(false);
  const accountValue = Number(account.value);
  const accountCost = Number(account.cost ?? 0);
  const hasCost = account.cost !== null;
  const valueChange = hasCost ? accountValue - accountCost : 0;
  const changePercentage = hasCost && accountCost !== 0 ? (valueChange / accountCost) * 100 : 0;

  return (
    <Link
      to="/accounts/$id"
      params={{ id: String(account.id) }}
      className="hover:bg-muted/60 flex items-center justify-between rounded-lg px-1 py-2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0">
          <AccountIcon
            account={account}
            width={28}
            height={28}
            hasImageError={imageError}
            onImageError={() => setImageError(true)}
          />
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm">{account.name}</p>
          {account.institutionConnection?.broken && (
            <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 pl-3">
        <NumberFlow
          value={accountValue}
          format={{
            style: "currency",
            currency: account.currency,
          }}
          className="font-mono text-sm tabular-nums"
        />
        {valueChange !== 0 && (
          <ChangeBadge
            change={{
              value: valueChange,
              percentage: changePercentage,
              currency: account.currency,
            }}
          />
        )}
      </div>
    </Link>
  );
}
