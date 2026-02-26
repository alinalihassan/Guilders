import { Elysia } from "elysia";

const getDashboardOrigin = () => process.env.DASHBOARD_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3002";

const buildDashboardUrl = (path: "/oauth/sign-in" | "/oauth/consent", query: string) => {
  const base = `${getDashboardOrigin().replace(/\/$/, "")}${path}`;
  return query ? `${base}?${query}` : base;
};

export const oauthPagesRoutes = new Elysia({ detail: { hide: true } })
  .get("/oauth/sign-in", async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.toString();
    return Response.redirect(buildDashboardUrl("/oauth/sign-in", query), 302);
  })
  .get("/oauth/consent", async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.toString();
    return Response.redirect(buildDashboardUrl("/oauth/consent", query), 302);
  });
