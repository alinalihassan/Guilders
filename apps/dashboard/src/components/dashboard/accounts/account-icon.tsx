import type { Account } from "@guilders/api/types";
import {
  Bitcoin,
  CarFront,
  ChartCandlestick,
  CirclePercent,
  CreditCard,
  DollarSign,
  HandCoins,
  House,
  Landmark,
} from "lucide-react";
import Image from "next/image";

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
  const getFallbackIcon = () => {
    switch (account.subtype) {
      case "depository":
        return <Landmark className={`w-[${width}px] h-[${height}px]`} />;
      case "brokerage":
        return (
          <ChartCandlestick className={`w-[${width}px] h-[${height}px]`} />
        );
      case "crypto":
        return <Bitcoin className={`w-[${width}px] h-[${height}px]`} />;
      case "property":
        return <House className={`w-[${width}px] h-[${height}px]`} />;
      case "creditcard":
        return <CreditCard className={`w-[${width}px] h-[${height}px]`} />;
      case "loan":
        return <HandCoins className={`w-[${width}px] h-[${height}px]`} />;
      case "vehicle":
        return <CarFront className={`w-[${width}px] h-[${height}px]`} />;
      case "stock":
        return <CirclePercent className={`w-[${width}px] h-[${height}px]`} />;
      default:
        return <DollarSign className={`w-[${width}px] h-[${height}px]`} />;
    }
  };

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
      className="p-2 flex items-center justify-center text-muted-foreground rounded-full bg-muted"
      style={{ width, height }}
    >
      {getFallbackIcon()}
    </div>
  );
}
