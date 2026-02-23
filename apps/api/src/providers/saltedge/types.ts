// --- Provider (Institution) ---

export type SaltEdgeProvider = {
  id: string;
  code: string;
  name: string;
  country_code: string;
  status: "active" | "inactive" | "disabled";
  mode: "oauth" | "web" | "api";
  regulated: boolean;
  logo_url: string;
  home_url: string;
  created_at: string;
  updated_at: string;
};

// --- Customer ---

export type SaltEdgeCustomer = {
  customer_id: string;
  identifier: string;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
};

// --- Connection ---

export type SaltEdgeConnectionStatus = "active" | "inactive" | "disabled";

export type SaltEdgeConnection = {
  id: string;
  customer_id: string;
  provider_code: string;
  provider_name: string;
  country_code: string;
  status: SaltEdgeConnectionStatus;
  created_at: string;
  updated_at: string;
  last_consent_id: string;
};

export type SaltEdgeConnectResponse = {
  expires_at: string;
  connect_url: string;
  customer_id: string;
};

// --- Account ---

export type SaltEdgeAccount = {
  id: string;
  connection_id: string;
  name: string;
  nature: string;
  balance: number;
  currency_code: string;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// --- Transaction ---

export type SaltEdgeTransaction = {
  id: string;
  account_id: string;
  duplicated: boolean;
  mode: string;
  status: "posted" | "pending";
  made_on: string;
  amount: number;
  currency_code: string;
  description: string;
  category: string;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// --- Callback payloads ---

export type SaltEdgeCallbackStage =
  | "connect"
  | "fetch_holder_info"
  | "fetch_accounts"
  | "fetch_transactions"
  | "finish";

export type SaltEdgeSuccessCallback = {
  data: {
    connection_id: string;
    customer_id: string;
    custom_fields: Record<string, string>;
    stage: SaltEdgeCallbackStage;
  };
  meta: { version: string; time: string };
};

export type SaltEdgeFailureCallback = {
  data: {
    connection_id: string;
    customer_id: string;
    custom_fields: Record<string, string>;
    error_class: string;
    error_message: string;
  };
  meta: { version: string; time: string };
};

export type SaltEdgeDestroyCallback = {
  data: {
    connection_id: string;
    customer_id: string;
    custom_fields: Record<string, string>;
  };
  meta: { version: string; time: string };
};

// --- API response wrappers ---

export type SaltEdgeListResponse<T> = {
  data: T[];
  meta: { next_id: string | null; next_page: string | null };
};

export type SaltEdgeSingleResponse<T> = {
  data: T;
};
