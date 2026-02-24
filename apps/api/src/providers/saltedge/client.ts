import type {
  SaltEdgeAccount,
  SaltEdgeConnectResponse,
  SaltEdgeCustomer,
  SaltEdgeListResponse,
  SaltEdgeProvider,
  SaltEdgeSingleResponse,
  SaltEdgeTransaction,
} from "./types";

const BASE_URL = "https://www.saltedge.com/api/v6";

type SaltEdgeConfig = {
  appId: string;
  secret: string;
};

function headers(config: SaltEdgeConfig): HeadersInit {
  return {
    Accept: "application/json",
    "Content-type": "application/json",
    "App-id": config.appId,
    Secret: config.secret,
  };
}

async function request<T>(config: SaltEdgeConfig, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(config), ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SaltEdge API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// --- Providers (Institutions) ---

export async function listProviders(
  config: SaltEdgeConfig,
  params?: { country_code?: string; from_id?: string; per_page?: number },
): Promise<SaltEdgeListResponse<SaltEdgeProvider>> {
  const qs = new URLSearchParams();
  qs.set("include_sandboxes", "false");
  qs.set("exclude_inactive", "true");
  if (params?.country_code) qs.set("country_code", params.country_code);
  if (params?.from_id) qs.set("from_id", params.from_id);
  if (params?.per_page) qs.set("per_page", String(params.per_page));

  return request(config, `/providers?${qs}`);
}

export async function listAllProviders(config: SaltEdgeConfig): Promise<SaltEdgeProvider[]> {
  const all: SaltEdgeProvider[] = [];
  let fromId: string | undefined;

  for (;;) {
    const res = await listProviders(config, {
      from_id: fromId,
      per_page: 1000,
    });
    all.push(...res.data);
    if (!res.meta.next_id) break;
    fromId = res.meta.next_id;
  }

  return all;
}

// --- Customers ---

export async function createCustomer(
  config: SaltEdgeConfig,
  identifier: string,
): Promise<SaltEdgeCustomer> {
  const res = await request<SaltEdgeSingleResponse<SaltEdgeCustomer>>(config, "/customers", {
    method: "POST",
    body: JSON.stringify({ data: { identifier } }),
  });
  return res.data;
}

export async function showCustomer(
  config: SaltEdgeConfig,
  customerId: string,
): Promise<SaltEdgeCustomer> {
  const res = await request<SaltEdgeSingleResponse<SaltEdgeCustomer>>(
    config,
    `/customers/${customerId}`,
  );
  return res.data;
}

export async function removeCustomer(config: SaltEdgeConfig, customerId: string): Promise<void> {
  await request(config, `/customers/${customerId}`, { method: "DELETE" });
}

// --- Connections ---

export async function createConnection(
  config: SaltEdgeConfig,
  params: {
    customer_id: string;
    provider_code: string;
    consent_scopes: string[];
    return_to?: string;
  },
): Promise<SaltEdgeConnectResponse> {
  const res = await request<SaltEdgeSingleResponse<SaltEdgeConnectResponse>>(
    config,
    "/connections/connect",
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          customer_id: params.customer_id,
          consent: {
            scopes: params.consent_scopes,
          },
          attempt: {
            return_to: params.return_to,
          },
          provider: {
            code: params.provider_code,
          },
          return_connection_id: true,
        },
      }),
    },
  );
  return res.data;
}

export async function reconnectConnection(
  config: SaltEdgeConfig,
  connectionId: string,
  params: { consent_scopes: string[]; return_to?: string },
): Promise<SaltEdgeConnectResponse> {
  const res = await request<SaltEdgeSingleResponse<SaltEdgeConnectResponse>>(
    config,
    `/connections/${connectionId}/reconnect`,
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          consent: {
            scopes: params.consent_scopes,
          },
          attempt: {
            return_to: params.return_to,
          },
        },
      }),
    },
  );
  return res.data;
}

export async function refreshConnection(
  config: SaltEdgeConfig,
  connectionId: string,
): Promise<void> {
  await request(config, `/connections/${connectionId}/refresh`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        attempt: {
          fetch_scopes: ["accounts", "transactions"],
        },
      },
    }),
  });
}

export async function removeConnection(
  config: SaltEdgeConfig,
  connectionId: string,
): Promise<void> {
  await request(config, `/connections/${connectionId}`, { method: "DELETE" });
}

// --- Accounts ---

export async function listAccounts(
  config: SaltEdgeConfig,
  params: {
    connection_id: string;
    from_id?: string;
    per_page?: number;
  },
): Promise<SaltEdgeListResponse<SaltEdgeAccount>> {
  const qs = new URLSearchParams();
  qs.set("connection_id", params.connection_id);
  if (params.from_id) qs.set("from_id", params.from_id);
  if (params.per_page) qs.set("per_page", String(params.per_page));

  return request(config, `/accounts?${qs}`);
}

export async function listAllAccounts(
  config: SaltEdgeConfig,
  connectionId: string,
): Promise<SaltEdgeAccount[]> {
  const all: SaltEdgeAccount[] = [];
  let fromId: string | undefined;

  for (;;) {
    const res = await listAccounts(config, {
      connection_id: connectionId,
      from_id: fromId,
      per_page: 1000,
    });
    all.push(...res.data);
    if (!res.meta.next_id) break;
    fromId = res.meta.next_id;
  }

  return all;
}

// --- Transactions ---

export async function listTransactions(
  config: SaltEdgeConfig,
  params: {
    connection_id: string;
    account_id?: string;
    from_id?: string;
    per_page?: number;
    pending?: boolean;
  },
): Promise<SaltEdgeListResponse<SaltEdgeTransaction>> {
  const qs = new URLSearchParams();
  qs.set("connection_id", params.connection_id);
  if (params.account_id) qs.set("account_id", params.account_id);
  if (params.from_id) qs.set("from_id", params.from_id);
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.pending !== undefined) qs.set("pending", String(params.pending));

  return request(config, `/transactions?${qs}`);
}

export async function listAllTransactions(
  config: SaltEdgeConfig,
  connectionId: string,
  accountId?: string,
): Promise<SaltEdgeTransaction[]> {
  const all: SaltEdgeTransaction[] = [];
  let fromId: string | undefined;

  for (;;) {
    const res = await listTransactions(config, {
      connection_id: connectionId,
      account_id: accountId,
      from_id: fromId,
      per_page: 1000,
    });
    all.push(...res.data);
    if (!res.meta.next_id) break;
    fromId = res.meta.next_id;
  }

  return all;
}
