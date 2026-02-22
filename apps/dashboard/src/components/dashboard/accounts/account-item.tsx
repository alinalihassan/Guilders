import { ChangeBadge } from "@/components/common/change-badge";
import type { Account } from "@guilders/api/types";
import NumberFlow from "@number-flow/react";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountIcon } from "./account-icon";

interface AccountItemProps {
  account: Account;
}

export function AccountItem({ account }: AccountItemProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/accounts/${account.id}`);
  };

  const changePercentage =
    account.cost !== null
      ? ((account.value - account.cost) / account.cost) * 100
      : 0;

  return (
    <div
      onClick={handleClick}
      key={account.id}
      className={
        "flex items-center justify-between p-2 rounded-lg hover:bg-secondary dark:hover:bg-secondary cursor-pointer"
      }
    >
      <div className="flex items-center gap-4">
        <AccountIcon
          account={account}
          width={32}
          height={32}
          hasImageError={imageError}
          onImageError={() => setImageError(true)}
        />
        <div className="flex items-center gap-2">
          <p className="font-medium">{account.name}</p>
          {account.institution_connection?.broken && (
            <TriangleAlert className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="font-medium">
          <NumberFlow
            value={account.value}
            format={{
              style: "currency",
              currency: account.currency,
            }}
          />
        </p>
        <ChangeBadge
          change={{
            value: account.cost !== null ? account.value - account.cost : 0,
            percentage: changePercentage,
            currency: account.currency,
          }}
        />
      </div>
    </div>
  );
}
