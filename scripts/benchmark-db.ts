import { eq, sql } from "drizzle-orm";
import { asset } from "../src/db/schema/assets";
import { country } from "../src/db/schema/countries";
import { currency } from "../src/db/schema/currencies";
import { AccountSubtypeEnum, AccountTypeEnum } from "../src/db/schema/enums";
import { db } from "../src/lib/db";

interface BenchmarkResult {
  operation: string;
  durationMs: number;
  rowsAffected: number;
}

function benchmark(
  name: string,
  fn: () => Promise<number>,
): Promise<BenchmarkResult> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    const rowsAffected = await fn();
    const durationMs = performance.now() - start;
    resolve({ operation: name, durationMs, rowsAffected });
  });
}

async function setupTestData() {
  const existingCurrency = await db
    .select()
    .from(currency)
    .where(eq(currency.code, "USD"));

  if (existingCurrency.length === 0) {
    await db
      .insert(country)
      .values({
        code: "US",
        name: "United States",
      })
      .onConflictDoNothing();

    await db
      .insert(currency)
      .values({
        code: "USD",
        country: "US",
        name: "US Dollar",
      })
      .onConflictDoNothing();

    console.log("✓ Setup: Created USD currency\n");
  } else {
    console.log("✓ Setup: USD currency already exists\n");
  }
}

async function runBenchmarks() {
  const results: BenchmarkResult[] = [];
  const testUserId = `benchmark_test_${Date.now()}`;
  const createdAssetIds: number[] = [];

  console.log("Starting database performance benchmarks...\n");

  await setupTestData();

  const insertResult = await benchmark("Single INSERT", async () => {
    const result = await db
      .insert(asset)
      .values({
        name: "Benchmark Asset",
        user_id: testUserId,
        type: AccountTypeEnum.asset,
        subtype: AccountSubtypeEnum.depository,
        value: "1000.00",
        currency: "USD",
      })
      .returning({ id: asset.id });

    createdAssetIds.push(result[0].id);
    return 1;
  });
  results.push(insertResult);

  const bulkInsertResult = await benchmark(
    "Bulk INSERT (100 rows)",
    async () => {
      const values = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk Asset ${i}`,
        user_id: testUserId,
        type: AccountTypeEnum.asset,
        subtype: AccountSubtypeEnum.depository,
        value: `${1000 + i}.00`,
        currency: "USD",
      }));

      const result = await db
        .insert(asset)
        .values(values)
        .returning({ id: asset.id });
      result.forEach((r) => createdAssetIds.push(r.id));
      return result.length;
    },
  );
  results.push(bulkInsertResult);

  const selectByUserResult = await benchmark(
    "SELECT by user_id (indexed)",
    async () => {
      const result = await db
        .select()
        .from(asset)
        .where(eq(asset.user_id, testUserId));
      return result.length;
    },
  );
  results.push(selectByUserResult);

  if (createdAssetIds.length > 0) {
    const selectByIdResult = await benchmark("SELECT by id (PK)", async () => {
      const result = await db
        .select()
        .from(asset)
        .where(eq(asset.id, createdAssetIds[0]));
      return result.length;
    });
    results.push(selectByIdResult);
  }

  const selectAllResult = await benchmark(
    "SELECT all (LIMIT 100)",
    async () => {
      const result = await db.select().from(asset).limit(100);
      return result.length;
    },
  );
  results.push(selectAllResult);

  if (createdAssetIds.length > 0) {
    const updateResult = await benchmark("UPDATE single row", async () => {
      await db
        .update(asset)
        .set({ value: "9999.99", updated_at: new Date() })
        .where(eq(asset.id, createdAssetIds[0]));
      return 1;
    });
    results.push(updateResult);
  }

  const updateBulkResult = await benchmark(
    "UPDATE multiple rows (100)",
    async () => {
      await db
        .update(asset)
        .set({ value: "5000.00", updated_at: new Date() })
        .where(eq(asset.user_id, testUserId));
      return 1;
    },
  );
  results.push(updateBulkResult);

  const countResult = await benchmark("COUNT query", async () => {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(asset);
    return result[0].count;
  });
  results.push(countResult);

  const complexQueryResult = await benchmark(
    "Complex query (user + type)",
    async () => {
      const result = await db
        .select()
        .from(asset)
        .where(
          sql`${asset.user_id} = ${testUserId} AND ${asset.type} = 'asset'`,
        )
        .limit(50);
      return result.length;
    },
  );
  results.push(complexQueryResult);

  const deleteResult = await benchmark("DELETE test data", async () => {
    await db.delete(asset).where(eq(asset.user_id, testUserId));
    return createdAssetIds.length;
  });
  results.push(deleteResult);

  console.log("=".repeat(60));
  console.log("BENCHMARK RESULTS");
  console.log("=".repeat(60));

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.operation}`);
    console.log(`   Duration: ${result.durationMs.toFixed(2)}ms`);
    console.log(`   Rows: ${result.rowsAffected}`);
    console.log(
      `   Throughput: ${(result.rowsAffected / (result.durationMs / 1000)).toFixed(2)} rows/sec`,
    );
    console.log();
  });

  const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0);
  const avgTime = totalTime / results.length;

  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average operation time: ${avgTime.toFixed(2)}ms`);
  console.log(`Total test rows created: ${createdAssetIds.length}`);
}

runBenchmarks().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
