import { $ } from "bun";

const sql = process.argv.slice(2).join(" ").trim();
if (!sql) {
  console.error('Usage: bun run db:query -- "SELECT id, email FROM \\"user\\" LIMIT 10"');
  process.exit(1);
}

const result =
  await $`docker exec -i guilders-postgres psql -U postgres -d guilders -P pager=off -c ${sql}`.nothrow();

if (result.exitCode !== 0) {
  console.error(result.stderr.toString() || "psql failed. Is docker compose up?");
  process.exit(result.exitCode ?? 1);
}

process.stdout.write(result.stdout);
