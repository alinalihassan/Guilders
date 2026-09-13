import { eq } from "drizzle-orm";

import { providerConnection } from "../../db/schema/provider-connections";
import { createDb, type Database } from "../../lib/db";
import type {
  AccountParams,
  ConnectionParams,
  ConnectResult,
  DeregisterUserResult,
  IProvider,
  ProviderAccount,
  ProviderInstitution,
  ProviderName,
  ProviderTransaction,
  RefreshConnectionResult,
  RegisterUserResult,
  TransactionParams,
} from "../types";
import { getSnapTradeClient } from "./client";

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown; data?: unknown };
    cause?: { status?: unknown; response?: { status?: unknown } };
    message?: unknown;
  };

  if (typeof candidate.response?.status === "number") return candidate.response.status;
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.cause?.response?.status === "number") return candidate.cause.response.status;
  if (typeof candidate.cause?.status === "number") return candidate.cause.status;

  if (typeof candidate.message === "string") {
    const match = candidate.message.match(/status code (\d+)/i);
    if (match) return Number(match[1]);
  }

  return undefined;
}

function getResponseDetail(data: unknown): string | undefined {
  if (typeof data === "string" && data.length > 0) return data;
  if (typeof data !== "object" || data === null) return undefined;

  for (const key of ["message", "detail", "error"] as const) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return undefined;
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      response?: {
        status?: number;
        data?: unknown;
      };
      message?: string;
    };

    const status = maybeError.response?.status;
    const detail = getResponseDetail(maybeError.response?.data);
    if (detail) {
      return status ? `SnapTrade error ${status}: ${detail}` : `SnapTrade error: ${detail}`;
    }

    if (maybeError.message) return maybeError.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isStaleSnapTradeUserError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 401 || status === 403) return true;
  const message = getErrorMessage(error, "").toLowerCase();
  return (
    message.includes("usersecret") ||
    message.includes("user not found") ||
    message.includes("status code 401")
  );
}

export class SnapTradeProvider implements IProvider {
  readonly name: ProviderName = "SnapTrade";
  readonly enabled = true;

  async getInstitutions(): Promise<ProviderInstitution[]> {
    const client = getSnapTradeClient();
    if (!client) return [];
    const brokerages = await client.referenceData.listAllBrokerages();

    return brokerages.data
      .filter(
        (
          institution,
        ): institution is typeof institution & {
          id: string;
          name: string;
          aws_s3_square_logo_url: string;
          enabled: boolean;
        } =>
          Boolean(
            institution.id &&
            institution.name &&
            institution.aws_s3_square_logo_url &&
            institution.enabled,
          ),
      )
      .map((institution) => ({
        provider_institution_id: institution.id,
        name: institution.name,
        logo_url: institution.aws_s3_square_logo_url,
        enabled: institution.enabled && this.enabled,
        country: null,
      }));
  }

