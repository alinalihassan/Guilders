import type { Account } from "@guilders/api/types";
import Image from "next/image";

import { AccountFallbackIcon } from "./account-fallback-icon";

interface AccountIconProps {
  account: Account;
  width?: number;
  height?: number;
  hasImageError: boolean;
  onImageError: (accountId: number) => void;
}

export function AccountIcon({
  account,
  width,
  height,
  hasImageError,
  onImageError,
}: AccountIconProps) {
  if (account.image && !hasImageError) {
    return (
      <Image
        src={account.image}
        alt={account.name}
        width={width}
        height={height}
        className="rounded-full"
        onError={() => onImageError(account.id)}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-muted p-2 text-muted-foreground"
      style={{ width, height }}
    >
      <AccountFallbackIcon
        subtype={account.subtype}
        size={Math.max(14, Math.min(width ?? 20, height ?? 20))}
      />
    </div>
  );
}
