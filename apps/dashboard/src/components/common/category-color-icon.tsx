import { DEFAULT_CATEGORY_COLOR } from "@guilders/api/types";
import { CircleDot } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

import { DEFAULT_CATEGORY_ICON } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CategoryLike = { color?: string | null; icon?: string | null };

type CategoryColorIconProps = {
  /** Category object (e.g. from API or form state with value/icon). */
  category?: CategoryLike;
  /** Override color when not using category. */
  color?: string | null;
  /** Override icon when not using category. */
  icon?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "size-5 p-1",
  default: "size-6 p-1.5",
  lg: "size-8 p-1.5",
} as const;

export function CategoryColorIcon({
  category,
  color: colorProp,
  icon: iconProp,
  size = "default",
  className,
}: CategoryColorIconProps) {
  const color =
    (colorProp ?? category?.color ?? DEFAULT_CATEGORY_COLOR).trim() || DEFAULT_CATEGORY_COLOR;
  const iconName = (iconProp ?? category?.icon)?.trim() || DEFAULT_CATEGORY_ICON;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border",
        sizeClasses[size],
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`,
        borderColor: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
      aria-hidden
    >
      <DynamicIcon
        name={iconName as IconName}
        className="size-full shrink-0"
        style={{ color }}
        strokeWidth={2}
        fallback={() => (
          <CircleDot className="size-full shrink-0" style={{ color }} strokeWidth={2} />
        )}
      />
    </span>
  );
}
