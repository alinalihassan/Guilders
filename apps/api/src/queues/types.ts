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

// --- SaltEdge ---

export type SaltEdgeCallbackStage =
  | "connect"
  | "fetch_holder_info"
  | "fetch_accounts"
  | "fetch_transactions"
  | "finish";

export type SaltEdgeWebhookPayload = {
  connectionId: string;
  customerId: string;
  stage?: SaltEdgeCallbackStage;
  errorClass?: string;
  errorMessage?: string;
  customFields?: Record<string, string>;
};

export type SaltEdgeWebhookEvent = {
  source: "saltedge";
  eventType: "success" | "failure" | "destroy";
  payload: SaltEdgeWebhookPayload;
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
  | SaltEdgeWebhookEvent
  | ProviderUserCleanupEvent
  | UserFilesCleanupEvent;