  async registerUser(userId: string): Promise<RegisterUserResult> {
    const client = getSnapTradeClient();
    if (!client) return { success: false, error: "SnapTrade is not configured." };
    try {
      const response = await client.authentication.registerSnapTradeUser({
        userId,
      });

      if (
        !response ||
        response.status !== 200 ||
        !response.data ||
        !response.data.userId ||
        !response.data.userSecret
      ) {
        return { success: false, error: "Failed to register user" };
      }

      return {
        success: true,
        data: {
          userId: response.data.userId,
          userSecret: response.data.userSecret,
        },
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to register user");
      console.error("[SnapTrade] registerUser failed", { userId, message });
      return { success: false, error: message };
    }
  }

  async deregisterUser(
    userId: string,
    _options?: { userSecret?: string; connectionIds?: string[] },
  ): Promise<DeregisterUserResult> {
    const client = getSnapTradeClient();
    if (!client) return { success: false, error: "SnapTrade is not configured." };
    try {
      const response = await client.authentication.deleteSnapTradeUser({
        userId,
      });
      if (!response || response.status !== 200) {
        return { success: false, error: "Failed to deregister user" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Failed to deregister user" };
    }
  }

  private async registerAndStoreSecret(
    db: Database,
    providerId: number,
    userId: string,
    options?: { resetRemote?: boolean },
  ): Promise<{ success: true; userSecret: string } | { success: false; error: string }> {
    if (options?.resetRemote) {
      await this.deregisterUser(userId);
    }

    let result = await this.registerUser(userId);
    if (!result.success || !result.data?.userSecret) {
      await this.deregisterUser(userId);
      result = await this.registerUser(userId);
    }

    if (!result.success || !result.data?.userSecret) {
      return {
        success: false,
        error: result.error || "Failed to register user with provider",
      };
    }

    const userSecret = result.data.userSecret;
    const existing = await db.query.providerConnection.findFirst({
      where: { provider_id: providerId, user_id: userId },
    });

    if (existing) {
      await db
        .update(providerConnection)
        .set({ secret: userSecret, updated_at: new Date() })
        .where(eq(providerConnection.id, existing.id));
    } else {
      await db.insert(providerConnection).values({
        provider_id: providerId,
        user_id: userId,
        secret: userSecret,
      });
    }

    return { success: true, userSecret };
  }

  async connect(params: ConnectionParams): Promise<ConnectResult> {
    const client = getSnapTradeClient();
    if (!client) return { success: false, error: "SnapTrade is not configured." };
    const db = createDb();
    try {
      const providerRecord = await db.query.provider.findFirst({
        where: { name: this.name },
      });
      if (!providerRecord) return { success: false, error: "Provider not found" };

      const providerConn = await db.query.providerConnection.findFirst({
        where: {
          provider_id: providerRecord.id,
          user_id: params.userId,
        },
      });

      let userSecret = providerConn?.secret;

      if (!userSecret) {
        const stored = await this.registerAndStoreSecret(db, providerRecord.id, params.userId);
        if (!stored.success) return stored;
        userSecret = stored.userSecret;
      }

      const institutionRecord = await db.query.institution.findFirst({
        where: { id: params.institutionId },
      });
      if (!institutionRecord) {
        return { success: false, error: "Institution not found" };
      }

      const brokerages = await client.referenceData.listAllBrokerages();
      const brokerage = brokerages.data.find(
        (item) => item.id === institutionRecord.provider_institution_id,
      );

      if (!brokerage?.slug) {
        return { success: false, error: "Institution not found" };
      }

      let response;
      try {
        response = await client.authentication.loginSnapTradeUser({
          userId: params.userId,
          userSecret,
          broker: brokerage.slug,
          reconnect: params.connectionId,
        });
      } catch (error) {
        if (!isStaleSnapTradeUserError(error)) throw error;

        console.warn("[SnapTrade] stale user secret, re-registering", {
          userId: params.userId,
        });
        const stored = await this.registerAndStoreSecret(db, providerRecord.id, params.userId, {
          resetRemote: true,
        });
        if (!stored.success) return stored;

        response = await client.authentication.loginSnapTradeUser({
          userId: params.userId,
          userSecret: stored.userSecret,
          broker: brokerage.slug,
          reconnect: params.connectionId,
        });
      }

      if (!response.data || !("redirectURI" in response.data) || !response.data.redirectURI) {
        return { success: false, error: "Failed to generate redirect URL" };
      }

      return {
        success: true,
        data: {
          redirectURI: response.data.redirectURI,
          type: "popup",
        },
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to connect");
      console.error("[SnapTrade] connect failed", {
        userId: params.userId,
        institutionId: params.institutionId,
        message,
      });
      return {
        success: false,
        error: message,
      };
    }
  }

  async reconnect(params: ConnectionParams): Promise<ConnectResult> {
    return this.connect(params);
  }

  async refreshConnection(connectionId: string): Promise<RefreshConnectionResult> {
    const client = getSnapTradeClient();
    if (!client) return { success: false, error: "SnapTrade is not configured." };
    const db = createDb();

    try {
      const instConn = await db.query.institutionConnection.findFirst({
        where: { connection_id: connectionId },
        with: {
          providerConnection: true,
          institution: true,
        },
      });
      if (!instConn?.providerConnection?.secret || !instConn.institution) {
        return { success: false, error: "Connection not found" };
      }

      const brokerages = await client.referenceData.listAllBrokerages();
      const brokerage = brokerages.data.find(
        (item) => item.id === instConn.institution!.provider_institution_id,
      );

      if (!brokerage?.slug) {
        return { success: false, error: "Brokerage not found" };
      }

      const response = await client.authentication.loginSnapTradeUser({
        userId: instConn.providerConnection.user_id,
        userSecret: instConn.providerConnection.secret,
        broker: brokerage.slug,
        reconnect: connectionId,
      });

      if (!response.data || !("redirectURI" in response.data) || !response.data.redirectURI) {
        return { success: false, error: "Failed to generate redirect URL" };
      }

      return {
        success: true,
        data: {
          redirectURI: response.data.redirectURI,
          type: "popup",
        },
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to refresh SnapTrade connection");
      console.error("[SnapTrade] refreshConnection failed", {
        connectionId,
        message,
      });
      return {
        success: false,
        error: message,
      };
    }
  }

  async getAccounts(_params: AccountParams): Promise<ProviderAccount[]> {
    throw new Error(
      "SnapTrade is a brokerage connector — accounts and holdings are synced via webhooks, not pulled through getAccounts",
    );
  }

  async getTransactions(_params: TransactionParams): Promise<ProviderTransaction[]> {
    throw new Error(
      "SnapTrade is a brokerage connector — it does not expose traditional transactions. Holdings are synced via webhooks.",
    );
  }
}
