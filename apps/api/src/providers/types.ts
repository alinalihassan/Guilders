import type { InsertAccount } from "../db/schema/accounts";
import type { InsertTransaction } from "../db/schema/transactions";

export type ProviderName = "SaltEdge" | "SnapTrade";

export type ProviderInstitution = {
  name: string;
  logo_url: string;
  provider_institution_id: string;
  enabled: boolean;
  country: string | null;
};

export type ConnectionParams = {
  userId: string;
  institutionId: number;
  connectionId?: string;
};

export type AccountParams = {
  userId: string;
  connectionId: number;
};

export type TransactionParams = {
  accountId: string;
};

export type ProviderAccount = InsertAccount & {
  user_id: string;
};

export type ConnectResult = {
  success: boolean;
  error?: string;
  data?: {
    redirectURI: string;
    type: "redirect" | "popup";
  };
};

export type RegisterUserResult = {
  success: boolean;
  error?: string;
  data?: {
    userId: string;
    userSecret: string;
  };
};

export type DeregisterUserResult = {
  success: boolean;
  error?: string;
};

export type RefreshConnectionResult = {
  success: boolean;
  error?: string;
};

export interface IProvider {
  readonly name: ProviderName;
  readonly enabled: boolean;
  getInstitutions(): Promise<ProviderInstitution[]>;
  registerUser(userId: string): Promise<RegisterUserResult>;
  deregisterUser(userId: string): Promise<DeregisterUserResult>;
  connect(params: ConnectionParams): Promise<ConnectResult>;
  reconnect(params: ConnectionParams): Promise<ConnectResult>;
  refreshConnection(connectionId: string): Promise<RefreshConnectionResult>;
  getAccounts(params: AccountParams): Promise<ProviderAccount[]>;
  getTransactions(params: TransactionParams): Promise<InsertTransaction[]>;
}
