import { Check, Minus } from "lucide-react";
import { useEffect, useState } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useThemeTransition } from "@/hooks/useThemeTransition";

// Public assets are served at root in Vite; do not import from public/
const items = [
  { id: "theme-light", value: "light", label: "Light", image: "/assets/ui-light.png" },
  { id: "theme-dark", value: "dark", label: "Dark", image: "/assets/ui-dark.png" },
  { id: "theme-system", value: "system", label: "System", image: "/assets/ui-system.png" },
] as const;

export function ThemeSelector() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useThemeTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a fixed value until after mount so server and client render the same
  const value = mounted ? theme : "system";

  return (
    <fieldset className="space-y-4">
      <legend className="text-foreground text-sm leading-none font-medium">Theme Preference</legend>
      <RadioGroup
        className="flex gap-3"
        value={value}
        onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}
      >
        {items.map((item) => (
          <label key={item.id} htmlFor={item.id}>
            <RadioGroupItem
              id={item.id}
              value={item.value}
              className="peer sr-only after:absolute after:inset-0"
            />
            <img
              src={item.image}
              alt={item.label}
              width={88}
              height={70}
              className="border-input peer-[:focus-visible]:outline-ring/70 peer-data-[state=checked]:border-ring peer-data-[state=checked]:bg-accent relative cursor-pointer overflow-hidden rounded-lg border shadow-sm shadow-black/5 outline-offset-2 transition-colors peer-data-[disabled]:cursor-not-allowed peer-data-[disabled]:opacity-50 peer-[:focus-visible]:outline peer-[:focus-visible]:outline-2"
            />
            <span className="group peer-data-[state=unchecked]:text-muted-foreground/70 mt-2 flex items-center gap-1">
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
