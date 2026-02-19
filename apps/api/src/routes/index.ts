import Elysia from "elysia";
import { auth } from "../lib/auth";
// import { assetRoutes } from "./asset";
import { countryRoutes } from "./country";
import { currencyRoutes } from "./currency";
import { institutionRoutes } from "./institution";
import { institutionConnectionRoutes } from "./institution-connection";
import { providerRoutes } from "./provider";
import { providerConnectionRoutes } from "./provider-connection";
import { rateRoutes } from "./rate";
import { transactionRoutes } from "./transaction";

export const api = new Elysia({ prefix: "/api", })
  .all("/auth/*", (context) => auth.handler(context.request))
  .use(countryRoutes)
  .use(currencyRoutes)
  .use(rateRoutes)
  .use(providerRoutes)
  .use(institutionRoutes)
  .use(providerConnectionRoutes)
  .use(institutionConnectionRoutes)
  .use(transactionRoutes);
// .use(assetRoutes);
