export type TellerInstitution = {
  id: string;
  name: string;
  products: string[];
};

export type TellerAccountType = "depository" | "credit";

export type TellerAccountSubtype =
  | "checking"
  | "savings"
  | "money_market"
  | "certificate_of_deposit"
  | "treasury"
  | "sweep"
  | "credit_card";

export type TellerAccountStatus = "open" | "closed";

export type TellerAccount = {
  id: string;
  enrollment_id: string;
  institution: {
    id: string;
    name: string;
  };
  currency: string;
  name: string;
  last_four: string;
  status: TellerAccountStatus;
  type: TellerAccountType;
  subtype: TellerAccountSubtype;
  links: {
    self: string;
    details?: string;
    balances?: string;
    transactions?: string;
  };
};

export type TellerBalance = {
  account_id: string;
  ledger: string | null;
  available: string | null;
  links: {
    self: string;
    account: string;
  };
};

export type TellerTransactionStatus = "posted" | "pending";

export type TellerTransactionType =
  | "card_payment"
  | "ach"
  | "transfer"
  | "wire"
  | "atm"
  | "check"
  | "digital_payment"
  | "interest"
  | "fee"
  | "other";

export type TellerTransactionDetails = {
  category: string;
  counterparty: {
    name: string;
    type: "organization" | "person";
  };
  processing_status: "pending" | "complete";
};

export type TellerTransaction = {
  id: string;
  account_id: string;
  amount: string;
  date: string;
  description: string;
  status: TellerTransactionStatus;
  type: TellerTransactionType;
  running_balance: string | null;
  details: TellerTransactionDetails;
  links: {
    self: string;
    account: string;
  };
};
