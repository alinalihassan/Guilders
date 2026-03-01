import { and, eq } from "drizzle-orm";

import { account } from "../db/schema/accounts";
import { AccountSubtypeEnum, AccountTypeEnum } from "../db/schema/enums";
import { transaction } from "../db/schema/transactions";
import { getProvider } from "../providers";
import { EnableBankingClient } from "../providers/enablebanking/client";
import { getSnapTradeClient } from "../providers/snaptrade/client";
import * as tellerClient from "../providers/teller/client";
import type { ProviderName } from "../providers/types";
import { createDb } from "./db";
import {
  SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
  SYNCED_TRANSACTION_LOCKED_ATTRIBUTES,
} from "./locked-attributes";

export async function syncConnectionData(params: {
  providerName: ProviderName;
  userId: string;
  institutionConnectionId: number;
}): Promise<void> {
  switch (params.providerName) {
    case "SnapTrade":
      await syncSnapTradeConnection(params.userId, params.institutionConnectionId);
      break;
    case "EnableBanking":
    case "Teller":
      await syncPullBasedConnection(params.providerName, params.userId, params.institutionConnectionId);
      break;
    default:
      throw new Error(`Unknown provider: ${params.providerName}`);
  }
}

/**
 * Sync a single account: refresh its balance and pull new transactions.
 * This is what the user triggers from the refresh button on an account page.
 */
export async function syncAccountData(accountId: number): Promise<void> {
  const db = createDb();

  const accountRecord = await db.query.account.findFirst({
    where: { id: accountId },
    with: {
      institutionConnection: {
        with: {
          providerConnection: {
            with: { provider: true },
          },
        },
      },
    },
  });
  if (!accountRecord?.provider_account_id || !accountRecord.institutionConnection) {
    throw new Error("Account or connection not found");
  }

  const providerName = accountRecord.institutionConnection.providerConnection?.provider
    ?.name as ProviderName | undefined;
  if (!providerName) throw new Error("Provider not found");

  const providerAccountId = accountRecord.provider_account_id;

  switch (providerName) {
    case "EnableBanking": {
      const clientId = process.env.ENABLEBANKING_CLIENT_ID;
      const privateKey = process.env.ENABLEBANKING_CLIENT_PRIVATE_KEY;
      if (!clientId || !privateKey) throw new Error("EnableBanking not configured");

      const ebClient = new EnableBankingClient(clientId, privateKey);
      const balances = await ebClient.getAccountBalances(providerAccountId);
      const balance = balances[0];
      if (balance) {
        await db
          .update(account)
          .set({ value: balance.balance_amount.amount, updated_at: new Date() })
          .where(eq(account.id, accountId));
      }
      break;
    }
    case "Teller": {
      const secret = accountRecord.institutionConnection.providerConnection?.secret;
      if (!secret) throw new Error("Teller access token not found");

      try {
        const balance = await tellerClient.getAccountBalances(secret, providerAccountId);
        const value = balance.available ?? balance.ledger ?? null;
        if (value) {
          await db
            .update(account)
            .set({ value, updated_at: new Date() })
            .where(eq(account.id, accountId));
        }
      } catch {
        // Balance endpoint may not be available for all Teller accounts
      }
      break;
    }
    case "SnapTrade": {
      const provConn = accountRecord.institutionConnection.providerConnection;
      if (!provConn?.secret) throw new Error("SnapTrade secret not found");

      await syncSnapTradeConnection(
        provConn.user_id,
        accountRecord.institution_connection_id!,
      );
      return;
    }
  }

  const provider = getProvider(providerName);
  const providerTxns = await provider.getTransactions({ accountId: providerAccountId });

  if (!providerTxns.length) return;

  const existingTxnRows = await db
    .select({ provider_transaction_id: transaction.provider_transaction_id })
    .from(transaction)
    .where(eq(transaction.account_id, accountId));

  const knownIds = new Set(
    existingTxnRows.map((t) => t.provider_transaction_id).filter(Boolean),
  );

  const newTxns = providerTxns.filter(
    (t) => t.provider_transaction_id && !knownIds.has(t.provider_transaction_id),
  );

  if (newTxns.length) {
    await db.insert(transaction).values(
      newTxns.map((t) => {
        let currency = t.currency;
        if (currency === "RUR") currency = "RUB";
        return { ...t, currency, locked_attributes: SYNCED_TRANSACTION_LOCKED_ATTRIBUTES };
      }),
    );
  }

  console.log(`[${providerName} sync] account ${accountId} synced`, {
    newTransactions: newTxns.length,
  });
}

