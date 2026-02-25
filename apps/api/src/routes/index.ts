import { Elysia } from "elysia";

import { createAuth } from "../lib/auth";
import { accountRoutes } from "./account";
import { categoryRoutes } from "./category";
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
  .all("/auth/*", (context) => createAuth().handler(context.request), { detail: { hide: true } })
  .use(accountRoutes)
  .use(categoryRoutes)
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
