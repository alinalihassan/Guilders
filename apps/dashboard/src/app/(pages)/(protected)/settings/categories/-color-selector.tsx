"use client";

import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { PRESET_COLORS } from "./-constants";

interface CategoryColorSelectorProps {
  value: string;
  onColorSelect: (color: string) => void;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-4",
  default: "size-5",
  lg: "size-6",
} as const;

export function CategoryColorSelector({
  value,
  onColorSelect,
  size = "default",
  className,
}: CategoryColorSelectorProps) {
  const [open, setOpen] = useState(false);
  const sizeClass = sizeClasses[size];
  const normalizedValue = value?.trim() || PRESET_COLORS[0];

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
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-border bg-background p-0.5 transition-transform duration-200 active:scale-95",
            sizeClass,
            className,
          )}
          aria-label="Choose color"
        >
          <span className="size-2.5 rounded-full" style={{ backgroundColor: normalizedValue }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto border-border p-2" align="start" onKeyDown={handleKeyDown}>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_COLORS.map((color) => {
            const isSelected = normalizedValue.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                className={cn(
                  "rounded-full transition-transform duration-200 active:scale-90",
                  sizeClass,
                  isSelected && "ring-2 ring-offset-2 ring-muted-foreground/50",
                )}
                style={{
                  backgroundColor: color,
                  ...(isSelected && {
                    boxShadow: `inset 0 0 0 2px var(--background), 0 0 0 2px ${color}`,
                  }),
                }}
                onClick={() => {
                  onColorSelect(color);
                  setOpen(false);
                }}
                aria-label={`Select color ${color}`}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
