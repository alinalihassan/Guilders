import { backfillRates } from "./backfill-rates";
import { seedCountries } from "./seed-countries";
import { seedCurrencies } from "./seed-currencies";
import { seedProviders } from "./seed-providers";

console.log("=== Initializing database ===\n");

console.log("1/4  Seeding currencies...");
await seedCurrencies();

console.log("\n2/4  Seeding countries...");
await seedCountries();

console.log("\n3/4  Seeding providers...");
await seedProviders();

console.log("\n4/4  Backfilling exchange rates...");
await backfillRates();

console.log("\n=== Database initialization complete ===");
