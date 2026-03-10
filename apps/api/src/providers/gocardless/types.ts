// Token
export type TokenNewResponse = {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
};

export type TokenRefreshResponse = {
  access: string;
  access_expires: number;
  refresh?: string;
  refresh_expires?: number;
};

// Institutions (Integration / IntegrationRetrieve from swagger)
export type Institution = {
  id: string;
  name: string;
  bic: string;
  transaction_total_days: string;
  logo: string;
  countries: string[];
  max_access_valid_for_days?: string;
  max_access_valid_for_days_reconfirmation?: string;
  /** From single-institution GET; list endpoint does not include this */
  supported_features?: string[];
  /** Derived from supported_features for agreement creation */
  separate_continuous_history_consent?: boolean;
};

// End-user agreement
export type CreateAgreementBody = {
  institution_id: string;
  access_scope: string[];
  access_valid_for_days: number;
  max_historical_days: number;
};

export type AgreementResponse = {
  id: string;
  created: string;
  institution_id: string;
  max_historical_days: number;
  access_valid_for_days: number;
  access_scope: string[];
  accepted: boolean;
};

// Requisition (StatusEnum from swagger)
export type RequisitionStatus =
  | "CR"
  | "ID"
  | "LN"
  | "RJ"
  | "ER"
  | "SU"
  | "EX"
  | "GC"
  | "UA"
  | "GA"
  | "SA";

export type CreateRequisitionBody = {
  redirect: string;
  institution_id: string;
  agreement: string;
  reference?: string;
  user_language?: string;
};

export type Requisition = {
  id: string;
  created: string;
  redirect: string;
  status: RequisitionStatus;
  institution_id: string;
  agreement: string;
  reference: string;
  accounts: string[];
  user_language?: string;
  link: string;
  ssn: string | null;
  account_selection: boolean;
  redirect_immediate: boolean;
};

export type RequisitionsListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Requisition[];
};

export type DeleteRequisitionResponse = {
  summary: string;
  detail: string;
  status_code: number;
};

// Account
export type AccountResource = {
  id: string;
  created: string;
  last_accessed: string;
  iban?: string;
  institution_id: string;
  status: string;
  owner_name?: string;
  resourceId?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
};

export type AccountDetailsResource = {
  account: {
    resourceId: string;
    iban?: string;
    currency: string;
    ownerName?: string;
    name?: string;
    product?: string;
    cashAccountType?: string;
  };
};

export type AccountDetailsResponse = AccountResource & AccountDetailsResource["account"];

// Balances
export type BalanceResource = {
  balanceAmount: { amount: string; currency: string };
  balanceType: string;
  creditLimitIncluded?: boolean;
};

export type AccountBalancesResponse = {
  balances: BalanceResource[];
};

// Transactions
export type TransactionResource = {
  transactionAmount: { amount: string; currency: string };
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  proprietaryBankTransactionCode?: string;
  transactionId?: string;
  internalTransactionId?: string;
  entryReference?: string;
  bookingDate: string;
  valueDate?: string;
  creditorName?: string;
  debtorName?: string;
  additionalInformation?: string;
};

export type AccountTransactionsResponse = {
  transactions: {
    booked: TransactionResource[];
    pending?: TransactionResource[];
  };
};

// API error
export type ApiErrorBody = {
  summary?: string;
  detail?: string;
  type?: string;
  status_code?: number;
};
