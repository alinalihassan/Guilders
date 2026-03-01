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
import { EnableBankingClient } from "./client";
import type { CashAccountType } from "./types";

function getConfig() {
  const clientId = process.env.ENABLEBANKING_CLIENT_ID;
  const privateKey = process.env.ENABLEBANKING_CLIENT_PRIVATE_KEY;
  if (!clientId || !privateKey) {
    throw new Error("Missing ENABLEBANKING_CLIENT_ID or ENABLEBANKING_CLIENT_PRIVATE_KEY env vars");
  }
  return { clientId, privateKey };
}

function mapCashAccountType(type: CashAccountType): {
  type: (typeof AccountTypeEnum)[keyof typeof AccountTypeEnum];
  subtype: (typeof AccountSubtypeEnum)[keyof typeof AccountSubtypeEnum];
} {
  switch (type) {
    case "LOAN":
      return { type: AccountTypeEnum.liability, subtype: AccountSubtypeEnum.loan };
    case "CARD":
      return { type: AccountTypeEnum.liability, subtype: AccountSubtypeEnum.creditcard };
    case "SVGS":
      return { type: AccountTypeEnum.asset, subtype: AccountSubtypeEnum.depository };
    default:
      return { type: AccountTypeEnum.asset, subtype: AccountSubtypeEnum.depository };
  }
}

/**
 * The provider_institution_id encodes ASPSP name, country, and max consent validity
 * so we can reconstruct authorization params from just the institution record.
 */
function encodeInstitutionId(name: string, country: string, maxConsent: number): string {
  return encodeURIComponent(JSON.stringify({ name, country, maxConsent }));
}

function decodeInstitutionId(id: string): {
  name: string;
  country: string;
  maxConsentValidity: string;
} | null {
  let parsed: { name: string; country: string; maxConsent: number };
  try {
    parsed = JSON.parse(decodeURIComponent(id)) as {
      name: string;
      country: string;
      maxConsent: number;
    };
  } catch {
    return null;
  }
  const maxConsentSeconds = Number.parseInt(String(parsed.maxConsent), 10);
  if (Number.isNaN(maxConsentSeconds)) return null;

  const validUntil = new Date(Date.now() + maxConsentSeconds * 1000)
    .toISOString()
    .replace("Z", "+00:00");

  return { name: parsed.name, country: parsed.country, maxConsentValidity: validUntil };
}

export class EnableBankingProvider implements IProvider {
  readonly name: ProviderName = "EnableBanking";
  readonly enabled = true;

  private createClient(): EnableBankingClient {
    const { clientId, privateKey } = getConfig();
    return new EnableBankingClient(clientId, privateKey);
  }

  async getInstitutions(): Promise<ProviderInstitution[]> {
    const client = this.createClient();
    const aspsps = await client.getASPSPs();

    return aspsps.map((aspsp) => ({
      name: aspsp.name,
      logo_url: aspsp.logo,
      provider_institution_id: encodeInstitutionId(
        aspsp.name,
        aspsp.country,
        aspsp.maximum_consent_validity,
      ),
      enabled: !aspsp.beta,
      country: aspsp.country,
    }));
  }

  async registerUser(_userId: string): Promise<RegisterUserResult> {
    return { success: true, data: { userId: _userId, userSecret: _userId } };
  }

  async deregisterUser(userId: string): Promise<DeregisterUserResult> {
    const client = this.createClient();
    const db = createDb();

    const providerRecord = await db.query.provider.findFirst({
      where: { name: this.name },
    });
    if (!providerRecord) return { success: false, error: "Provider not found" };

    const providerConn = await db.query.providerConnection.findFirst({
      where: { user_id: userId, provider_id: providerRecord.id },
    });
    if (!providerConn) return { success: true };

    const institutionConnections = await db.query.institutionConnection.findMany({
      where: { provider_connection_id: providerConn.id },
    });

    for (const conn of institutionConnections) {
      if (conn.connection_id) {
        try {
          await client.deleteSession(conn.connection_id);
        } catch (error) {
          console.error("[EnableBanking] Failed to delete session:", conn.connection_id, error);
        }
      }
    }

    return { success: true };
  }

  async connect(params: ConnectionParams): Promise<ConnectResult> {
    const client = this.createClient();
    const db = createDb();

    try {
      const inst = await db.query.institution.findFirst({
        where: { id: params.institutionId },
      });
      if (!inst) return { success: false, error: "Institution not found" };

      const decoded = decodeInstitutionId(inst.provider_institution_id);
      if (!decoded) return { success: false, error: "Invalid institution ID format" };

      const backendUrl = process.env.NGROK_URL || process.env.BACKEND_URL;
      if (!backendUrl) return { success: false, error: "BACKEND_URL not configured" };

      const state = JSON.stringify({
        userId: params.userId,
        institutionId: params.institutionId,
      });

      const authorization = await client.createAuthorization({
        validUntil: decoded.maxConsentValidity,
        aspspName: decoded.name,
        aspspCountry: decoded.country,
        redirectUrl: `${backendUrl}/callback/providers/enablebanking`,
        state,
        userId: params.userId,
      });

      return {
        success: true,
        data: { redirectURI: authorization.url, type: "redirect" },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async reconnect(params: ConnectionParams): Promise<ConnectResult> {
    return this.connect(params);
  }

  async refreshConnection(_connectionId: string): Promise<RefreshConnectionResult> {
    return { success: true };
  }

  async getAccounts(params: AccountParams): Promise<ProviderAccount[]> {
    const client = this.createClient();
    const db = createDb();

    const instConn = await db.query.institutionConnection.findFirst({
      where: { id: params.connectionId },
    });
    if (!instConn?.connection_id) throw new Error("Connection not found");

    const session = await client.getSession(instConn.connection_id);
    if (!session?.accounts?.length) throw new Error("No accounts in session");

    const institution = await db.query.institution.findFirst({
      where: { id: instConn.institution_id },
    });

    const accounts: ProviderAccount[] = [];
    for (const accountUid of session.accounts) {
      const details = await client.getAccountDetails(accountUid);
      const balances = await client.getAccountBalances(accountUid);
      const balance = balances[0];
      if (!balance) continue;

      const mapped = mapCashAccountType(details.cash_account_type);

      accounts.push({
        user_id: params.userId,
        name: details.details ?? details.name ?? "Bank Account",
        type: mapped.type,
        subtype: mapped.subtype,
        value: balance.balance_amount.amount,
        currency: details.currency,
        institution_connection_id: params.connectionId,
        provider_account_id: accountUid,
        image: institution?.logo_url ?? null,
      });
    }

    return accounts;
  }

  async getTransactions(params: TransactionParams): Promise<InsertTransaction[]> {
    const client = this.createClient();
    const db = createDb();

    const accountRecord = await db.query.account.findFirst({
      where: { provider_account_id: params.accountId },
    });
    if (!accountRecord) throw new Error("Account not found");

    const transactions = await client.getAccountTransactions({
      accountId: params.accountId,
      fetchAll: true,
    });

    return transactions.map((t) => ({
      account_id: accountRecord.id,
      amount: String(
        Number(t.transaction_amount.amount) * (t.credit_debit_indicator === "DBIT" ? -1 : 1),
      ),
      currency: t.transaction_amount.currency,
      date: t.booking_date ?? t.value_date ?? t.transaction_date ?? new Date().toISOString(),
      description: t.remittance_information?.join(", ") ?? "",
      provider_transaction_id: t.transaction_id ?? t.entry_reference ?? null,
    }));
  }
}
