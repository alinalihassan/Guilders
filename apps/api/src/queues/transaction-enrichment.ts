import { enrichTransaction } from "../lib/transaction-enrichment";
import type { TransactionEnrichmentPayload } from "./types";

const TRANSACTION_ENRICHMENT_QUEUE_NAME = "guilders-transaction-enrichment";

export async function handleTransactionEnrichmentQueue(
  batch: MessageBatch<TransactionEnrichmentPayload>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const { transactionId, userId } = message.body;
      await enrichTransaction(transactionId, {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_AI_GATEWAY: env.CLOUDFLARE_AI_GATEWAY,
        CLOUDFLARE_AI_GATEWAY_TOKEN: env.CLOUDFLARE_AI_GATEWAY_TOKEN,
      });
      message.ack();
    } catch (error) {
      console.error("[Transaction enrichment queue] failed", {
        transactionId: message.body.transactionId,
        error,
      });
      message.retry();
    }
  }
}

export { TRANSACTION_ENRICHMENT_QUEUE_NAME };
