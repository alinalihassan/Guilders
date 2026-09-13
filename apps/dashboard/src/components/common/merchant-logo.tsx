import { useState } from "react";

import { cn } from "@/lib/utils";

type MerchantLogoProps = {
  name: string;
  logoUrl?: string | null;
  className?: string;
  imageClassName?: string;
};

export function MerchantLogo({ name, logoUrl, className, imageClassName }: MerchantLogoProps) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className={cn(
          "bg-muted flex size-8 items-center justify-center rounded-full border object-cover",
          className,
          imageClassName,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full border font-medium",
        className,
      )}
    >
      {initial}
    </div>
  );
}
