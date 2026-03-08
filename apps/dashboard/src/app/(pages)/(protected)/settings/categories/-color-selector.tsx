"use client";

import { Block } from "@uiw/react-color";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#64748b", // slate
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f43f5e", // rose
] as const;

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
  const normalizedValue = value?.trim() || "#64748b";

  const handleChange = (hex: string) => {
    onColorSelect(hex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
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
      <PopoverContent className="w-auto border-border p-0" align="start" onKeyDown={handleKeyDown}>
        <Block
          color={normalizedValue}
          colors={[...PRESET_COLORS]}
          onChange={(color) => handleChange(color.hex)}
          showTriangle={false}
        />
      </PopoverContent>
    </Popover>
  );
}
