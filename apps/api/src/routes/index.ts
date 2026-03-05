import { Elysia } from "elysia";

import { createAuth } from "../lib/auth";
import { accountRoutes } from "./account";
import { accountBalanceHistoryRoutes, balanceHistoryRoutes } from "./balance-history";
import { categoryRoutes } from "./category";
import { chatRoutes } from "./chat";
import { connectionsRoutes } from "./connections";
import { conversationRoutes } from "./conversation";
import { countryRoutes } from "./country";
import { currencyRoutes } from "./currency";
import { documentRoutes } from "./document";
import { exportRoutes } from "./export";
import { institutionRoutes } from "./institution";
import { institutionConnectionRoutes } from "./institution-connection";
import { providerRoutes } from "./provider";
import { providerConnectionRoutes } from "./provider-connection";
import { rateRoutes } from "./rate";
import { transactionRoutes } from "./transaction";

export const api = new Elysia({ prefix: "/api" })
  .all("/auth/*", (context) => createAuth().handler(context.request), { detail: { hide: true } })
  .use(accountRoutes)
  .use(accountBalanceHistoryRoutes)
  .use(balanceHistoryRoutes)
  .use(categoryRoutes)
  .use(chatRoutes)
  .use(connectionsRoutes)
  .use(conversationRoutes)
  .use(countryRoutes)
  .use(currencyRoutes)
  .use(documentRoutes)
  .use(exportRoutes)
  .use(rateRoutes)
  .use(providerRoutes)
  .use(institutionRoutes)
  .use(providerConnectionRoutes)
  .use(institutionConnectionRoutes)
  .use(transactionRoutes);
