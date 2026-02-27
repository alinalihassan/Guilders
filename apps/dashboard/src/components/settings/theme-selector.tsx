"use client";

import { Check, Minus } from "lucide-react";
import Image from "next/image";

import UiDark from "@/../public/assets/ui-dark.png";
import UiLight from "@/../public/assets/ui-light.png";
import UiSystem from "@/../public/assets/ui-system.png";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useThemeTransition } from "@/hooks/useThemeTransition";

const items = [
  { id: "theme-light", value: "light", label: "Light", image: UiLight },
  { id: "theme-dark", value: "dark", label: "Dark", image: UiDark },
  { id: "theme-system", value: "system", label: "System", image: UiSystem },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useThemeTransition();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium leading-none text-foreground">Theme Preference</legend>
      <RadioGroup className="flex gap-3" value={theme} onValueChange={(value) => setTheme(value)}>
        {items.map((item) => (
          <label key={item.id} htmlFor={item.id}>
            <RadioGroupItem
              id={item.id}
              value={item.value}
              className="peer sr-only after:absolute after:inset-0"
            />
            <Image
              src={item.image}
              alt={item.label}
              width={88}
              height={70}
              className="relative cursor-pointer overflow-hidden rounded-lg border border-input shadow-sm shadow-black/5 outline-offset-2 transition-colors peer-[:focus-visible]:outline peer-[:focus-visible]:outline-2 peer-[:focus-visible]:outline-ring/70 peer-data-[disabled]:cursor-not-allowed peer-data-[state=checked]:border-ring peer-data-[state=checked]:bg-accent peer-data-[disabled]:opacity-50"
            />
            <span className="group mt-2 flex items-center gap-1 peer-data-[state=unchecked]:text-muted-foreground/70">
              <Check
                size={16}
                strokeWidth={2}
                className="peer-data-[state=unchecked]:group-[]:hidden"
                aria-hidden="true"
              />
              <Minus
                size={16}
                strokeWidth={2}
                className="peer-data-[state=checked]:group-[]:hidden"
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{item.label}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
