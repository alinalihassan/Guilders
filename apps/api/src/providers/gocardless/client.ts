import type {
  AccountBalancesResponse,
  AccountDetailsResponse,
  AccountDetailsResource,
  AccountResource,
  AccountTransactionsResponse,
  AgreementResponse,
  BalanceResource,
  CreateAgreementBody,
  CreateRequisitionBody,
  Institution,
  InstitutionsListResponse,
  Requisition,
  RequisitionsListResponse,
  TokenNewResponse,
  TokenRefreshResponse,
} from "./types";

const BASE_URL = "https://bankaccountdata.gocardless.com";

const BALANCE_TIERS = [["interimBooked"], ["closingBooked"], ["interimAvailable"], ["expected"]];

function selectPrimaryBalance(
  balances: BalanceResource[] | undefined,
  preferredCurrency?: string,
): BalanceResource | undefined {
  if (!balances?.length) return undefined;
  const match = (b: BalanceResource) =>
    !preferredCurrency ||
    b.balanceAmount.currency.toUpperCase() === preferredCurrency.toUpperCase();
  for (const tier of BALANCE_TIERS) {
    const set = new Set(tier);
    const found =
      balances.find((b) => set.has(b.balanceType) && match(b)) ??
      balances.find((b) => set.has(b.balanceType));
    if (found) return found;
  }
  return balances[0];
}

const RESTRICTED_INSTITUTIONS = new Set([
  "BRED_BREDFRPP",
  "SWEDBANK_SWEDSESS",
  "INDUSTRA_MULTLV2X",
  "MEDICINOSBANK_MDBALT22",
  "CESKA_SPORITELNA_LONG_GIBACZPX",
  "LHV_LHVBEE22",
  "LABORALKUTXA_CLPEES2M",
  "BANKINTER_BKBKESMM",
  "CAIXABANK_CAIXESBB",
  "SANTANDER_DE_SCFBDE33",
  "BBVA_BBVAESMM",
]);

function getMaxHistoricalDays(
  institutionId: string,
  transactionTotalDays: number,
  separateContinuousHistoryConsent?: boolean,
): number {
  if (separateContinuousHistoryConsent || RESTRICTED_INSTITUTIONS.has(institutionId)) {
    return 90;
  }
  return Math.min(transactionTotalDays, 730);
}

export { selectPrimaryBalance, getMaxHistoricalDays };

export class GoCardlessClient {
  private readonly baseUrl = BASE_URL;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accessExpiry = 0;
  private readonly bufferSeconds = 300;

  constructor(
    private readonly secretId: string,
    private readonly secretKey: string,
  ) {}

