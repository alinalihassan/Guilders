import { syncInstitutions } from "../src/cron/sync-institutions";

import { backfillRates } from "./backfill-rates";
import { seedCountries } from "./seed-countries";
import { seedCurrencies } from "./seed-currencies";
import { seedProviders } from "./seed-providers";

console.log("=== Initializing database ===\n");

console.log("1/5  Seeding currencies...");
await seedCurrencies();

console.log("\n2/5  Seeding countries...");
await seedCountries();

console.log("\n3/5  Seeding providers...");
await seedProviders();

console.log("\n4/5  Syncing institutions...");
await syncInstitutions();

console.log("\n5/5  Backfilling exchange rates...");
await backfillRates();

console.log("\n=== Database initialization complete ===");
