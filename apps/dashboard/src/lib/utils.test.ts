import { describe, expect, it } from "vitest";

import { formatTime } from "./format-time";
import { formatBytes, isPro } from "./utils";
import { convertToUserCurrency } from "./utils/financial";

describe("formatBytes", () => {
  it("formats zero and larger sizes", () => {
    expect(formatBytes(0)).toBe("0 Byte");
    expect(formatBytes(1024)).toBe("1 KB");
  });
});

describe("formatTime", () => {
  it("formats 24h and 12h clocks", () => {
    const date = new Date("2026-09-13T15:04:00.000Z");
    expect(formatTime(date, "24")).toMatch(/\d{2}:\d{2}/);
    expect(formatTime(date, "12")).toMatch(/AM|PM/);
  });
});

describe("convertToUserCurrency", () => {
  it("returns the same value when currencies match", () => {
    expect(convertToUserCurrency(10, "EUR", [], "EUR")).toBe(10);
  });

  it("converts using rates", () => {
    const rates = [
      { currency_code: "USD", rate: "1", date: "2026-01-01" },
      { currency_code: "EUR", rate: "0.5", date: "2026-01-01" },
    ] as const;
    expect(convertToUserCurrency(10, "USD", [...rates], "EUR")).toBe(5);
  });
});

describe("isPro", () => {
  it("treats everyone as pro when billing is off", () => {
    expect(isPro(undefined, false)).toBe(true);
  });

  it("requires an active or trialing subscription when billing is on", () => {
    expect(isPro(undefined, true)).toBe(false);
    expect(isPro({ subscription: { status: "active" } } as never, true)).toBe(true);
  });
});