  private async tokenRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GoCardless token ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && this.accessExpiry > now + this.bufferSeconds) {
      return this.accessToken;
    }
    if (this.refreshToken) {
      try {
        const res = await this.tokenRequest<TokenRefreshResponse>("/api/v2/token/refresh/", {
          refresh: this.refreshToken,
        });
        this.accessToken = res.access;
        this.accessExpiry = now + (res.access_expires ?? 86400);
        if (res.refresh) {
          this.refreshToken = res.refresh;
        }
        return this.accessToken;
      } catch {
        this.refreshToken = null;
      }
    }
    const res = await this.tokenRequest<TokenNewResponse>("/api/v2/token/new/", {
      secret_id: this.secretId,
      secret_key: this.secretKey,
    });
    this.accessToken = res.access;
    this.refreshToken = res.refresh;
    this.accessExpiry = now + res.access_expires;
    return this.accessToken;
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "DELETE";
      body?: Record<string, unknown>;
      searchParams?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(path, this.baseUrl);
    if (options.searchParams) {
      for (const [k, v] of Object.entries(options.searchParams)) {
        if (v != null && v !== "") url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try {
        const j = JSON.parse(text) as { detail?: string; summary?: string };
        detail = j.detail ?? j.summary ?? text;
      } catch {
        // keep text
      }
      throw new Error(`GoCardless API ${res.status}: ${detail}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private get<T>(path: string, searchParams?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { searchParams });
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  private delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  async getInstitutions(country?: string): Promise<Institution[]> {
    const all: Institution[] = [];
    let path = "/api/v2/institutions/";
    let params: Record<string, string> | undefined = country ? { country } : undefined;

    while (true) {
      const page = await this.get<InstitutionsListResponse>(path, params);
      all.push(...page.results);
      if (!page.next) return all;
      const next = new URL(page.next, this.baseUrl);
      path = next.pathname;
      params = Object.fromEntries(next.searchParams) as Record<string, string>;
    }
  }

  async getInstitution(id: string): Promise<Institution> {
    return this.get<Institution>(`/api/v2/institutions/${id}/`);
  }

  async createAgreement(
    institutionId: string,
    institution?: Institution,
  ): Promise<AgreementResponse> {
    const transactionTotalDays = institution
      ? parseInt(institution.transaction_total_days, 10) || 540
      : 540;
    const separateContinuous =
      institution?.separate_continuous_history_consent ??
      institution?.supported_features?.includes("separate_continuous_history_consent");
    const maxHistorical = getMaxHistoricalDays(
      institutionId,
      transactionTotalDays,
      separateContinuous,
    );
    const body: CreateAgreementBody = {
      institution_id: institutionId,
      access_scope: ["balances", "details", "transactions"],
      access_valid_for_days: 180,
      max_historical_days: maxHistorical,
    };
    try {
      return await this.post<AgreementResponse>("/api/v2/agreements/enduser/", body);
    } catch (err) {
      const status = (err as { message?: string }).message?.match(/^GoCardless API (\d+):/)?.[1];
      if (status && parseInt(status, 10) >= 400 && parseInt(status, 10) < 500) {
        body.access_valid_for_days = 90;
        body.max_historical_days = Math.min(90, maxHistorical);
        return this.post<AgreementResponse>("/api/v2/agreements/enduser/", body);
      }
      throw err;
    }
  }

  async createRequisition(params: {
    redirect: string;
    institution_id: string;
    agreement: string;
    reference: string;
  }): Promise<Requisition> {
    const body: CreateRequisitionBody = {
      redirect: params.redirect,
      institution_id: params.institution_id,
      agreement: params.agreement,
      reference: params.reference,
    };
    return this.post<Requisition>("/api/v2/requisitions/", body);
  }

  async getRequisitions(): Promise<RequisitionsListResponse> {
    return this.get<RequisitionsListResponse>("/api/v2/requisitions/");
  }

  async getRequisition(id: string): Promise<Requisition> {
    return this.get<Requisition>(`/api/v2/requisitions/${id}/`);
  }

  async deleteRequisition(id: string): Promise<void> {
    await this.delete<{ summary: string; detail: string; status_code: number }>(
      `/api/v2/requisitions/${id}/`,
    );
  }

  async getAccountDetails(accountId: string): Promise<AccountDetailsResponse> {
    const [account, details] = await Promise.all([
      this.get<AccountResource>(`/api/v2/accounts/${accountId}/`),
      this.get<AccountDetailsResource>(`/api/v2/accounts/${accountId}/details/`),
    ]);
    return { ...account, ...details.account } as AccountDetailsResponse;
  }

  async getAccountBalances(accountId: string): Promise<AccountBalancesResponse> {
    return this.get<AccountBalancesResponse>(`/api/v2/accounts/${accountId}/balances/`);
  }

  getPrimaryBalance(
    balances: BalanceResource[] | undefined,
    preferredCurrency?: string,
  ): BalanceResource | undefined {
    return selectPrimaryBalance(balances, preferredCurrency);
  }

  async getAccountTransactions(
    accountId: string,
    dateFrom?: string,
  ): Promise<AccountTransactionsResponse> {
    const params = dateFrom ? { date_from: dateFrom } : undefined;
    return this.get<AccountTransactionsResponse>(
      `/api/v2/accounts/${accountId}/transactions/`,
      params,
    );
  }
}
