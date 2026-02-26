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

const getApiOrigin = () => {
  const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000/api/auth";
  return authBaseUrl.replace(/\/api\/auth\/?$/, "");
};

export const verifyMcpRequest = async (
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
): Promise<{ userId: string }> => {
  const requestHeaders = normalizeHeaders(headers);
  const authHeader =
    requestHeaders.authorization ??
    requestHeaders["x-forwarded-authorization"] ??
    requestHeaders["x-mcp-authorization"];

  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!accessToken) {
    throw new Error("missing authorization header");
  }

  const userInfoResponse = await fetch(`${getApiOrigin()}/api/auth/oauth2/userinfo`, {
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

  return {
    userId: userInfo.sub,
  };
};
