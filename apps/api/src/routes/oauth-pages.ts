import { Elysia } from "elysia";
import { eq } from "drizzle-orm";

import { oauthClient } from "../db/schema/auth";
import { createDb } from "../lib/db";

const getDashboardOrigin = () => process.env.DASHBOARD_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3002";

const buildDashboardUrl = (path: "/oauth/sign-in" | "/oauth/consent", query: string) => {
  const base = `${getDashboardOrigin().replace(/\/$/, "")}${path}`;
  return query ? `${base}?${query}` : base;
};

const appendClientDisplayParams = async (searchParams: URLSearchParams) => {
  const clientId = searchParams.get("client_id");
  if (!clientId) return searchParams;

  const enriched = new URLSearchParams(searchParams);
  const db = createDb();
  const [client] = await db
    .select({
      name: oauthClient.name,
      uri: oauthClient.uri,
    })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, clientId))
    .limit(1);

  if (client?.name) {
    enriched.set("client_name", client.name);
  }
  if (client?.uri) {
    enriched.set("client_uri", client.uri);
  }

  return enriched;
};

export const oauthPagesRoutes = new Elysia({ detail: { hide: true } })
  .get("/oauth/sign-in", async ({ request }) => {
    const url = new URL(request.url);
    const searchParams = await appendClientDisplayParams(url.searchParams);
    const query = searchParams.toString();
    return Response.redirect(buildDashboardUrl("/oauth/sign-in", query), 302);
  })
  .get("/oauth/consent", async ({ request }) => {
    const url = new URL(request.url);
    const searchParams = await appendClientDisplayParams(url.searchParams);
    const query = searchParams.toString();
    return Response.redirect(buildDashboardUrl("/oauth/consent", query), 302);
  });
