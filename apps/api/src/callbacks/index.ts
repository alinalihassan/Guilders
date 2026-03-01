import { handleEnableBankingCallback } from "./enablebanking";
import { handleSnapTradeCallback } from "./snaptrade";
import { handleTellerCallback } from "./teller";

export async function handleCallback(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;

  if (path === "/callback/providers/snaptrade") {
    return handleSnapTradeCallback(request, env);
  }

  if (path === "/callback/providers/enablebanking") {
    return handleEnableBankingCallback(request, env, url);
  }

  if (path === "/callback/providers/teller") {
    return handleTellerCallback(request, env, url);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
