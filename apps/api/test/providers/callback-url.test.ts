import { afterEach, describe, expect, it } from "vitest";

import { getProviderCallbackBaseUrl } from "../../src/providers/callback-url";

const original = {
  NODE_ENV: process.env.NODE_ENV,
  DEV_TUNNEL_URL: process.env.DEV_TUNNEL_URL,
  BACKEND_URL: process.env.BACKEND_URL,
};

afterEach(() => {
  process.env.NODE_ENV = original.NODE_ENV;
  process.env.DEV_TUNNEL_URL = original.DEV_TUNNEL_URL;
  process.env.BACKEND_URL = original.BACKEND_URL;
});

describe("getProviderCallbackBaseUrl", () => {
  it("uses the Cloudflare tunnel in development", () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_TUNNEL_URL = "https://local-dev.guilders.app";
    process.env.BACKEND_URL = "http://localhost:3000";
    expect(getProviderCallbackBaseUrl()).toBe("https://local-dev.guilders.app");
  });

  it("uses BACKEND_URL in production", () => {
    process.env.NODE_ENV = "production";
    process.env.DEV_TUNNEL_URL = "https://local-dev.guilders.app";
    process.env.BACKEND_URL = "https://guilders.app";
    expect(getProviderCallbackBaseUrl()).toBe("https://guilders.app");
  });
});
