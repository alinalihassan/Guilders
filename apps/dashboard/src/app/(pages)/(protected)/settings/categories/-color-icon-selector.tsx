"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useState } from "react";

import { CategoryColorIcon } from "@/components/common/category-color-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { DEFAULT_CATEGORY_ICON, ICON_OPTIONS, PRESET_COLORS } from "./-constants";

interface CategoryColorIconSelectorProps {
  value: string;
  icon: string | null;
  onColorSelect: (color: string) => void;
  onIconSelect: (icon: string) => void;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function CategoryColorIconSelector({
  value,
  icon,
  onColorSelect,
  onIconSelect,
  size = "default",
  className,
}: CategoryColorIconSelectorProps) {
  const [open, setOpen] = useState(false);
  const normalizedColor = value?.trim() || PRESET_COLORS[0];
  const effectiveIcon = icon ?? DEFAULT_CATEGORY_ICON;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLElement) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("shrink-0 transition-transform duration-200 active:scale-95", className)}
          aria-label="Choose color and icon"
        >
          <CategoryColorIcon color={normalizedColor} icon={icon} size={size} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[min(90vw,320px)] border-border p-3"
        align="start"
        onKeyDown={handleKeyDown}
      >
        <div className="space-y-3">
          {/* Color — same grid size/count as icons */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground">Color</p>
            <div className="grid grid-cols-7 gap-1 p-1">
              {PRESET_COLORS.map((color) => {
                const isSelected = normalizedColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-transform duration-200 active:scale-90",
                      isSelected && "ring-2 ring-offset-2 ring-muted-foreground/50",
                    )}
                    style={{
                      backgroundColor: color,
                      ...(isSelected && {
                        boxShadow: `inset 0 0 0 2px var(--background), 0 0 0 2px ${color}`,
                      }),
                    }}
                    onClick={() => onColorSelect(color)}
                    aria-label={`Select color ${color}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Icon — same grid as colors */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground">Icon</p>
            <div className="grid grid-cols-7 gap-1 p-1">
              {ICON_OPTIONS.map((opt) => {
                const isSelected = effectiveIcon === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-colors",
                      isSelected && "ring-2 ring-offset-2 ring-muted-foreground/50",
                    )}
                    style={{
                      backgroundColor: isSelected
                        ? `color-mix(in oklab, ${normalizedColor} 10%, transparent)`
                        : undefined,
                    }}
                    onClick={() => onIconSelect(opt.value)}
                    title={opt.label}
                    aria-label={opt.label}
                  >
                    <DynamicIcon
                      name={opt.value as IconName}
                      className="size-5 shrink-0"
                      style={{ color: isSelected ? normalizedColor : undefined }}
                      strokeWidth={2}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
