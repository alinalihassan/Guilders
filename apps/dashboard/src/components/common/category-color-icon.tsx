import { getCategoryIcon } from "@/lib/utils/category-icons";
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#64748b";

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
  lg: "size-8 p-2",
} as const;

export function CategoryColorIcon({
  category,
  color: colorProp,
  icon: iconProp,
  size = "default",
  className,
}: CategoryColorIconProps) {
  const color = (colorProp ?? category?.color ?? DEFAULT_COLOR).trim() || DEFAULT_COLOR;
  const iconName = iconProp ?? category?.icon ?? undefined;
  const IconComponent = getCategoryIcon(iconName);

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
      <IconComponent
        className="size-full shrink-0"
        style={{ color }}
        strokeWidth={2}
      />
    </span>
  );
}
