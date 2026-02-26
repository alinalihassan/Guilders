# MCP OAuth Testing and Troubleshooting

This file documents the exact way `/mcp` was tested after migrating to Cloudflare `createMcpHandler`, and how to debug common OAuth symptoms.

## Current MCP auth behavior

- MCP transport connection itself is reachable without auth.
- OAuth is enforced inside protected tools (`get_accounts`, `get_transactions`).
- This means a client can connect, initialize, and list tools, but still fail when calling a protected tool if it does not send `Authorization` on tool requests.

## Quick health checks

Run these first:

```sh
curl -i "http://localhost:3000/.well-known/oauth-authorization-server"
curl -i "http://localhost:3000/.well-known/openid-configuration"
curl -i "http://localhost:3000/.well-known/oauth-protected-resource/mcp"
```

Expected: HTTP `200` for all three.

## Transport-level MCP checks

Initialize (transport-level check):

```sh
curl -sS -X POST "http://localhost:3000/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"initialize",
    "params":{
      "protocolVersion":"2025-06-18",
      "capabilities":{},
      "clientInfo":{"name":"oauth-test","version":"1.0.0"}
    }
  }'
```

List tools (still transport-level, no tool auth executed yet):

```sh
curl -sS -X POST "http://localhost:3000/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Protected tool checks

Without authorization header:

```sh
curl -sS -X POST "http://localhost:3000/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":99,
    "method":"tools/call",
    "params":{"name":"get_accounts","arguments":{"limit":1}}
  }'
```

Expected error:

```json
{"result":{"content":[{"type":"text","text":"missing authorization header"}],"isError":true},"jsonrpc":"2.0","id":99}
```

With authorization header (replace token):

```sh
curl -sS -X POST "http://localhost:3000/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "jsonrpc":"2.0",
    "id":100,
    "method":"tools/call",
    "params":{"name":"get_accounts","arguments":{"limit":1}}
  }'
```

If token is invalid/expired/wrong audience, you will get an auth error from tool execution.

## Why sign-in/consent may not open

If your client already has a valid access token, OAuth UI is skipped by design.

If it never opens even when no token exists, your MCP client may be:

- using a pre-cached token silently,
- using client credentials flow (no user login/consent UI),
- or not implementing interactive OAuth redirect handling.

To force UI during testing:

- clear client token/session storage,
- use a fresh OAuth client ID,
- start from authorization code + PKCE flow (not client credentials),
- or open `/oauth/sign-in` directly in browser to verify page rendering.

## Why opencode can connect but tools fail

This usually means the client sends auth during discovery/connection, but not on all MCP requests.

For this server, the bearer token must be sent on protected tool requests. Ensure the client includes one of:

- `Authorization: Bearer <token>` (preferred)
- `x-forwarded-authorization: Bearer <token>`
- `x-mcp-authorization: Bearer <token>`

on every MCP HTTP request that can execute tools.

## Practical client checklist

- Verify `tools/call` requests in network logs include `Authorization`.
- Verify token audience is exactly `http://localhost:3000/mcp` in local dev.
- Verify issuer matches local auth origin.
- Verify token is not expired.
- If proxying MCP through another service, ensure auth header forwarding is not stripped.

