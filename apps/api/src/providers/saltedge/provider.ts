import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import type { InsertTransaction } from "../../db/schema/transactions";
import type {
  AccountParams,
  ConnectionParams,
  ConnectResult,
  DeregisterUserResult,
  IProvider,
  ProviderAccount,
  ProviderInstitution,
  ProviderName,
  RefreshConnectionResult,
  RegisterUserResult,
  TransactionParams,
} from "../types";
import * as client from "./client";
import type { SaltEdgeAccount } from "./types";

function getSaltEdgeConfig() {
  const appId = process.env.SALTEDGE_APP_ID;
  const secret = process.env.SALTEDGE_SECRET;
  if (!appId || !secret) {
    throw new Error("Missing SALTEDGE_APP_ID or SALTEDGE_SECRET env vars");
  }
  return { appId, secret };
}

function mapNatureToSubtype(
  nature: string,
): (typeof AccountSubtypeEnum)[keyof typeof AccountSubtypeEnum] {
  const mapping: Record<string, string> = {
    account: AccountSubtypeEnum.depository,
    checking: AccountSubtypeEnum.depository,
    savings: AccountSubtypeEnum.depository,
    card: AccountSubtypeEnum.depository,
    credit_card: AccountSubtypeEnum.creditcard,
    credit: AccountSubtypeEnum.creditcard,
    debit_card: AccountSubtypeEnum.depository,
    loan: AccountSubtypeEnum.loan,
    mortgage: AccountSubtypeEnum.loan,
    investment: AccountSubtypeEnum.brokerage,
    ewallet: AccountSubtypeEnum.depository,
    insurance: AccountSubtypeEnum.depository,
    bonus: AccountSubtypeEnum.depository,
  };
  return (mapping[nature] ??
    AccountSubtypeEnum.depository) as (typeof AccountSubtypeEnum)[keyof typeof AccountSubtypeEnum];
}

function mapNatureToType(nature: string): (typeof AccountTypeEnum)[keyof typeof AccountTypeEnum] {
  const liabilityNatures = new Set(["credit_card", "credit", "loan", "mortgage"]);
  return liabilityNatures.has(nature) ? AccountTypeEnum.liability : AccountTypeEnum.asset;
}

function mapSaltEdgeAccount(
  account: SaltEdgeAccount,
  userId: string,
  institutionConnectionId: number,
): ProviderAccount {
  return {
    user_id: userId,
    name: account.name,
    type: mapNatureToType(account.nature),
    subtype: mapNatureToSubtype(account.nature),
    value: String(account.balance),
    currency: account.currency_code,
    institution_connection_id: institutionConnectionId,
    provider_account_id: account.id,
  };
}

export class SaltEdgeProvider implements IProvider {
  readonly name: ProviderName = "SaltEdge";
  readonly enabled = true;

  async getInstitutions(): Promise<ProviderInstitution[]> {
    const config = getSaltEdgeConfig();
    const providers = await client.listAllProviders(config);

    return providers.map((p) => ({
      name: p.name,
      logo_url: p.logo_url,
      provider_institution_id: p.code,
      enabled: p.status === "active",
      country: p.country_code,
    }));
  }

  async registerUser(userId: string): Promise<RegisterUserResult> {
    const config = getSaltEdgeConfig();
    try {
      const customer = await client.createCustomer(config, userId);
      return {
        success: true,
        data: {
          userId: customer.customer_id,
          userSecret: customer.customer_id,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("DuplicatedCustomer")) {
        return {
          success: true,
          data: { userId, userSecret: userId },
        };
      }
      return { success: false, error: message };
    }
  }

  async deregisterUser(customerId: string): Promise<DeregisterUserResult> {
    const config = getSaltEdgeConfig();
    try {
      await client.removeCustomer(config, customerId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async connect(params: ConnectionParams): Promise<ConnectResult> {
    const config = getSaltEdgeConfig();
    try {
      const { db } = await import("../../lib/db");

      const providerRecord = await db.query.provider.findFirst({
        where: { name: "SaltEdge" },
      });
      if (!providerRecord) throw new Error("SaltEdge provider not found in DB");

      const providerConn = await db.query.providerConnection.findFirst({
        where: {
          user_id: params.userId,
          provider_id: providerRecord.id,
        },
      });
      if (!providerConn) throw new Error("No SaltEdge provider connection for user");

      const inst = await db.query.institution.findFirst({
        where: { id: params.institutionId },
      });
      if (!inst) throw new Error("Institution not found");

      if (!providerConn.secret) throw new Error("Provider connection missing SaltEdge customer ID");

      const result = await client.createConnection(config, {
        customer_id: providerConn.secret,
        provider_code: inst.provider_institution_id,
        consent_scopes: ["accounts", "transactions"],
      });

      return {
        success: true,
        data: {
          redirectURI: result.connect_url,
          type: "redirect",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async reconnect(params: ConnectionParams): Promise<ConnectResult> {
    const config = getSaltEdgeConfig();
    try {
      if (!params.connectionId) throw new Error("connectionId required for reconnect");

      const result = await client.reconnectConnection(config, params.connectionId, {
        consent_scopes: ["accounts", "transactions"],
      });

      return {
        success: true,
        data: {
          redirectURI: result.connect_url,
          type: "redirect",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async refreshConnection(connectionId: string): Promise<RefreshConnectionResult> {
    const config = getSaltEdgeConfig();
    try {
      await client.refreshConnection(config, connectionId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getAccounts(params: AccountParams): Promise<ProviderAccount[]> {
    const config = getSaltEdgeConfig();
    const { db } = await import("../../lib/db");

    const instConn = await db.query.institutionConnection.findFirst({
      where: { id: params.connectionId },
    });
    if (!instConn?.connection_id) throw new Error("Connection not found");

    const accounts = await client.listAllAccounts(config, instConn.connection_id);

    return accounts.map((a) => mapSaltEdgeAccount(a, params.userId, params.connectionId));
  }

  async getTransactions(params: TransactionParams): Promise<InsertTransaction[]> {
    const config = getSaltEdgeConfig();
    const { db } = await import("../../lib/db");

    const accountRecord = await db.query.account.findFirst({
      where: { provider_account_id: params.accountId },
      with: { institutionConnection: true },
    });
    if (!accountRecord?.institutionConnection?.connection_id) {
      throw new Error("Account or connection not found");
    }

    const transactions = await client.listAllTransactions(
      config,
      accountRecord.institutionConnection.connection_id,
      params.accountId,
    );

    return transactions
      .filter((t) => !t.duplicated)
      .map((t) => ({
        account_id: accountRecord.id,
        amount: String(t.amount),
        currency: t.currency_code,
        date: t.made_on,
        description: t.description,
        category: t.category || "uncategorized",
        provider_transaction_id: t.id,
      }));
  }
}
