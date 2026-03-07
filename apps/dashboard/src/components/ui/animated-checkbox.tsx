"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface AnimatedCheckboxProps {
  title?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

const springTransition = {
  type: "spring" as const,
  duration: 0.4,
  bounce: 0.2,
};

export function AnimatedCheckbox({
  title,
  checked: controlledChecked,
  defaultChecked = false,
  className,
  onCheckedChange,
  id,
  "aria-label": ariaLabel,
  disabled = false,
}: AnimatedCheckboxProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : uncontrolledChecked;

  const handleClick = () => {
    if (disabled) return;
    const newChecked = !checked;
    if (!isControlled) setUncontrolledChecked(newChecked);
    onCheckedChange?.(newChecked);
  };

  const hasTitle = title !== undefined && title !== "";

  const box = (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      id={id}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex items-center gap-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded",
        !hasTitle && "cursor-pointer w-fit",
        hasTitle && "cursor-pointer",
        disabled && "cursor-not-allowed opacity-50 pointer-events-none",
        className,
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "size-4 rounded-sm flex items-center justify-center border border-input transition-colors duration-200 shrink-0",
          checked
            ? "bg-foreground border-transparent"
            : "bg-transparent border-muted-foreground/40 hover:border-muted-foreground/60",
        )}
      >
        <svg viewBox="0 0 20 20" className="size-full text-background">
          <motion.path
            d="M 0 4.5 L 3.182 8 L 10 0"
            fill="transparent"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(5 6)"
            initial={{
              pathLength: (isControlled ? controlledChecked : defaultChecked) ? 1 : 0,
              opacity: (isControlled ? controlledChecked : defaultChecked) ? 1 : 0,
            }}
            animate={{
              pathLength: checked ? 1 : 0,
              opacity: checked ? 1 : 0,
            }}
            transition={{
              pathLength: { ease: "easeOut", duration: 0.3 },
              opacity: { duration: 0 },
            }}
          />
        </svg>
      </div>
      {hasTitle ? (
        <div className="relative">
          <span
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              checked ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {title}
          </span>
          <motion.div
            className="absolute left-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-muted-foreground"
            initial={{
              width: (isControlled ? controlledChecked : defaultChecked) ? "100%" : 0,
              opacity: (isControlled ? controlledChecked : defaultChecked) ? 1 : 0,
            }}
            animate={{
              width: checked ? "100%" : 0,
              opacity: checked ? 1 : 0,
            }}
            transition={springTransition}
          />
        </div>
      ) : null}
    </div>
  );

  return box;
}
