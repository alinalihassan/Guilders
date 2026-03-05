/**
 * Minimal stub for `cloudflare:workers`.
 * Only R2 bucket, Queue, and runtime-specific classes are stubbed.
 * Everything else (DB, auth, routes) runs for real.
 */

export class DurableObject {
  ctx: unknown;
  env: unknown;
  constructor(ctx?: unknown, env?: unknown) {
    this.ctx = ctx;
    this.env = env;
  }
}

export class WorkflowEntrypoint {
  ctx: unknown;
  env: unknown;
  constructor(ctx?: unknown, env?: unknown) {
    this.ctx = ctx;
    this.env = env;
  }
}

export const env = {
  USER_BUCKET: {
    put: async () => undefined,
    get: async () => null,
    delete: async () => undefined,
    list: async () => ({ objects: [], truncated: false, cursor: undefined }),
    head: async () => null,
  },
  WEBHOOK_QUEUE: {
    send: async () => undefined,
    sendBatch: async () => undefined,
  },
};

export function waitUntil(promise: Promise<unknown>): void {
  promise.catch(() => {});
}
