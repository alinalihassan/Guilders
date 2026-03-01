import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import type { InsertTransaction } from "../../db/schema/transactions";
import { createDb } from "../../lib/db";
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
import type { TellerAccount } from "./types";

function mapTellerAccountType(account: TellerAccount): {
  type: (typeof AccountTypeEnum)[keyof typeof AccountTypeEnum];
  subtype: (typeof AccountSubtypeEnum)[keyof typeof AccountSubtypeEnum];
} {
  if (account.type === "credit") {
    return { type: AccountTypeEnum.liability, subtype: AccountSubtypeEnum.creditcard };
  }

  switch (account.subtype) {
    case "checking":
    case "savings":
    case "money_market":
    case "certificate_of_deposit":
    case "treasury":
    case "sweep":
      return { type: AccountTypeEnum.asset, subtype: AccountSubtypeEnum.depository };
    default:
      return { type: AccountTypeEnum.asset, subtype: AccountSubtypeEnum.depository };
  }
}

export class TellerProvider implements IProvider {
  readonly name: ProviderName = "Teller";
  readonly enabled = true;

  async getInstitutions(): Promise<ProviderInstitution[]> {
    const institutions = await client.listInstitutions();

    return institutions.map((inst) => ({
      name: inst.name,
      logo_url: `https://teller.io/images/banks/${inst.id}.jpg`,
      provider_institution_id: inst.id,
      enabled: true,
      country: "US",
    }));
  }

  async registerUser(_userId: string): Promise<RegisterUserResult> {
    return { success: true, data: { userId: _userId, userSecret: _userId } };
  }

  async deregisterUser(userId: string): Promise<DeregisterUserResult> {
    const db = createDb();

    const providerRecord = await db.query.provider.findFirst({
      where: { name: this.name },
    });
    if (!providerRecord) return { success: false, error: "Provider not found" };

    const providerConn = await db.query.providerConnection.findFirst({
      where: { user_id: userId, provider_id: providerRecord.id },
    });
    if (!providerConn?.secret) return { success: true };

    try {
      await client.deleteEnrollment(providerConn.secret);
    } catch (error) {
      console.error("[Teller] Failed to delete enrollment:", error);
    }

    return { success: true };
  }

  async connect(params: ConnectionParams): Promise<ConnectResult> {
    const db = createDb();
    const config = client.getTellerConfig();

    try {
      const inst = await db.query.institution.findFirst({
        where: { id: params.institutionId },
      });
      if (!inst) return { success: false, error: "Institution not found" };

      const backendUrl = process.env.NGROK_URL || process.env.BACKEND_URL;
      if (!backendUrl) return { success: false, error: "BACKEND_URL not configured" };

      const state = JSON.stringify({
        userId: params.userId,
        institutionId: params.institutionId,
      });

      // Teller Connect URL: /connect/{appId}?environment=...&institution=...
      // Note: origin + loader_id are added by the frontend (it needs window.origin)
      const connectUrl = new URL(`https://teller.io/connect/${config.applicationId}`);
      connectUrl.searchParams.set("environment", config.environment);
      connectUrl.searchParams.set("institution", inst.provider_institution_id);

      // Embed callback info in fragment (not sent to Teller's server)
      connectUrl.hash = new URLSearchParams({
        callback: `${backendUrl}/callback/providers/teller`,
        state,
      }).toString();

      return {
        success: true,
        data: { redirectURI: connectUrl.toString(), type: "popup" },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async reconnect(params: ConnectionParams): Promise<ConnectResult> {
    const config = client.getTellerConfig();

    try {
      if (!params.connectionId) return { success: false, error: "connectionId required" };

      const backendUrl = process.env.NGROK_URL || process.env.BACKEND_URL;
      if (!backendUrl) return { success: false, error: "BACKEND_URL not configured" };

      const state = JSON.stringify({
        userId: params.userId,
        institutionId: params.institutionId,
      });

      const connectUrl = new URL(`https://teller.io/connect/${config.applicationId}`);
      connectUrl.searchParams.set("environment", config.environment);
      connectUrl.searchParams.set("enrollment_id", params.connectionId);

      connectUrl.hash = new URLSearchParams({
        callback: `${backendUrl}/callback/providers/teller`,
        state,
      }).toString();

      return {
        success: true,
        data: { redirectURI: connectUrl.toString(), type: "popup" },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async refreshConnection(_connectionId: string): Promise<RefreshConnectionResult> {
    return { success: true };
  }

  async getAccounts(params: AccountParams): Promise<ProviderAccount[]> {
    const db = createDb();

    const instConn = await db.query.institutionConnection.findFirst({
      where: { id: params.connectionId },
      with: { providerConnection: true },
    });
    if (!instConn?.providerConnection?.secret)
      throw new Error("Connection or access token not found");

    const accessToken = instConn.providerConnection.secret;
    const tellerAccounts = await client.listAccounts(accessToken);

    const institution = await db.query.institution.findFirst({
      where: { id: instConn.institution_id },
    });

    const accounts: ProviderAccount[] = [];
    for (const ta of tellerAccounts) {
      const mapped = mapTellerAccountType(ta);

      let value = "0";
      if (ta.links.balances) {
        try {
          const balance = await client.getAccountBalances(accessToken, ta.id);
          value = balance.available ?? balance.ledger ?? "0";
        } catch {
          // Balance endpoint may not be available for all accounts
        }
      }

      accounts.push({
        user_id: params.userId,
        name: ta.name,
        type: mapped.type,
        subtype: mapped.subtype,
        value,
        currency: ta.currency,
        institution_connection_id: params.connectionId,
        provider_account_id: ta.id,
        image: institution?.logo_url ?? null,
      });
    }

    return accounts;
  }

  async getTransactions(params: TransactionParams): Promise<InsertTransaction[]> {
    const db = createDb();

    const accountRecord = await db.query.account.findFirst({
      where: { provider_account_id: params.accountId },
      with: { institutionConnection: { with: { providerConnection: true } } },
    });
    if (!accountRecord?.institutionConnection?.providerConnection?.secret) {
      throw new Error("Account or access token not found");
    }

    const accessToken = accountRecord.institutionConnection.providerConnection.secret;
    const transactions = await client.listAllTransactions(accessToken, params.accountId);

    return transactions.map((t) => ({
      account_id: accountRecord.id,
      amount: t.amount,
      currency: accountRecord.currency,
      date: t.date,
      description: t.description,
      provider_transaction_id: t.id,
    }));
  }
}
