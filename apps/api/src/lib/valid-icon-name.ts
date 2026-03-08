// Icon names are the keys of tags.json (kebab-case). Same set as lucide-react IconName.
import tags from "lucide-static/tags.json";

const validIconNames = new Set<string>(Object.keys(tags as Record<string, unknown>));

/**
 * Returns true if the given string is a valid Lucide icon name (IconName).
 * Use this to validate category icon from API input.
 */
export function isValidIconName(name: string | null | undefined): boolean {
  return !!name && validIconNames.has(name.trim());
}
