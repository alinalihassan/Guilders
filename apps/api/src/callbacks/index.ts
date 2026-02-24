import { handleSnapTradeCallback } from "./snaptrade";

export async function handleCallback(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;

  if (path === "/callback/providers/snaptrade") {
    return handleSnapTradeCallback(request, env);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
