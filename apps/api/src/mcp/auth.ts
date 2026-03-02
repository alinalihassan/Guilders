import { env } from "cloudflare:workers";
import { decodeJwt } from "jose";

const normalizeHeaders = (
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
): Record<string, string> => {
  const normalized: Record<string, string> = {};

  if (!headers) {
    return normalized;
  }

  if (headers instanceof Headers) {
    for (const [key, value] of headers.entries()) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      normalized[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(", ");
    }
  }

  return normalized;
};

/**
 * Extracts OAuth scopes from a JWT access token.
 * Returns null on decode failure (e.g. opaque token) so callers can enforce a
 * restrictive default (read-only) instead of granting all tools.
 */
const extractScopesFromToken = (token: string): string[] | null => {
  try {
    const payload = decodeJwt(token);
    if (typeof payload.scope === "string") {
      return payload.scope.split(" ").filter(Boolean);
    }
    // Decoded but no scope claim → treat as no explicit scopes (read-only default)
    return [];
  } catch {
    // Opaque token or decode error — scope unknown; callers must use restrictive default
    return null;
  }
};

export const verifyMcpRequest = async (
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
): Promise<{ userId: string; scopes: string[] | null }> => {
  const requestHeaders = normalizeHeaders(headers);
  const authHeader =
    requestHeaders.authorization ??
    requestHeaders["x-forwarded-authorization"] ??
    requestHeaders["x-mcp-authorization"];

  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!accessToken) {
    throw new Error("missing authorization header");
  }

  const userInfoResponse = await fetch(`${env.BACKEND_URL}/api/auth/oauth2/userinfo`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error("Unauthorized");
  }

  const userInfo = (await userInfoResponse.json()) as { sub?: string } | null;
  if (!userInfo?.sub) {
    throw new Error("Unauthorized: access token missing subject.");
  }

  const scopes = extractScopesFromToken(accessToken);

  return {
    userId: userInfo.sub,
    scopes,
  };
};
