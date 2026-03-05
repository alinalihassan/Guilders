import { describe, expect, it } from "vitest";

import { selfFetch } from "../helpers";

describe("Well-known endpoints", () => {
  it("GET /.well-known/oauth-protected-resource returns 200", async () => {
    const res = await selfFetch("/.well-known/oauth-protected-resource");
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("resource");
    expect(body).toHaveProperty("authorization_servers");
  });

  it("GET /.well-known/oauth-authorization-server returns 200", async () => {
    const res = await selfFetch("/.well-known/oauth-authorization-server");
    expect(res.status).toBe(200);
  });

  it("GET /.well-known/openid-configuration returns 200", async () => {
    const res = await selfFetch("/.well-known/openid-configuration");
    expect(res.status).toBe(200);
  });
});
