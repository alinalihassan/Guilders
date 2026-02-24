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

type AccountFallbackIconProps = {
  subtype?: string | null;
  size?: number;
  className?: string;
};

export function AccountFallbackIcon({ subtype, size = 20, className }: AccountFallbackIconProps) {
  switch (subtype) {
    case "depository":
      return <Landmark size={size} className={className} />;
    case "brokerage":
      return <ChartCandlestick size={size} className={className} />;
    case "crypto":
      return <Bitcoin size={size} className={className} />;
    case "property":
      return <House size={size} className={className} />;
    case "creditcard":
      return <CreditCard size={size} className={className} />;
    case "loan":
      return <HandCoins size={size} className={className} />;
    case "vehicle":
      return <CarFront size={size} className={className} />;
    case "stock":
      return <CirclePercent size={size} className={className} />;
    default:
      return <DollarSign size={size} className={className} />;
  }
}
