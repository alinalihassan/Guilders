import { Elysia } from "elysia";

import { auth } from "../lib/auth";
import { accountRoutes } from "./account";
import { chatRoutes } from "./chat";
import { connectionsRoutes } from "./connections";
import { countryRoutes } from "./country";
import { currencyRoutes } from "./currency";
import { institutionRoutes } from "./institution";
import { institutionConnectionRoutes } from "./institution-connection";
import { providerRoutes } from "./provider";
import { providerConnectionRoutes } from "./provider-connection";
import { rateRoutes } from "./rate";
import { transactionRoutes } from "./transaction";

export const api = new Elysia({ prefix: "/api" })
  .all("/auth/*", (context) => auth.handler(context.request), { detail: { hide: true } })
  .use(accountRoutes)
  .use(chatRoutes)
  .use(connectionsRoutes)
  .use(countryRoutes)
  .use(currencyRoutes)
  .use(rateRoutes)
  .use(providerRoutes)
  .use(institutionRoutes)
  .use(providerConnectionRoutes)
  .use(institutionConnectionRoutes)
  .use(transactionRoutes);
