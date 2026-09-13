import { describe, expect, it } from "vitest";

import { withVerifyFullSsl } from "../../src/lib/database-url";

describe("withVerifyFullSsl", () => {
  it("upgrades require/prefer/verify-ca and leaves other URLs alone", () => {
    expect(
      withVerifyFullSsl(
        "postgresql://u:p@db.neon.tech/app?sslmode=require&channel_binding=require",
      ),
    ).toBe("postgresql://u:p@db.neon.tech/app?sslmode=verify-full&channel_binding=require");
    expect(withVerifyFullSsl("postgresql://u:p@db.neon.tech/app?sslmode=prefer")).toBe(
      "postgresql://u:p@db.neon.tech/app?sslmode=verify-full",
    );
    expect(withVerifyFullSsl("postgresql://postgres:postgres@localhost:5433/guilders")).toBe(
      "postgresql://postgres:postgres@localhost:5433/guilders",
    );
    expect(withVerifyFullSsl("postgresql://u:p@db.neon.tech/app?sslmode=verify-full")).toBe(
      "postgresql://u:p@db.neon.tech/app?sslmode=verify-full",
    );
  });
});
