import type { Database } from "../../lib/db";
import type { FinancialContext, FinancialDataJson, ToFinancialDataJsonParams } from "./types";
import { FINANCIAL_ADVISOR_PROMPT } from "./types";

export function toFinancialDataJson(params: ToFinancialDataJsonParams): FinancialDataJson {
  const accountMap = new Map(params.accounts.map((a) => [a.id, a]));

  return {
    netWorth: params.netWorth,
    primaryCurrency: params.primaryCurrency,
    accounts: params.accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      subtype: acc.subtype,
      image: acc.image ?? undefined,
      value: String(acc.value),
      currency: acc.currency,
      cost: acc.cost != null ? String(acc.cost) : undefined,
      institution: acc.institutionConnection?.institution?.name,
    })),
    transactions: params.transactions.map((tx) => {
      const acc = accountMap.get(tx.account_id);
      return {
        accountId: tx.account_id,
        accountName: acc?.name,
        date: tx.date,
        amount: String(tx.amount),
        currency: tx.currency,
        category: tx.category,
        description: tx.description,
      };
    }),
    exchangeRates: params.exchangeRates.map((r) => ({
      currencyCode: r.currency_code,
      rate: String(r.rate),
    })),
  };
}

export async function getFinancialContext(userId: string, db: Database): Promise<FinancialContext> {
  const accounts = await db.query.account.findMany({
    where: { user_id: userId },
    with: {
      institutionConnection: {
        with: { institution: true },
      },
    },
  });

  const transactions = await db.query.transaction.findMany({
    where: { account: { user_id: userId } },
    orderBy: (tx, { desc }) => desc(tx.date),
    limit: 50,
  });

  const exchangeRates = await db.query.rate.findMany();

  const userRecord = await db.query.user.findFirst({
    where: { id: userId },
    columns: { currency: true },
  });

  const netWorth = accounts.reduce((sum, acc) => {
    const value = parseFloat(acc.value.toString());
    return acc.type === "liability" ? sum - value : sum + value;
  }, 0);

  const primaryCurrency = userRecord?.currency || "EUR";

  return {
    prompt: FINANCIAL_ADVISOR_PROMPT,
    data: toFinancialDataJson({
      accounts: accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        image: acc.image,
        value: acc.value,
        currency: acc.currency,
        cost: acc.cost,
        institutionConnection: acc.institutionConnection
          ? {
              institution: acc.institutionConnection.institution
                ? { name: acc.institutionConnection.institution.name }
                : undefined,
            }
          : null,
      })),
      transactions,
      exchangeRates,
      netWorth,
      primaryCurrency,
    }),
  };
}
