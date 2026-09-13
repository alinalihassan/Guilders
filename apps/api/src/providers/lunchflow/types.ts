export const LUNCHFLOW_BASE_URL = "https://lunchflow.app/api/v1";

export type LunchFlowAccount = {
  id: number;
  name: string;
  institution_name: string;
  institution_logo?: string | null;
  provider: string;
  currency?: string | null;
  status?: string | null;
  connection_id?: number | null;
};

export type LunchFlowBalance = {
  amount: string;
  currency?: string;
};

export type LunchFlowTransaction = {
  id: string;
  account_id?: number;
  amount: number;
  currency?: string;
  date: string;
  merchant?: string;
  description?: string;
  category?: string;
  pending?: boolean;
};
