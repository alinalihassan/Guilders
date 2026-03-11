import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import type { InsertTransaction } from "../../db/schema/transactions";
import { createDb } from "../../lib/db";
import { signState } from "../state";
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
import { GoCardlessClient } from "./client";

function getConfig(): { secretId: string; secretKey: string } | null {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;
  if (!secretId || !secretKey) return null;
  return { secretId, secretKey };
}

function mapCashAccountType(cashAccountType?: string): {
  type: (typeof AccountTypeEnum)[keyof typeof AccountTypeEnum];
  subtype: (typeof AccountSubtypeEnum)[keyof typeof AccountSubtypeEnum];
} {
  switch (cashAccountType) {
    case "CARD":
      return { type: AccountTypeEnum.liability, subtype: AccountSubtypeEnum.creditcard };
    case "LOAN":
      return { type: AccountTypeEnum.liability, subtype: AccountSubtypeEnum.loan };
    default:
      return { type: AccountTypeEnum.asset, subtype: AccountSubtypeEnum.depository };
  }
}

export class GoCardlessProvider implements IProvider {
  readonly name: ProviderName = "GoCardless";
  readonly enabled: boolean;

  constructor() {
    this.enabled = !!getConfig();
  }

  private createClient(config: { secretId: string; secretKey: string }): GoCardlessClient {
    return new GoCardlessClient(config.secretId, config.secretKey);
  }

  async getInstitutions(): Promise<ProviderInstitution[]> {
    const config = getConfig();
    if (!config) return [];
    const client = this.createClient(config);
    const institutions = await client.getInstitutions();
    return institutions.map((inst) => ({
      name: inst.name,
      logo_url: inst.logo,
      provider_institution_id: inst.id,
      enabled: true,
      country: inst.countries?.[0] ?? null,
    }));
  }

  async registerUser(_userId: string): Promise<RegisterUserResult> {
    return { success: true, data: { userId: _userId, userSecret: _userId } };
  }

  async deregisterUser(
    userId: string,
    options?: { userSecret?: string; connectionIds?: string[] },
  ): Promise<DeregisterUserResult> {
    const config = getConfig();
    if (!config) return { success: false, error: "GoCardless is not configured." };
    const client = this.createClient(config);
    const connectionIds = options?.connectionIds;

    if (connectionIds?.length) {
      for (const requisitionId of connectionIds) {
        try {
          await client.deleteRequisition(requisitionId);
        } catch (error) {
          console.error("[GoCardless] Failed to delete requisition:", requisitionId, error);
        }
      }
      return { success: true };
    }

    const db = createDb();
    const providerRecord = await db.query.provider.findFirst({
      where: { name: this.name },
    });
    if (!providerRecord) return { success: false, error: "Provider not found" };

    const providerConn = await db.query.providerConnection.findFirst({
      where: { user_id: userId, provider_id: providerRecord.id },
      with: { institutionConnections: true },
    });
    if (!providerConn) return { success: true };

    for (const conn of providerConn.institutionConnections) {
      if (conn.connection_id) {
        try {
          await client.deleteRequisition(conn.connection_id);
        } catch (error) {
          console.error("[GoCardless] Failed to delete requisition:", conn.connection_id, error);
        }
      }
    }
    return { success: true };
  }

