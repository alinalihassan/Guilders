/** Public origin for provider OAuth/connect redirects. Local Wrangler is not reachable from banks. */
export function getProviderCallbackBaseUrl(): string | undefined {
  if (process.env.NODE_ENV === "development") {
    return process.env.DEV_TUNNEL_URL;
  }
  return process.env.BACKEND_URL;
}
