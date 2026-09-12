import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { Hono } from "hono";

import { createAuth } from "../../lib/auth";

const metadataHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const withCors = (response: Response) => {
  for (const [key, value] of Object.entries(metadataHeaders)) {
    response.headers.set(key, value);
  }
  return response;
};

const handleAuth = async (request: Request) => withCors(await createAuth().handler(request));

export const oauthWellKnownRoutes = new Hono()
  .get("/.well-known/oauth-authorization-server", async (c) => {
    return withCors(await oauthProviderAuthServerMetadata(createAuth())(c.req.raw));
  })
  .get("/.well-known/oauth-authorization-server/api/auth", async (c) => {
    return withCors(await oauthProviderAuthServerMetadata(createAuth())(c.req.raw));
  })
  .get("/.well-known/openid-configuration", async (c) => {
    return withCors(await oauthProviderOpenIdConfigMetadata(createAuth())(c.req.raw));
  })
  .get("/api/auth/.well-known/openid-configuration", async (c) => {
    return withCors(await oauthProviderOpenIdConfigMetadata(createAuth())(c.req.raw));
  })
  .get("/.well-known/oauth-protected-resource", (c) => handleAuth(c.req.raw))
  .get("/.well-known/oauth-protected-resource/mcp", (c) => handleAuth(c.req.raw));
