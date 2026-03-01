import type {
  ASPSP,
  AccountResource,
  AuthorizeSessionResponse,
  BalanceResource,
  GetSessionResponse,
  StartAuthorizationRequest,
  StartAuthorizationResponse,
  Transaction,
  TransactionStatus,
  TransactionsFetchStrategy,
} from "./types";

function base64UrlEncode(data: unknown): string {
  return Buffer.from(JSON.stringify(data))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalizedPem = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const buffer = Buffer.from(base64, "base64");
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; i++) {
    view[i] = buffer[i]!;
  }
  return arrayBuffer;
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  searchParams?: Record<string, string | undefined>;
};

type RequestConfig = {
  endpoint: string;
  returnType: "single" | "array";
  dataField?: string;
  options?: RequestOptions;
  fetchAll?: boolean;
};

export class EnableBankingClient {
  private readonly baseUrl = "https://api.enablebanking.com";
  private jwt: string | null = null;
  private jwtExpiry = 0;
  private cryptoKey: CryptoKey | null = null;

  constructor(
    private readonly clientId: string,
    private readonly privateKey: string,
  ) {}

  private async getCryptoKey(): Promise<CryptoKey> {
    if (this.cryptoKey) return this.cryptoKey;

    const keyBuffer = pemToArrayBuffer(this.privateKey);
    this.cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
      false,
      ["sign"],
    );
    return this.cryptoKey;
  }

  private async generateJWT(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.jwt && this.jwtExpiry > now + 300) return this.jwt;

    const header = base64UrlEncode({ typ: "JWT", alg: "RS256", kid: this.clientId });
    const payload = base64UrlEncode({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: now,
      exp: now + 3600,
    });

    const data = new TextEncoder().encode(`${header}.${payload}`);
    const key = await this.getCryptoKey();
    const signatureBuffer = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, data);

    const signature = Buffer.from(new Uint8Array(signatureBuffer))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    this.jwt = `${header}.${payload}.${signature}`;
    this.jwtExpiry = now + 3600;
    return this.jwt;
  }

  private async request<T>(config: RequestConfig): Promise<T> {
    const { endpoint, returnType, dataField, options = {}, fetchAll = false } = config;
    const { method = "GET", body, searchParams } = options;

    const jwt = await this.generateJWT();
    const url = new URL(endpoint, this.baseUrl);

    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value) url.searchParams.append(key, value);
      }
    }

    let response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`EnableBanking API error ${response.status}: ${text}`);
    }

    let data = await response.json();
    let resultData = dataField ? (data as Record<string, unknown>)[dataField] : data;

    if (fetchAll && returnType === "array" && (data as Record<string, unknown>).continuation_key) {
      let allResults = Array.isArray(resultData) ? [...resultData] : [resultData];
      let continuationKey = (data as Record<string, string | undefined>).continuation_key;

      while (continuationKey) {
        const paginatedUrl = new URL(endpoint, this.baseUrl);
        if (searchParams) {
          for (const [key, value] of Object.entries(searchParams)) {
            if (value) paginatedUrl.searchParams.append(key, value);
          }
        }
        paginatedUrl.searchParams.set("continuation_key", continuationKey);

        response = await fetch(paginatedUrl.toString(), {
          method,
          headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          throw new Error(
            `Enable Banking API pagination failed: ${response.status} ${response.statusText} — ${await response.text()}`,
          );
        }

        data = await response.json();
        resultData = dataField ? (data as Record<string, unknown>)[dataField] : data;
        allResults = allResults.concat(Array.isArray(resultData) ? resultData : [resultData]);
        continuationKey = (data as Record<string, string | undefined>).continuation_key;
      }

      return allResults as T;
    }

    if (returnType === "array" && !Array.isArray(resultData)) {
      return [resultData] as T;
    }

    return resultData as T;
  }

  async getASPSPs(): Promise<ASPSP[]> {
    return this.request<ASPSP[]>({
      endpoint: "/aspsps",
      returnType: "array",
      dataField: "aspsps",
    });
  }

  async createAuthorization(params: {
    validUntil: string;
    aspspName: string;
    aspspCountry: string;
    redirectUrl: string;
    state: string;
    userId: string;
  }): Promise<StartAuthorizationResponse> {
    return this.request<StartAuthorizationResponse>({
      endpoint: "/auth",
      returnType: "single",
      options: {
        method: "POST",
        body: {
          access: { valid_until: params.validUntil },
          aspsp: { name: params.aspspName, country: params.aspspCountry },
          redirect_url: params.redirectUrl,
          state: params.state,
          psu_id: params.userId,
        } as StartAuthorizationRequest,
      },
    });
  }

  async authorizeSession(code: string): Promise<AuthorizeSessionResponse> {
    return this.request<AuthorizeSessionResponse>({
      endpoint: "/sessions",
      returnType: "single",
      options: { method: "POST", body: { code } },
    });
  }

  async getSession(sessionId: string): Promise<GetSessionResponse> {
    return this.request<GetSessionResponse>({
      endpoint: `/sessions/${sessionId}`,
      returnType: "single",
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.request<void>({
      endpoint: `/sessions/${sessionId}`,
      returnType: "single",
      options: { method: "DELETE" },
    });
  }

  async getAccountDetails(accountId: string): Promise<AccountResource> {
    return this.request<AccountResource>({
      endpoint: `/accounts/${accountId}/details`,
      returnType: "single",
    });
  }

  async getAccountBalances(accountId: string): Promise<BalanceResource[]> {
    return this.request<BalanceResource[]>({
      endpoint: `/accounts/${accountId}/balances`,
      returnType: "array",
      dataField: "balances",
    });
  }

  async getAccountTransactions(params: {
    accountId: string;
    from?: string;
    to?: string;
    transactionStatus?: TransactionStatus;
    strategy?: TransactionsFetchStrategy;
    fetchAll?: boolean;
  }): Promise<Transaction[]> {
    return this.request<Transaction[]>({
      endpoint: `/accounts/${params.accountId}/transactions`,
      returnType: "array",
      dataField: "transactions",
      fetchAll: params.fetchAll,
      options: {
        searchParams: {
          date_from: params.from,
          date_to: params.to,
          transaction_status: params.transactionStatus,
          strategy: params.strategy,
        },
      },
    });
  }
}
