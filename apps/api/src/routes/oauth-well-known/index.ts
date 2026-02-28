import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { Elysia } from "elysia";

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
  const apiOrigin = process.env.DASHBOARD_URL ?? "http://localhost:3000";
  const metadata = await getOauthResourceClient().getProtectedResourceMetadata({
    resource: `${apiOrigin}/mcp`,
    authorization_servers: [apiOrigin],
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

export const oauthWellKnownRoutes = new Elysia({ detail: { hide: true } })
  .get("/.well-known/oauth-authorization-server", async ({ request }) => {
    return withCors(await getAuthHandler()(request));
  })
  .get("/.well-known/oauth-authorization-server/api/auth", async ({ request }) => {
    return withCors(await getAuthHandler()(request));
  })
  .get("/.well-known/openid-configuration", async ({ request }) => {
    return withCors(await getOpenIdHandler()(request));
  })
  .get("/api/auth/.well-known/openid-configuration", async ({ request }) => {
    return withCors(await getOpenIdHandler()(request));
  })
  .get("/.well-known/oauth-protected-resource", getProtectedResourceResponse)
  .get("/.well-known/oauth-protected-resource/mcp", getProtectedResourceResponse);
