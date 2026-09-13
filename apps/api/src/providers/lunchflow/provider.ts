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
  ProviderTransaction,
  RefreshConnectionResult,
  RegisterUserResult,
  TransactionParams,
} from "../types";
import * as client from "./client";
import {
  isActiveLunchFlowAccount,
  lunchFlowInstitutionKey,
  mapLunchFlowAccountType,
  mapLunchFlowTransaction,
  normalizeCurrency,
  pickLogoUrl,
  truncateName,
} from "./map";

const API_KEY_CONNECT_ERROR = "Connect Lunch Flow from Settings → Connections with an API key.";

function transactionFromDate(): string {
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 2);
  return from.toISOString().slice(0, 10);
}

export class LunchFlowProvider implements IProvider {
  readonly name: ProviderName = "LunchFlow";
  readonly enabled = true;

  async getInstitutions(): Promise<ProviderInstitution[]> {
    return [];
  }

  async registerUser(userId: string): Promise<RegisterUserResult> {
    return { success: true, data: { userId, userSecret: userId } };
  }

  async deregisterUser(): Promise<DeregisterUserResult> {
    return { success: true };
  }

  async connect(_params: ConnectionParams): Promise<ConnectResult> {
    return { success: false, error: API_KEY_CONNECT_ERROR };
  }

  async reconnect(_params: ConnectionParams): Promise<ConnectResult> {
    return { success: false, error: API_KEY_CONNECT_ERROR };
  }

  async refreshConnection(_connectionId: string): Promise<RefreshConnectionResult> {
    return { success: true };
  }

  async getAccounts(params: AccountParams): Promise<ProviderAccount[]> {
    const db = createDb();
    const instConn = await db.query.institutionConnection.findFirst({
      where: { id: params.connectionId },
      with: { providerConnection: true, institution: true },
    });
    if (!instConn?.providerConnection?.secret) {
      throw new Error("Lunch Flow API key not found");
    }
    if (!instConn.institution) throw new Error("Institution not found");

    const institutionKey = instConn.institution.provider_institution_id;
    const fallbackLogo = instConn.institution?.logo_url ?? "";
    const lunchFlowAccounts = await client.listAccounts(instConn.providerConnection.secret);

    const accounts: ProviderAccount[] = [];
    for (const lunchFlowAccount of lunchFlowAccounts) {
      if (!isActiveLunchFlowAccount(lunchFlowAccount.status)) continue;
      if (lunchFlowInstitutionKey(lunchFlowAccount) !== institutionKey) {
        continue;
      }

      let value = "0";
      let currency = normalizeCurrency(lunchFlowAccount.currency);
      try {
        const balance = await client.getAccountBalance(
          instConn.providerConnection.secret,
          lunchFlowAccount.id,
        );
        if (balance) {
          value = balance.amount;
          currency = normalizeCurrency(balance.currency ?? lunchFlowAccount.currency);
        }
      } catch {
        // Some Lunch Flow accounts do not expose a balance.
      }

      const mapped = mapLunchFlowAccountType(lunchFlowAccount.provider, lunchFlowAccount.name);
      accounts.push({
        user_id: params.userId,
        name: truncateName(lunchFlowAccount.name, 100),
        type: mapped.type,
        subtype: mapped.subtype,
        value,
        currency,
        institution_connection_id: params.connectionId,
        provider_account_id: String(lunchFlowAccount.id),
        image: pickLogoUrl(lunchFlowAccount.institution_logo, fallbackLogo) || null,
      });
    }

    return accounts;
  }

  async getTransactions(params: TransactionParams): Promise<ProviderTransaction[]> {
    const db = createDb();
    const accountRecord = await db.query.account.findFirst({
      where: { provider_account_id: params.accountId },
      with: { institutionConnection: { with: { providerConnection: true } } },
    });
    if (!accountRecord?.institutionConnection?.providerConnection?.secret) {
      throw new Error("Lunch Flow API key not found");
    }

    const transactions = await client.listTransactions(
      accountRecord.institutionConnection.providerConnection.secret,
      params.accountId,
      { from: transactionFromDate() },
    );

    return transactions
      .map((transaction) =>
        mapLunchFlowTransaction(transaction, accountRecord.id, accountRecord.currency),
      )
      .filter((transaction): transaction is ProviderTransaction => transaction !== null);
  }
}
