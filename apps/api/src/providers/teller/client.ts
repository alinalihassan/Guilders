import type { TellerAccount, TellerBalance, TellerInstitution, TellerTransaction } from "./types";

const BASE_URL = "https://api.teller.io";

type TellerConfig = {
  applicationId: string;
  environment: string;
};

function getTellerConfig(): TellerConfig {
  const applicationId = process.env.TELLER_APPLICATION_ID;
  const environment = process.env.TELLER_ENVIRONMENT ?? "sandbox";

  if (!applicationId) {
    throw new Error("Missing TELLER_APPLICATION_ID env var");
  }

  return { applicationId, environment };
}

function authHeaders(accessToken: string): HeadersInit {
  const encoded = Buffer.from(`${accessToken}:`).toString("base64");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${encoded}`,
  };
}

async function request<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(accessToken), ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teller API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function listInstitutions(): Promise<TellerInstitution[]> {
  const res = await fetch(`${BASE_URL}/institutions`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teller API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<TellerInstitution[]>;
}

export async function listAccounts(accessToken: string): Promise<TellerAccount[]> {
  return request<TellerAccount[]>("/accounts", accessToken);
}

export async function getAccountBalances(
  accessToken: string,
  accountId: string,
): Promise<TellerBalance> {
  return request<TellerBalance>(`/accounts/${accountId}/balances`, accessToken);
}

export async function listTransactions(
  accessToken: string,
  accountId: string,
  params?: { count?: number; fromId?: string },
): Promise<TellerTransaction[]> {
  const qs = new URLSearchParams();
  if (params?.count) qs.set("count", String(params.count));
  if (params?.fromId) qs.set("from_id", params.fromId);

  const query = qs.toString();
  const path = `/accounts/${accountId}/transactions${query ? `?${query}` : ""}`;
  return request<TellerTransaction[]>(path, accessToken);
}

export async function listAllTransactions(
  accessToken: string,
  accountId: string,
): Promise<TellerTransaction[]> {
  const all: TellerTransaction[] = [];
  let fromId: string | undefined;
  const PAGE_SIZE = 250;

  for (;;) {
    const page = await listTransactions(accessToken, accountId, {
      count: PAGE_SIZE,
      fromId,
    });
    all.push(...page);
    const nextFromId = page[page.length - 1]?.id;
    if (!nextFromId || nextFromId === fromId) break;
    fromId = nextFromId;
  }

  return all;
}

export async function deleteEnrollment(accessToken: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!res.ok) throw new Error(`Teller API error ${res.status}: ${await res.text()}`);
}

export { getTellerConfig };
