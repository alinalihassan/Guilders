import { describe, expect, it } from "vitest";

import { selfFetch } from "../helpers";

describe("OAuth pages routes", () => {
  it("GET /oauth/sign-in redirects to dashboard", async () => {
    const res = await selfFetch("/oauth/sign-in?client_id=test", {
      redirect: "manual",
    });
    expect([301, 302, 307, 308]).toContain(res.status);

    const location = res.headers.get("location") ?? "";
    expect(location).toContain("localhost:3002");
    expect(location).toContain("sign-in");
  });

  it("GET /oauth/consent redirects to dashboard", async () => {
    const res = await selfFetch("/oauth/consent?client_id=test", {
      redirect: "manual",
    });
    expect([301, 302, 307, 308]).toContain(res.status);

    const location = res.headers.get("location") ?? "";
    expect(location).toContain("localhost:3002");
    expect(location).toContain("consent");
  });
});
