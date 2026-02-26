import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { createAuth } from "./auth";

const oauthResourcePlugin = oauthProviderResourceClient(createAuth());
export const oauthResourceClient = oauthResourcePlugin.getActions();
