import { providerConnection } from "../../db/schema/provider-connections";
import type { InsertTransaction } from "../../db/schema/transactions";
import { createDb } from "../../lib/db";
import type {
  AccountParams,
  ConnectionParams,
  ConnectResult,
  DeregisterUserResult,
  IProvider,
  ProviderAccount,
  ProviderInstitution,
  ProviderName,
  RefreshConnectionResult,
  RegisterUserResult,
  TransactionParams,
} from "../types";
import { getSnapTradeClient } from "./client";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      response?: {
        status?: number;
        data?: unknown;
      };
      message?: string;
    };

    const status = maybeError.response?.status;
    const responseData = maybeError.response?.data;

    if (typeof responseData === "string")
      return status
        ? `SnapTrade error ${status}: ${responseData}`
        : `SnapTrade error: ${responseData}`;

    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof (responseData as { message?: unknown }).message === "string"
    ) {
      const message = (responseData as { message: string }).message;
      return status ? `SnapTrade error ${status}: ${message}` : `SnapTrade error: ${message}`;
    }

    if (maybeError.message) return maybeError.message;
  }

  return fallback;
}

export class SnapTradeProvider implements IProvider {
  readonly name: ProviderName = "SnapTrade";
  readonly enabled = true;

  async getInstitutions(): Promise<ProviderInstitution[]> {
    const client = getSnapTradeClient();
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

  async deregisterUser(userId: string): Promise<DeregisterUserResult> {
    const client = getSnapTradeClient();
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

  async connect(params: ConnectionParams): Promise<ConnectResult> {
    const client = getSnapTradeClient();
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
        const registerResult = await this.registerUser(params.userId);
        if (!registerResult.success || !registerResult.data?.userSecret) {
          return {
            success: false,
            error: registerResult.error || "Failed to register user with provider",
          };
        }

        await db.insert(providerConnection).values({
          provider_id: providerRecord.id,
          user_id: params.userId,
          secret: registerResult.data.userSecret,
        });

        userSecret = registerResult.data.userSecret;
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

      const response = await client.authentication.loginSnapTradeUser({
        userId: params.userId,
        userSecret,
        broker: brokerage.slug,
        reconnect: params.connectionId,
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
    const db = createDb();

    try {
      const connection = await db.query.institutionConnection.findFirst({
        where: { connection_id: connectionId },
        with: {
          providerConnection: true,
        },
      });
      if (!connection?.providerConnection?.secret) {
        return { success: false, error: "Provider connection not found" };
      }

      const response = await client.connections.refreshBrokerageAuthorization({
        authorizationId: connectionId,
        userId: connection.providerConnection.user_id,
        userSecret: connection.providerConnection.secret,
      });

      if (response.status !== 200) {
        return {
          success: false,
          error: "Failed to refresh SnapTrade connection",
        };
      }

      return { success: true };
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
    throw new Error("Not implemented");
  }

  async getTransactions(_params: TransactionParams): Promise<InsertTransaction[]> {
    throw new Error("Not implemented");
  }
}