  async connect(params: ConnectionParams): Promise<ConnectResult> {
    const config = getConfig();
    if (!config) return { success: false, error: "GoCardless is not configured." };
    const client = this.createClient(config);
    const db = createDb();

    try {
      const inst = await db.query.institution.findFirst({
        where: { id: params.institutionId },
      });
      if (!inst) return { success: false, error: "Institution not found" };

      const institutionId = inst.provider_institution_id;
      const backendUrl =
        process.env.NODE_ENV === "development" ? process.env.NGROK_URL : process.env.BACKEND_URL;
      if (!backendUrl) return { success: false, error: "BACKEND_URL not configured" };

      const secret = process.env.GUILDERS_SECRET;
      if (!secret)
        return {
          success: false,
          error: "Provider connections are not configured (GUILDERS_SECRET).",
        };

      const state = await signState(
        { userId: params.userId, institutionId: params.institutionId },
        secret,
      );

      const callbackUrl = `${backendUrl}/callback/providers/gocardless?state=${encodeURIComponent(state)}`;

      let institution: Awaited<ReturnType<GoCardlessClient["getInstitution"]>> | undefined;
      try {
        institution = await client.getInstitution(institutionId);
      } catch {
        // optional for agreement
      }

      const agreement = await client.createAgreement(institutionId, institution);
      const requisition = await client.createRequisition({
        redirect: callbackUrl,
        institution_id: institutionId,
        agreement: agreement.id,
        reference: state,
      });

      return {
        success: true,
        data: { redirectURI: requisition.link, type: "redirect" },
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

  async refreshConnection(connectionId: string): Promise<RefreshConnectionResult> {
    const config = getConfig();
    if (!config) return { success: false, error: "GoCardless is not configured." };
    const client = this.createClient(config);
    const db = createDb();

    try {
      const instConn = await db.query.institutionConnection.findFirst({
        where: { connection_id: connectionId },
        with: { providerConnection: true, institution: true },
      });
      if (!instConn?.providerConnection || !instConn.institution) {
        return { success: false, error: "Connection not found" };
      }

      const institutionId = instConn.institution.provider_institution_id;
      const backendUrl =
        process.env.NODE_ENV === "development" ? process.env.NGROK_URL : process.env.BACKEND_URL;
      if (!backendUrl) return { success: false, error: "BACKEND_URL not configured" };

      const secret = process.env.GUILDERS_SECRET;
      if (!secret)
        return {
          success: false,
          error: "Provider connections are not configured (GUILDERS_SECRET).",
        };

      const state = await signState(
        { userId: instConn.providerConnection.user_id, institutionId: instConn.institution_id },
        secret,
      );

      const callbackUrl = `${backendUrl}/callback/providers/gocardless?state=${encodeURIComponent(state)}`;

      let institution: Awaited<ReturnType<GoCardlessClient["getInstitution"]>> | undefined;
      try {
        institution = await client.getInstitution(institutionId);
      } catch {
        // optional
      }

      const agreement = await client.createAgreement(institutionId, institution);
      const requisition = await client.createRequisition({
        redirect: callbackUrl,
        institution_id: institutionId,
        agreement: agreement.id,
        reference: state,
      });

      return {
        success: true,
        data: { redirectURI: requisition.link, type: "redirect" },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to refresh GoCardless connection",
      };
    }
  }

  async getAccounts(params: AccountParams): Promise<ProviderAccount[]> {
    const config = getConfig();
    if (!config) return [];
    const client = this.createClient(config);
    const db = createDb();

    const instConn = await db.query.institutionConnection.findFirst({
      where: { id: params.connectionId },
      with: { institution: true },
    });
    if (!instConn?.connection_id) throw new Error("Connection not found");

    const requisition = await client.getRequisition(instConn.connection_id);
    if (requisition.status !== "LN") throw new Error("Requisition not linked");

    if (!requisition.accounts?.length) return [];

    const accounts: ProviderAccount[] = [];
    for (const accountId of requisition.accounts) {
      const [details, balancesRes] = await Promise.all([
        client.getAccountDetails(accountId),
        client.getAccountBalances(accountId),
      ]);
      const primary = client.getPrimaryBalance(balancesRes.balances, details.currency);
      if (!primary) continue;

      const d = details as Record<string, unknown>;
      const cashType =
        (d.cashAccountType as string | undefined) ?? (d.cash_account_type as string | undefined);
      const mapped = mapCashAccountType(cashType);
      let value = primary.balanceAmount.amount;
      const amountNum = Number(value);
      if (mapped.type === AccountTypeEnum.liability && amountNum < 0) {
        value = String(Math.abs(amountNum));
      }

      const name =
        (d.name as string | undefined) ?? (d.product as string | undefined) ?? "Bank Account";
      const currency = (d.currency as string | undefined) ?? "XXX";

      accounts.push({
        user_id: params.userId,
        name,
        type: mapped.type,
        subtype: mapped.subtype,
        value,
        currency: currency === "RUR" ? "RUB" : currency,
        institution_connection_id: params.connectionId,
        provider_account_id: accountId,
        image: instConn.institution?.logo_url ?? null,
      });
    }
    return accounts;
  }

  async getTransactions(params: TransactionParams): Promise<InsertTransaction[]> {
    const config = getConfig();
    if (!config) return [];
    const client = this.createClient(config);
    const db = createDb();

    const accountRecord = await db.query.account.findFirst({
      where: { provider_account_id: params.accountId },
    });
    if (!accountRecord) throw new Error("Account not found");

    const res = await client.getAccountTransactions(params.accountId);
    const booked = res.transactions?.booked ?? [];

    return booked.map((t) => {
      const amountNum = Number(t.transactionAmount.amount);
      const amount = String(amountNum);
      const counterparty = t.creditorName?.trim() || t.debtorName?.trim() || "";
      const remittance =
        t.remittanceInformationUnstructured ??
        t.remittanceInformationUnstructuredArray?.join(", ") ??
        t.additionalInformation ??
        "";
      const desc = [counterparty, remittance].filter(Boolean).join(" — ") || "No information";
      const currency =
        t.transactionAmount.currency === "RUR" ? "RUB" : t.transactionAmount.currency;
      return {
        account_id: accountRecord.id,
        amount,
        currency,
        timestamp: new Date(t.bookingDate),
        description: desc,
        provider_transaction_id:
          t.internalTransactionId ?? t.transactionId ?? t.entryReference ?? null,
      };
    });
  }
}
