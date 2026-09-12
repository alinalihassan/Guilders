import { Hono } from "hono";
import { describeRoute } from "hono-openapi";

import { createAuth } from "../lib/auth";
import { apiKeyRateLimit } from "../middleware/rate-limit";
import { accountRoutes } from "./account";
import { balanceHistoryRoutes } from "./balance-history";
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

export const api = new Hono()
  .use(apiKeyRateLimit)
  .all("/auth/*", describeRoute({ hide: true }), (c) => createAuth().handler(c.req.raw))
  .route("/account", accountRoutes)
  .route("/billing", billingRoutes)
  .route("/balance-history", balanceHistoryRoutes)
  .route("/category", categoryRoutes)
  .route("/chat", chatRoutes)
  .route("/connections", connectionsRoutes)
  .route("/conversation", conversationRoutes)
  .route("/country", countryRoutes)
  .route("/currency", currencyRoutes)
  .route("/document", documentRoutes)
  .route("/export", exportRoutes)
  .route("/merchant", merchantRoutes)
  .route("/rate", rateRoutes)
  .route("/provider", providerRoutes)
  .route("/institution", institutionRoutes)
  .route("/provider-connection", providerConnectionRoutes)
  .route("/institution-connection", institutionConnectionRoutes)
  .route("/transaction", transactionRoutes)
  .route("/webhook", webhookRoutes);
