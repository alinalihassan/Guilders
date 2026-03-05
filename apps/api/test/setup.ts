import { vi } from "vitest";
/**
 * Polyfill for agents/partyserver: they reference WebSocket at load time.
 * Node has no global WebSocket. vitest-websocket-mock (via mock-socket) patches
 * the global when a WS server is created.
 */
import { WS } from "vitest-websocket-mock";

import { currency } from "../src/db/schema/currencies";
import { createDb, initPgliteDb } from "../src/lib/db";

const _mcpWebSocketPolyfill = new WS("ws://localhost:1");
void _mcpWebSocketPolyfill;

vi.mock("stripe", () => {
  const mockCustomers = {
    search: vi.fn().mockResolvedValue({ data: [] }),
    list: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.resolve({ done: true, value: undefined }),
      }),
    }),
    create: vi.fn().mockResolvedValue({
      id: "cus_test_mock",
      object: "customer",
      email: "test@guilders.test",
      metadata: {},
    }),
    retrieve: vi.fn().mockResolvedValue({
      id: "cus_test_mock",
      object: "customer",
    }),
    update: vi.fn().mockResolvedValue({
      id: "cus_test_mock",
      object: "customer",
    }),
  };

  const mockSubscriptions = {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ id: "sub_test_mock" }),
    retrieve: vi.fn().mockResolvedValue({ id: "sub_test_mock", status: "active" }),
    cancel: vi.fn().mockResolvedValue({ id: "sub_test_mock", status: "canceled" }),
  };

  class MockStripe {
    customers = mockCustomers;
    subscriptions = mockSubscriptions;
    checkout = {
      sessions: {
        create: vi
          .fn()
          .mockResolvedValue({ id: "cs_test_mock", url: "https://checkout.stripe.com/test" }),
      },
    };
    billingPortal = {
      sessions: {
        create: vi
          .fn()
          .mockResolvedValue({ id: "bps_test_mock", url: "https://billing.stripe.com/test" }),
      },
    };
    webhooks = {
      constructEvent: vi.fn(),
    };
  }

  return {
    Stripe: MockStripe,
    default: MockStripe,
  };
});

vi.mock("resend", () => {
  class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ id: "email_test_mock" }),
    };
  }
  return { Resend: MockResend };
});

await initPgliteDb();

const db = createDb();
await db
  .insert(currency)
  .values([
    { code: "EUR", name: "Euro" },
    { code: "USD", name: "US Dollar" },
    { code: "GBP", name: "British Pound" },
  ])
  .onConflictDoNothing();
