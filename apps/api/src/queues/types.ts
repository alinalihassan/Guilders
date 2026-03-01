import type { ProviderName } from "../providers/types";

// --- SnapTrade ---

export type SnapTradeEventType =
  | "CONNECTION_ADDED"
  | "CONNECTION_DELETED"
  | "CONNECTION_BROKEN"
  | "CONNECTION_FIXED"
  | "NEW_ACCOUNT_AVAILABLE"
  | "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE"
  | "ACCOUNT_TRANSACTIONS_UPDATED"
  | "ACCOUNT_HOLDINGS_UPDATED"
  | "ACCOUNT_REMOVED";

export type SnapTradeWebhookPayload = {
  userId: string;
  brokerageId?: string;
  brokerageAuthorizationId?: string;
  accountId?: string;
};

export type SnapTradeWebhookEvent = {
  source: "snaptrade";
  eventType: SnapTradeEventType;
  payload: SnapTradeWebhookPayload;
};

// --- EnableBanking ---

export type EnableBankingEventType = "CONNECTION_CREATED";

export type EnableBankingWebhookPayload = {
  userId: string;
  institutionConnectionId: number;
};

export type EnableBankingWebhookEvent = {
  source: "enablebanking";
  eventType: EnableBankingEventType;
  payload: EnableBankingWebhookPayload;
};

// --- Teller ---

export type TellerEventType = "ENROLLMENT_CREATED" | "TRANSACTIONS_UPDATED" | "ENROLLMENT_DISCONNECTED";

export type TellerWebhookPayload = {
  userId: string;
  institutionConnectionId: number;
};

export type TellerWebhookEvent = {
  source: "teller";
  eventType: TellerEventType;
  payload: TellerWebhookPayload;
};

// --- Provider cleanup ---

export type ProviderUserCleanupEvent = {
  source: "provider-user-cleanup";
  eventType: "deregister-user";
  payload: {
    providerName: ProviderName;
    userId: string;
  };
};

export type UserFilesCleanupEvent = {
  source: "user-files-cleanup";
  eventType: "delete-user-files";
  payload: {
    userId: string;
  };
};

// --- Union ---

export type WebhookEvent =
  | SnapTradeWebhookEvent
  | EnableBankingWebhookEvent
  | TellerWebhookEvent
  | ProviderUserCleanupEvent
  | UserFilesCleanupEvent;
