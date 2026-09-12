import { createDb } from "../src/lib/db";
import { pullSnapTradeConnectionHoldings } from "../src/lib/snaptrade-holdings";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: bun --env-file=.env scripts/sync-snaptrade-holdings.ts <userId>");
  process.exit(1);
}

const db = createDb();
const connections = await db.query.institutionConnection.findMany({
  with: {
    providerConnection: true,
    institution: { with: { provider: true } },
  },
});

const snaptradeConnections = connections.filter(
  (row) =>
    row.providerConnection?.user_id === userId &&
    row.institution?.provider?.name === "SnapTrade" &&
    row.connection_id &&
    row.institution.provider_institution_id,
);

if (snaptradeConnections.length === 0) {
  console.error("No SnapTrade institution connections found for", userId);
  process.exit(1);
}

for (const row of snaptradeConnections) {
  console.log("Pulling SnapTrade holdings", {
    userId,
    connectionId: row.connection_id,
    brokerageId: row.institution!.provider_institution_id,
  });
  await pullSnapTradeConnectionHoldings({
    userId,
    brokerageId: row.institution!.provider_institution_id,
    brokerageAuthorizationId: row.connection_id!,
  });
}

console.log("Done");
