import { sql } from "drizzle-orm";

import { rate } from "../src/db/schema/rates";
import { createDb } from "../src/lib/db";
import { getFrankfurter } from "../src/lib/frankfurter";

const DEFAULT_START_DATE = "2000-01-01";
const CHUNK_DAYS = 365;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

export async function backfillRates(startDate = DEFAULT_START_DATE) {
  const db = createDb();
  const frankfurter = getFrankfurter();

  const supportedCurrencies = await db.query.currency.findMany();
  const supportedCodes = new Set(supportedCurrencies.map((c) => c.code));

  const today = toDateStr(new Date());
  let chunkStart = startDate;
  let totalInserted = 0;

  console.log(`Backfilling rates from ${startDate} to ${today}...`);

  while (chunkStart < today) {
    const chunkEnd =
      addDays(chunkStart, CHUNK_DAYS) < today ? addDays(chunkStart, CHUNK_DAYS) : today;

    console.log(`  Fetching ${chunkStart} .. ${chunkEnd}`);
    const timeseries = await frankfurter.getTimeseries(chunkStart, chunkEnd, "EUR");

    const rows: { currency_code: string; date: string; rate: string }[] = [];

    for (const [date, dayRates] of Object.entries(timeseries.rates)) {
      for (const [code, rateValue] of Object.entries(dayRates)) {
        if (supportedCodes.has(code)) {
          rows.push({ currency_code: code, date, rate: rateValue.toString() });
        }
      }
    }

    if (rows.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        await db
          .insert(rate)
          .values(batch)
          .onConflictDoUpdate({
            target: [rate.currency_code, rate.date],
            set: { rate: sql`excluded.rate` },
          });
      }
      totalInserted += rows.length;
      console.log(`  Inserted ${rows.length} rows`);
    }

    chunkStart = addDays(chunkEnd, 1);
  }

  console.log(`Done. ${totalInserted} total rate rows upserted.`);
}

if (import.meta.main) {
  backfillRates(process.argv[2]).catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}
