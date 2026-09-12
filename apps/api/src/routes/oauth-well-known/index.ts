import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { Hono } from "hono";

import { createAuth } from "../../lib/auth";
import { getOauthResourceClient } from "../../lib/oauth-resource-client";

const getAuthHandler = () => oauthProviderAuthServerMetadata(createAuth());
const getOpenIdHandler = () => oauthProviderOpenIdConfigMetadata(createAuth());
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

const getProtectedResourceResponse = async () => {
  const metadata = await getOauthResourceClient().getProtectedResourceMetadata({
    resource: `${process.env.BACKEND_URL}/mcp`,
    authorization_servers: [`${process.env.BACKEND_URL}/api/auth`],
  });

  return new Response(JSON.stringify(metadata), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
};

export const oauthWellKnownRoutes = new Hono()
  .get("/.well-known/oauth-authorization-server", async (c) => {
    return withCors(await getAuthHandler()(c.req.raw));
  })
  .get("/.well-known/oauth-authorization-server/api/auth", async (c) => {
    return withCors(await getAuthHandler()(c.req.raw));
  })
  .get("/.well-known/openid-configuration", async (c) => {
    return withCors(await getOpenIdHandler()(c.req.raw));
  })
  .get("/api/auth/.well-known/openid-configuration", async (c) => {
    return withCors(await getOpenIdHandler()(c.req.raw));
  })
  .get("/.well-known/oauth-protected-resource", getProtectedResourceResponse)
  .get("/.well-known/oauth-protected-resource/mcp", getProtectedResourceResponse);
