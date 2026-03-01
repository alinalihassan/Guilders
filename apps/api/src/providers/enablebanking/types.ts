export type ASPSP = {
  name: string;
  country: string;
  logo: string;
  psu_types: ("personal" | "business")[];
  auth_methods: AuthMethod[];
  maximum_consent_validity: number;
  beta: boolean;
  bic?: string;
  required_psu_headers?: string[];
};

export type AuthMethod = {
  name?: string;
  title?: string;
  psu_type: "personal" | "business";
  credentials?: Credential[];
  approach: "DECOUPLED" | "EMBEDDED" | "REDIRECT";
  hidden_method: boolean;
};

export type Credential = {
  name: string;
  title: string;
  required: boolean;
  description?: string;
  template?: string;
};

export type AmountType = {
  currency: string;
  amount: string;
};

export type AccountIdentification = {
  iban?: string;
  other?: GenericIdentification;
};

export type GenericIdentification = {
  identification: string;
  scheme_name: string;
  issuer?: string;
};

export type FinancialInstitutionIdentification = {
  bic_fi?: string;
  clearing_system_member_id?: {
    clearing_system_id?: string;
    member_id?: string;
  };
  name?: string;
};

export type CashAccountType = "CACC" | "CARD" | "CASH" | "LOAN" | "OTHR" | "SVGS";

export type AccountResource = {
  account_id?: AccountIdentification;
  all_account_ids?: GenericIdentification[];
  account_servicer?: FinancialInstitutionIdentification;
  name?: string;
  details?: string;
  usage?: "ORGA" | "PRIV";
  cash_account_type: CashAccountType;
  product?: string;
  currency: string;
  psu_status?: string;
  credit_limit?: AmountType;
  legal_age?: boolean | null;
  uid?: string;
  identification_hash: string;
  identification_hashes: string[];
};

export type BalanceResource = {
  name: string;
  balance_amount: AmountType;
  balance_type: string;
  last_change_date_time?: string;
  reference_date?: string;
  last_committed_transaction?: string;
};

export type TransactionStatus = "BOOK" | "CNCL" | "HOLD" | "OTHR" | "PDNG" | "RJCT" | "SCHD";
export type TransactionsFetchStrategy = "default" | "longest";

export type Transaction = {
  entry_reference?: string;
  merchant_category_code?: string;
  transaction_amount: AmountType;
  creditor?: { name?: string };
  creditor_account?: AccountIdentification;
  debtor?: { name?: string };
  debtor_account?: AccountIdentification;
  bank_transaction_code?: {
    description?: string;
    code?: string;
    sub_code?: string;
  };
  credit_debit_indicator: "CRDT" | "DBIT";
  status: TransactionStatus;
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  balance_after_transaction?: AmountType;
  reference_number?: string;
  remittance_information?: string[];
  exchange_rate?: {
    unit_currency?: string;
    exchange_rate?: string;
    rate_type?: string;
    instructed_amount?: AmountType;
  };
  note?: string;
  transaction_id?: string | null;
};

export type StartAuthorizationRequest = {
  access: {
    valid_until: string;
  };
  aspsp: {
    name: string;
    country: string;
  };
  state: string;
  redirect_url: string;
  psu_type?: "personal" | "business";
  psu_id?: string;
};

export type StartAuthorizationResponse = {
  url: string;
  authorization_id: string;
  psu_id_hash: string;
};

export type AuthorizeSessionResponse = {
  session_id: string;
  accounts?: AccountResource[];
  aspsp: ASPSP;
  psu_type: "personal" | "business";
  access: { valid_until: string };
};

export type GetSessionResponse = {
  status: string;
  accounts: string[];
  accounts_data: { uid: string; identification_hash: string }[];
  aspsp: ASPSP;
  psu_type: "personal" | "business";
  access: { valid_until: string };
  created: string;
  authorized?: string;
  closed?: string;
};

export type ConnectionState = {
  userId: string;
  institutionId: number;
};
