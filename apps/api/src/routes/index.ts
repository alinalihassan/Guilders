import { Elysia } from "elysia";

import { createAuth } from "../lib/auth";
import { rateLimitPlugin } from "../middleware/rate-limit";
import { accountRoutes } from "./account";
import { accountBalanceHistoryRoutes, balanceHistoryRoutes } from "./balance-history";
import { billingRoutes } from "./billing";
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
import { merchantRoutes } from "./merchant";
import { providerRoutes } from "./provider";
import { providerConnectionRoutes } from "./provider-connection";
import { rateRoutes } from "./rate";
import { transactionRoutes } from "./transaction";
import { webhookRoutes } from "./webhook";

export const api = new Elysia({ prefix: "/api" })
  .use(rateLimitPlugin)
  .all("/auth/*", (context) => createAuth().handler(context.request), { detail: { hide: true } })
  .use(accountRoutes)
  .use(billingRoutes)
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
  .use(merchantRoutes)
  .use(rateRoutes)
  .use(providerRoutes)
  .use(institutionRoutes)
  .use(providerConnectionRoutes)
  .use(institutionConnectionRoutes)
  .use(transactionRoutes)
  .use(webhookRoutes);
