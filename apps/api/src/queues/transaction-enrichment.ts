import { enrichTransactions } from "../lib/transaction-enrichment";
import type { TransactionEnrichmentPayload } from "./types";

const TRANSACTION_ENRICHMENT_QUEUE_NAME = "guilders-transaction-enrichment";

const enrichmentEnv = (env: Env) => ({
  CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_AI_GATEWAY: env.CLOUDFLARE_AI_GATEWAY,
  CLOUDFLARE_AI_GATEWAY_TOKEN: env.CLOUDFLARE_AI_GATEWAY_TOKEN,
});

/** Group messages by userId, then process each user's batch in parallel with batched LLM calls. */
export async function handleTransactionEnrichmentQueue(
  batch: MessageBatch<TransactionEnrichmentPayload>,
  env: Env,
): Promise<void> {
  type QueueMessage = (typeof batch.messages)[number];
  const byUser = new Map<string, { transactionIds: number[]; messages: QueueMessage[] }>();
  for (const message of batch.messages) {
    const { transactionId, userId } = message.body;
    let group = byUser.get(userId);
    if (!group) {
      group = { transactionIds: [], messages: [] };
      byUser.set(userId, group);
    }
    group.transactionIds.push(transactionId);
    group.messages.push(message);
  }

  const results = await Promise.allSettled(
    [...byUser.entries()].map(async ([userId, { transactionIds, messages }]) => {
      try {
        await enrichTransactions(transactionIds, enrichmentEnv(env));
        for (const m of messages) m.ack();
      } catch (error) {
        console.error("[Transaction enrichment queue] failed", { userId, transactionIds, error });
        for (const m of messages) m.retry();
      }
    }),
  );

  for (const r of results) {
    if (r.status === "rejected")
      console.error("[Transaction enrichment queue] unexpected rejection", r.reason);
  }
}

export { TRANSACTION_ENRICHMENT_QUEUE_NAME };