/**
 * Sync accounts and transactions for pull-based providers (EnableBanking, Teller).
 * Fetches accounts via the provider, upserts them, then syncs transactions per account.
 */
async function syncPullBasedConnection(
  providerName: ProviderName,
  userId: string,
  institutionConnectionId: number,
): Promise<void> {
  const db = createDb();
  const provider = getProvider(providerName);

  const accounts = await provider.getAccounts({
    userId,
    connectionId: institutionConnectionId,
  });

  if (!accounts.length) {
    console.log(`[${providerName} sync] no accounts found`, { userId, institutionConnectionId });
    return;
  }

  const existingAccounts = await db
    .select({ id: account.id, provider_account_id: account.provider_account_id })
    .from(account)
    .where(eq(account.institution_connection_id, institutionConnectionId));

  const existingByProviderId = new Map(
    existingAccounts
      .filter((a) => a.provider_account_id)
      .map((a) => [a.provider_account_id!, a.id]),
  );

  for (const providerAcc of accounts) {
    if (!providerAcc.provider_account_id) continue;

    let currency = providerAcc.currency;
    if (currency === "RUR") currency = "RUB";

    const existingId = existingByProviderId.get(providerAcc.provider_account_id);

    if (existingId) {
      await db
        .update(account)
        .set({ value: providerAcc.value, currency, updated_at: new Date() })
        .where(eq(account.id, existingId));
    } else {
      const [inserted] = await db
        .insert(account)
        .values({ ...providerAcc, currency, locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES })
        .returning({ id: account.id });
      if (inserted) {
        existingByProviderId.set(providerAcc.provider_account_id, inserted.id);
      }
    }

    const accountId = existingByProviderId.get(providerAcc.provider_account_id);
    if (!accountId) continue;

    try {
      const providerTxns = await provider.getTransactions({
        accountId: providerAcc.provider_account_id,
      });

      if (!providerTxns.length) continue;

      const existingTxnRows = await db
        .select({ provider_transaction_id: transaction.provider_transaction_id })
        .from(transaction)
        .where(eq(transaction.account_id, accountId));

      const knownIds = new Set(
        existingTxnRows.map((t) => t.provider_transaction_id).filter(Boolean),
      );

      const newTxns = providerTxns.filter(
        (t) => t.provider_transaction_id && !knownIds.has(t.provider_transaction_id),
      );

      if (newTxns.length) {
        await db.insert(transaction).values(
          newTxns.map((t) => {
            let txnCurrency = t.currency;
            if (txnCurrency === "RUR") txnCurrency = "RUB";
            return { ...t, currency: txnCurrency, locked_attributes: SYNCED_TRANSACTION_LOCKED_ATTRIBUTES };
          }),
        );
      }
    } catch (error) {
      console.error(
        `[${providerName} sync] Failed to sync transactions for account:`,
        providerAcc.provider_account_id,
        error,
      );
    }
  }

  console.log(`[${providerName} sync] complete`, {
    userId,
    institutionConnectionId,
    accounts: accounts.length,
  });
}

/**
 * Sync SnapTrade holdings for all accounts under an institution connection.
 * SnapTrade is brokerage-only: it syncs positions + cash, not traditional transactions.
 */
