import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const TABLES_IN_ORDER = [
  "user",
  "session",
  "account",
  "verification",
  "plane_instances",
  "plane_modules",
  "plane_assignees",
  "user_usage_limits",
  "task_batches",
  "created_issues",
  "ai_usage_logs",
  "billing_invoices",
] as const;

function quoteTable(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function copyTable(
  source: postgres.Sql,
  dest: postgres.Sql,
  table: string,
) {
  const rows = await source.unsafe(`SELECT * FROM ${quoteTable(table)}`);
  if (!rows.length) {
    console.log(`  ${table}: 0 rows`);
    return 0;
  }

  await dest`INSERT INTO ${dest(table)} ${dest(rows)}`;
  console.log(`  ${table}: ${rows.length} rows`);
  return rows.length;
}

async function main() {
  const sourceUrl = process.env.NEON_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl) {
    throw new Error(
      "NEON_DATABASE_URL is required (your old Neon connection string).",
    );
  }
  if (!targetUrl) {
    throw new Error("DATABASE_URL is required (Railway target).");
  }

  if (sourceUrl === targetUrl) {
    throw new Error("NEON_DATABASE_URL and DATABASE_URL must be different.");
  }

  const source = postgres(sourceUrl, { prepare: false, max: 1 });
  const dest = postgres(targetUrl, { prepare: false, max: 1 });

  try {
    console.log("Checking Neon source...");
    const [{ count: sourceUsers }] = await source<{ count: string }[]>`
      SELECT count(*)::text AS count FROM "user"
    `;
    console.log(`Neon users: ${sourceUsers}`);

    console.log("Clearing Railway target tables...");
    const tableList = TABLES_IN_ORDER.map(quoteTable).join(", ");
    await dest.unsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

    console.log("Copying data...");
    let total = 0;
    for (const table of TABLES_IN_ORDER) {
      total += await copyTable(source, dest, table);
    }

    const [{ count: targetUsers }] = await dest<{ count: string }[]>`
      SELECT count(*)::text AS count FROM "user"
    `;
    console.log(`\nDone. Copied ${total} rows total. Railway users: ${targetUsers}`);
  } finally {
    await source.end({ timeout: 5 });
    await dest.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
