import { sql } from "drizzle-orm";

import { rate } from "../db/schema/rates";
import { createDb } from "../lib/db";
import { getFrankfurter } from "../lib/frankfurter";

export async function syncExchangeRates() {
  const db = createDb();
  const frankfurter = getFrankfurter();
  const latest = await frankfurter.getLatestRates("EUR");

  const supportedCurrencies = await db.query.currency.findMany();
  const supportedCodes = new Set(supportedCurrencies.map((c) => c.code));

  const filteredRates = Object.entries(latest.rates)
    .filter(([code]) => supportedCodes.has(code))
    .map(([currency_code, rateValue]) => ({
      currency_code,
      date: latest.date,
      rate: rateValue.toString(),
    }));

  if (filteredRates.length === 0) {
    console.log("No supported currencies found in rates");
    return;
  }

  await db
    .insert(rate)
    .values(filteredRates)
    .onConflictDoUpdate({
      target: [rate.currency_code, rate.date],
      set: { rate: sql`excluded.rate` },
    });

  console.log(`Synced ${filteredRates.length} exchange rates for ${latest.date}`);
}
