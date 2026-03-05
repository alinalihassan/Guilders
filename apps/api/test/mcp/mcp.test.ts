import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { handleMcp } from "../../src/mcp/handler";
import { createTestUserWithAccount, resetTestDb, TEST_ORIGIN, uniqueTestEmail } from "../helpers";

const TEST_ENV = {} as Env;
const TEST_CTX = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

function mcpRequest(body: object, headers?: Record<string, string>): Request {
  return new Request(`${TEST_ORIGIN}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function interceptUserInfo(response: Response): () => void {
  const originalFetch = globalThis.fetch;
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/auth/oauth2/userinfo")) {
        return Promise.resolve(response.clone());
      }
      return originalFetch(input, init);
    });
  return () => spy.mockRestore();
}

describe("MCP endpoint", () => {
  let userId: string;

  beforeAll(async () => {
    const result = await createTestUserWithAccount({
      email: uniqueTestEmail("mcp"),
      account: { name: "MCP Test Account", value: "2500" },
    });
    userId = result.userId;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("unauthenticated", () => {
    it("POST /mcp without auth returns 401 with WWW-Authenticate", async () => {
      const req = mcpRequest({
        jsonrpc: "2.0",
        method: "initialize",
        params: { capabilities: {} },
        id: 1,
      });

      const res = await handleMcp(req, TEST_ENV, TEST_CTX);
      expect(res.status).toBe(401);

      const wwwAuth = res.headers.get("WWW-Authenticate");
      expect(wwwAuth).toContain("Bearer");
      expect(wwwAuth).toContain("oauth-protected-resource");

      const body = (await res.json()) as {
        jsonrpc: string;
        error: { code: number };
      };
      expect(body.jsonrpc).toBe("2.0");
      expect(body.error.code).toBe(-32001);
    });

    it("POST /mcp with invalid token returns 401", async () => {
      interceptUserInfo(new Response("Unauthorized", { status: 401 }));

      const req = mcpRequest(
        {
          jsonrpc: "2.0",
          method: "initialize",
          params: { capabilities: {} },
          id: 1,
        },
        { Authorization: "Bearer invalid-token" },
      );

      const res = await handleMcp(req, TEST_ENV, TEST_CTX);
      expect(res.status).toBe(401);
    });
  });

  describe("authenticated", () => {
    it("POST /mcp initialize succeeds with valid token", async () => {
      interceptUserInfo(Response.json({ sub: userId }));

      const req = mcpRequest(
        {
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
          id: 1,
        },
        { Authorization: "Bearer valid-test-token" },
      );

      const res = await handleMcp(req, TEST_ENV, TEST_CTX);
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        jsonrpc: string;
        result: { serverInfo: { name: string }; capabilities: object };
        id: number;
      };
      expect(body.jsonrpc).toBe("2.0");
      expect(body.result.serverInfo.name).toBe("guilders-mcp-server");
      expect(body.id).toBe(1);
    });

    it("POST /mcp tools/list returns available tools", async () => {
      interceptUserInfo(Response.json({ sub: userId }));

      const initReq = mcpRequest(
        {
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
          id: 1,
        },
        { Authorization: "Bearer valid-test-token" },
      );
      await handleMcp(initReq, TEST_ENV, TEST_CTX);

      vi.restoreAllMocks();
      interceptUserInfo(Response.json({ sub: userId }));

      const listReq = mcpRequest(
        { jsonrpc: "2.0", method: "tools/list", params: {}, id: 2 },
        { Authorization: "Bearer valid-test-token" },
      );

      const res = await handleMcp(listReq, TEST_ENV, TEST_CTX);
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        result: { tools: { name: string }[] };
      };
      expect(body.result.tools.length).toBeGreaterThan(0);

      const toolNames = body.result.tools.map((t) => t.name);
      expect(toolNames).toContain("get_accounts");
      expect(toolNames).toContain("get_transactions");
    });
  });
});
