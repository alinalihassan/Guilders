/**
 * Delete GoCardless requisitions (bank connections).
 *
 * Usage:
 *   bun --env-file=.env scripts/delete-gocardless-connections.ts --all
 *   bun --env-file=.env scripts/delete-gocardless-connections.ts <userId>
 *
 * --all   Delete every requisition for the configured GoCardless app.
 * <userId> Delete only requisitions whose reference decodes to this userId.
 */

import { GoCardlessClient } from "../src/providers/gocardless/client";
import { verifyState } from "../src/providers/state";

async function main() {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;
  const secret = process.env.GUILDERS_SECRET;

  if (!secretId || !secretKey) {
    console.error("Missing GOCARDLESS_SECRET_ID or GOCARDLESS_SECRET_KEY");
    process.exit(1);
  }

  const arg = process.argv[2];
  if (!arg) {
    console.error(
      "Usage: bun --env-file=.env scripts/delete-gocardless-connections.ts <userId> | --all",
    );
    process.exit(1);
  }

  const deleteAll = arg === "--all";
  const userId = deleteAll ? null : arg;

  if (!deleteAll && !secret) {
    console.error("GUILDERS_SECRET required when deleting by userId (to decode reference)");
    process.exit(1);
  }

  const client = new GoCardlessClient(secretId, secretKey);
  const res = await client.getRequisitions();
  const list = res.results ?? [];

  if (list.length === 0) {
    console.log("No GoCardless requisitions found.");
    return;
  }

  let toDelete: { id: string; reference: string }[] = [];

  if (deleteAll) {
    toDelete = list.map((r) => ({ id: r.id, reference: r.reference ?? "" }));
    console.log(`Found ${toDelete.length} requisition(s). Deleting all.`);
  } else {
    for (const r of list) {
      const ref = r.reference;
      if (!ref) continue;
      const state = await verifyState(ref, secret!);
      if (state?.userId === userId) toDelete.push({ id: r.id, reference: ref });
    }
    console.log(`Found ${toDelete.length} requisition(s) for userId ${userId}.`);
  }

  for (const { id, reference } of toDelete) {
    try {
      await client.deleteRequisition(id);
      console.log("Deleted:", id, reference ? `${reference.slice(0, 40)}...` : "");
    } catch (e) {
      console.error("Failed to delete", id, e);
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
