import { useTheme } from "next-themes";
import { useCallback } from "react";

const TRANSITION_CSS = `
::view-transition-group(root) {
  animation-duration: 0.7s;
  animation-timing-function: var(--expo-out);
}
::view-transition-new(root) {
  animation-name: reveal-bottom-up;
  filter: blur(2px);
}
::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: none;
  z-index: -1;
}
.dark::view-transition-new(root) {
  animation-name: reveal-bottom-up;
  filter: blur(2px);
}
@keyframes reveal-bottom-up {
  from {
    clip-path: polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%);
    filter: blur(8px);
  }
  50% { filter: blur(4px); }
  to {
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
    filter: blur(0px);
  }
}`;

const STYLE_ID = "theme-transition-styles";

function injectTransitionCSS() {
  if (typeof window === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = TRANSITION_CSS;
}

/**
 * Wraps next-themes' setTheme with View Transition API support.
 * Falls back to an instant switch in browsers without view transitions.
 */
export function useThemeTransition() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const resolveTheme = useCallback(
    (value: string) => {
      if (value !== "system") return value;
      if (typeof window === "undefined") return resolvedTheme;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    },
    [resolvedTheme],
  );

  const setThemeWithTransition = useCallback(
    (newTheme: string) => {
      if (resolveTheme(newTheme) === resolvedTheme) {
        setTheme(newTheme);
        return;
      }

      injectTransitionCSS();

      const apply = () => setTheme(newTheme);

      if (!document.startViewTransition) {
        apply();
        return;
      }

      document.startViewTransition(apply);
    },
    [setTheme, resolvedTheme, resolveTheme],
  );

  const toggleTheme = useCallback(() => {
    setThemeWithTransition(resolvedTheme === "light" ? "dark" : "light");
  }, [resolvedTheme, setThemeWithTransition]);

  return { theme, resolvedTheme, setTheme: setThemeWithTransition, toggleTheme };
}
