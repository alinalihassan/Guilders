import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { app } from "../../src/app";
import { getAuth } from "../../src/lib/auth";
import { handleMcp } from "../../src/mcp/handler";
import { createTestUserWithAccount, resetTestDb, TEST_ORIGIN, uniqueTestEmail } from "../helpers";

const MCP_PROTOCOL_VERSION = "2026-07-28";

const mcpMeta = {
  [PROTOCOL_VERSION_META_KEY]: MCP_PROTOCOL_VERSION,
  [CLIENT_CAPABILITIES_META_KEY]: {},
  [CLIENT_INFO_META_KEY]: { name: "test-client", version: "1.0.0" },
};

async function parseMcpResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text.startsWith("event:") || text.includes("\ndata:")) {
    const dataLine = text.split(/\r?\n/).find((line) => line.startsWith("data:"));
    if (!dataLine) {
      throw new Error(`SSE response missing data field: ${text.slice(0, 200)}`);
    }
    return JSON.parse(dataLine.slice("data:".length).trim());
  }
  return JSON.parse(text);
}

function mcpRequest(body: object, headers?: Record<string, string>): Request {
  const method = typeof body === "object" && body && "method" in body ? String(body.method) : "";
  return new Request(`${TEST_ORIGIN}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
      ...(method ? { "Mcp-Method": method } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function interceptBackendFetch(): () => void {
  const originalFetch = globalThis.fetch;
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith(TEST_ORIGIN)) {
        const request = input instanceof Request ? input : new Request(url, init);
        return app.fetch(request) as Promise<Response>;
      }
      return originalFetch(input, init) as Promise<Response>;
    });
  return () => spy.mockRestore();
}

async function signMcpAccessToken(userId: string, scope = "read write"): Promise<string> {
  const signed = await getAuth().api.signJWT({
    body: {
      payload: {
        sub: userId,
        aud: `${TEST_ORIGIN}/mcp`,
        iss: `${TEST_ORIGIN}/api/auth`,
        scope,
      },
    },
  });
  return signed.token;
}

describe("MCP endpoint", () => {
  let userId: string;

  beforeAll(async () => {
    interceptBackendFetch();
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
    interceptBackendFetch();
  });

  describe("unauthenticated", () => {
    it("POST /mcp without auth returns 401 with WWW-Authenticate", async () => {
      const req = mcpRequest({
        jsonrpc: "2.0",
        method: "server/discover",
        params: { _meta: mcpMeta },
        id: 1,
      });

      const res = await handleMcp(req);
      expect(res.status).toBe(401);

      const wwwAuth = res.headers.get("WWW-Authenticate");
      expect(wwwAuth).toContain("Bearer");
      expect(wwwAuth).toContain("oauth-protected-resource");
    });

    it("POST /mcp with invalid token returns 401", async () => {
      const req = mcpRequest(
        {
          jsonrpc: "2.0",
          method: "server/discover",
          params: { _meta: mcpMeta },
          id: 1,
        },
        { Authorization: "Bearer invalid-token" },
      );

      const res = await handleMcp(req);
      expect(res.status).toBe(401);
    });
  });

  describe("authenticated", () => {
    it("POST /mcp server/discover succeeds with valid token", async () => {
      const token = await signMcpAccessToken(userId);
      const req = mcpRequest(
        {
          jsonrpc: "2.0",
          method: "server/discover",
          params: { _meta: mcpMeta },
          id: 1,
        },
        { Authorization: `Bearer ${token}` },
      );

      const res = await handleMcp(req);
      expect(res.status).toBe(200);

      const body = (await parseMcpResponse(res)) as {
        jsonrpc: string;
        result: {
          supportedVersions: string[];
          _meta?: { "io.modelcontextprotocol/serverInfo"?: { name: string } };
        };
        id: number;
      };
      expect(body.jsonrpc).toBe("2.0");
      expect(body.result.supportedVersions).toContain(MCP_PROTOCOL_VERSION);
      expect(body.result._meta?.["io.modelcontextprotocol/serverInfo"]?.name).toBe(
        "guilders-mcp-server",
      );
      expect(body.id).toBe(1);
    });

    it("POST /mcp tools/list returns available tools", async () => {
      const token = await signMcpAccessToken(userId);

      const listReq = mcpRequest(
        {
          jsonrpc: "2.0",
          method: "tools/list",
          params: { _meta: mcpMeta },
          id: 2,
        },
        { Authorization: `Bearer ${token}` },
      );

      const res = await handleMcp(listReq);
      expect(res.status).toBe(200);

      const body = (await parseMcpResponse(res)) as {
        result: { tools: { name: string }[] };
      };
      expect(body.result.tools.length).toBeGreaterThan(0);

      const toolNames = body.result.tools.map((t) => t.name);
      expect(toolNames).toContain("get_accounts");
      expect(toolNames).toContain("get_transactions");
    });
  });
});
