/** Convert an ISO 3166-1 alpha-2 country code to a flag emoji (e.g. NL → 🇳🇱). */
export function countryCodeToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(...[...upper].map((char) => 127397 + char.charCodeAt(0)));
}
