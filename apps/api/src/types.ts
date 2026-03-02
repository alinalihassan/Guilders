export type { App } from "./app";
import type { Document as DbDocument } from "./db/schema/documents";
export type { Account, CreateAccount, UpdateAccount } from "./routes/account/types";
export type { Category, Categories, CategoryInsert } from "./routes/category/types";
export type { ConnectionResponse } from "./routes/connections/types";
export type { Country, Countries } from "./routes/country/types";
export type { Currency, Currencies } from "./routes/currency/types";
export type {
  InstitutionConnection,
  InstitutionConnections,
} from "./routes/institution-connection/types";
export type { Institution, Institutions } from "./routes/institution/types";
export type { ProviderConnection, ProviderConnections } from "./routes/provider-connection/types";
export type { Provider, Providers } from "./routes/provider/types";
export type { Rate, Rates } from "./routes/rate/types";
export type { Transaction, TransactionInsert } from "./routes/transaction/types";
export type AccountSubtype = import("./routes/account/types").Account["subtype"];

export type User = {
  email: string;
  currency: string;
  subscription: {
    status: string | null;
    current_period_end: string | null;
    trial_end: string | null;
  };
  [key: string]: unknown;
};

export type UpdateUser = {
  currency?: string;
  subscription?: Partial<User["subscription"]>;
  email?: string;
  password?: string;
  [key: string]: unknown;
};

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type CheckoutResponse = { url: string };
export type PortalResponse = { url: string };

export type CreateDocumentResponse = DbDocument;
export type DocumentEntityType = `${DbDocument["entity_type"]}`;

export type BalanceSnapshot = {
  date: string;
  balance: string;
  currency: string;
};

export type NetWorthSnapshot = {
  date: string;
  balance: string;
};
