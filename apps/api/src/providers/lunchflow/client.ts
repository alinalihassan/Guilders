import { parseLunchFlowAccounts, parseLunchFlowBalance, parseLunchFlowTransactions } from "./map";
import type { LunchFlowAccount, LunchFlowBalance, LunchFlowTransaction } from "./types";
import { LUNCHFLOW_BASE_URL } from "./types";

export class LunchFlowApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LunchFlowApiError";
  }
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };
}

async function request(path: string, apiKey: string): Promise<unknown> {
  const response = await fetch(`${LUNCHFLOW_BASE_URL}${path}`, {
    headers: authHeaders(apiKey),
  });

  if (!response.ok) {
    throw new LunchFlowApiError(
      response.status,
      response.status === 401 || response.status === 403
        ? "Invalid Lunch Flow API key"
        : `Lunch Flow API error ${response.status}`,
    );
  }

  return response.json();
}

export async function listAccounts(apiKey: string): Promise<LunchFlowAccount[]> {
  return parseLunchFlowAccounts(await request("/accounts", apiKey));
}

export async function getAccountBalance(
  apiKey: string,
  accountId: string | number,
): Promise<LunchFlowBalance | null> {
  return parseLunchFlowBalance(await request(`/accounts/${accountId}/balance`, apiKey));
}

export async function listTransactions(
  apiKey: string,
  accountId: string | number,
  params?: { from?: string; to?: string },
): Promise<LunchFlowTransaction[]> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const suffix = query.size ? `?${query.toString()}` : "";
  return parseLunchFlowTransactions(
    await request(`/accounts/${accountId}/transactions${suffix}`, apiKey),
  );
}
