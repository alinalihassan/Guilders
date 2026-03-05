import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

import { createAuth } from "./auth";

let _actions: ReturnType<ReturnType<typeof oauthProviderResourceClient>["getActions"]>;
export function getOauthResourceClient() {
  // @ts-ignore TODO: Better Auth 1.5.0 issue, plugin API types not inferred on Auth return type
  return (_actions ??= oauthProviderResourceClient(createAuth()).getActions());
}
