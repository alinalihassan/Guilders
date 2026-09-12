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
  EMAIL: {
    send: async () => ({ messageId: "email_test_mock" }),
  },
  CHAT_RATE_LIMITER: {
    idFromName: () => ({}),
    get: () => ({
      fetch: async () =>
        new Response(
          JSON.stringify({
            allowed: true,
            remaining: 500,
            used: 0,
            limit: 500,
            resetAt: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    }),
  },
};

const waitUntilPromises: Promise<unknown>[] = [];

export function waitUntil(promise: Promise<unknown>): void {
  waitUntilPromises.push(promise);
}

export async function flushWaitUntil(): Promise<void> {
  await Promise.all(waitUntilPromises.splice(0));
}
