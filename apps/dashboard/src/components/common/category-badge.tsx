import { DEFAULT_CATEGORY_COLOR } from "@guilders/api/types";
import { CircleDot } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

import { DEFAULT_CATEGORY_ICON } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CategoryLike = { name?: string; color?: string | null; icon?: string | null };

type CategoryBadgeProps = {
  category?: CategoryLike;
  className?: string;
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  if (!category) return null;

  const color = (category.color ?? DEFAULT_CATEGORY_COLOR).trim() || DEFAULT_CATEGORY_COLOR;
  const iconName = category.icon?.trim() || DEFAULT_CATEGORY_ICON;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`,
        color: color,
      }}
    >
      <DynamicIcon
        name={iconName as IconName}
        className="size-3.5 shrink-0"
        strokeWidth={2.5}
        fallback={() => <CircleDot className="size-3.5 shrink-0" strokeWidth={2.5} />}
      />
      <span className="max-w-[100px] truncate">{category.name}</span>
    </span>
  );
}
