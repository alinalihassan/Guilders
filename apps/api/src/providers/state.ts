export type ConnectionState = {
  userId: string;
  institutionId: number;
};

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (b64.length % 4)) % 4;
  return atob(b64 + "=".repeat(padding));
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signState(state: ConnectionState, secret: string): Promise<string> {
  const payload = toBase64Url(JSON.stringify(state));
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${sigHex}`;
}

export async function verifyState(
  stateParam: string,
  secret: string,
): Promise<ConnectionState | null> {
  const dotIdx = stateParam.indexOf(".");
  if (dotIdx === -1) return null;

  const payload = stateParam.slice(0, dotIdx);
  const sigHex = stateParam.slice(dotIdx + 1);
  if (!payload || !sigHex || sigHex.length !== 64) return null;

  const key = await getHmacKey(secret);
  const sigBytes = new Uint8Array((sigHex.match(/.{2}/g) ?? []).map((h) => Number.parseInt(h, 16)));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;

  try {
    const state = JSON.parse(fromBase64Url(payload)) as ConnectionState;
    if (!state.userId || !state.institutionId) return null;
    return state;
  } catch {
    return null;
  }
}
