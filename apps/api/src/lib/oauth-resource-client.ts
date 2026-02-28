import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { createAuth } from "./auth";

let _actions: ReturnType<ReturnType<typeof oauthProviderResourceClient>["getActions"]>;
export function getOauthResourceClient() {
  return (_actions ??= oauthProviderResourceClient(createAuth()).getActions());
}
