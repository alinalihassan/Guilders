/** Pin current node-postgres TLS behavior before pg v9 weakens `require`. */
export function withVerifyFullSsl(url: string): string {
  return url.replace(/([?&])sslmode=(prefer|require|verify-ca)\b/i, "$1sslmode=verify-full");
}