async function syncSnapTradeConnection(
  userId: string,
  institutionConnectionId: number,
): Promise<void> {
  const db = createDb();

  const instConn = await db.query.institutionConnection.findFirst({
    where: { id: institutionConnectionId },
    with: {
      providerConnection: true,
      institution: true,
      accounts: true,
    },
  });
  if (!instConn?.providerConnection?.secret) {
    throw new Error("SnapTrade provider connection secret not found");
  }
  if (!instConn.institution) {
    throw new Error("SnapTrade institution not found");
  }

  const client = getSnapTradeClient();

  const snapTradeAccounts = instConn.accounts.filter((a) => a.provider_account_id && !a.parent);
  if (!snapTradeAccounts.length) {
    console.log("[SnapTrade sync] no accounts to sync", { userId, institutionConnectionId });
    return;
  }

  for (const existingAccount of snapTradeAccounts) {
    if (!existingAccount.provider_account_id) continue;

    try {
      const response = await client.accountInformation.getUserHoldings({
        userId,
        userSecret: instConn.providerConnection.secret,
        accountId: existingAccount.provider_account_id,
      });

      const snapAccount = response.data?.account;
      if (!snapAccount) continue;

      const totalValue = snapAccount.balance?.total?.amount ?? 0;
      const totalCurrency = snapAccount.balance?.total?.currency?.toUpperCase() ?? "EUR";
      const parentName = snapAccount.institution_name ?? "SnapTrade Account";
      const totalCost =
        response.data?.positions?.reduce(
          (acc, position) =>
            acc + (position.average_purchase_price ?? 0) * (position.units ?? 0),
          0,
        ) ?? totalValue;

      await db
        .update(account)
        .set({
          type: AccountTypeEnum.asset,
          subtype: AccountSubtypeEnum.brokerage,
          user_id: userId,
          name: parentName,
          value: totalValue.toString(),
          currency: totalCurrency,
          cost: totalCost.toString(),
          institution_connection_id: institutionConnectionId,
          provider_account_id: snapAccount.id,
          image: instConn.institution.logo_url,
          locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
          parent: null,
          updated_at: new Date(),
        })
        .where(eq(account.id, existingAccount.id));

      await db
        .delete(account)
        .where(and(eq(account.parent, existingAccount.id), eq(account.user_id, userId)));

      const positions = response.data?.positions ?? [];
      const positionsValue = positions.reduce((acc, position) => {
        const units = position.units ?? 0;
        const price = position.price ?? 0;
        return acc + price * units;
      }, 0);
      const cashValue = totalValue - positionsValue;

      await db.insert(account).values({
        type: AccountTypeEnum.asset,
        subtype: AccountSubtypeEnum.depository,
        user_id: userId,
        parent: existingAccount.id,
        name: "Cash",
        value: cashValue.toString(),
        cost: cashValue.toString(),
        units: null,
        currency: totalCurrency,
        ticker: null,
        institution_connection_id: institutionConnectionId,
        image: instConn.institution.logo_url,
        provider_account_id: null,
        locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
      });

      for (const position of positions) {
        const units = position.units ?? 0;
        const price = position.price ?? 0;
        const average = position.average_purchase_price ?? 0;
        const symbol = position.symbol?.symbol;

        await db.insert(account).values({
          type: AccountTypeEnum.asset,
          subtype: AccountSubtypeEnum.stock,
          user_id: userId,
          parent: existingAccount.id,
          name: symbol?.description ?? "Stock",
          value: (price * units).toString(),
          cost: (average * units).toString(),
          units: units.toString(),
          currency: symbol?.currency?.code?.toUpperCase() ?? totalCurrency,
          ticker: symbol?.raw_symbol ?? null,
          institution_connection_id: institutionConnectionId,
          image: symbol?.logo_url ?? null,
          provider_account_id: null,
          locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
        });
      }

      const parentValue = cashValue + positionsValue;
      await db
        .update(account)
        .set({ value: parentValue.toString(), updated_at: new Date() })
        .where(eq(account.id, existingAccount.id));
    } catch (error) {
      console.error(
        "[SnapTrade sync] Failed to sync holdings for account:",
        existingAccount.provider_account_id,
        error,
      );
    }
  }

  console.log("[SnapTrade sync] complete", { userId, institutionConnectionId });
}
