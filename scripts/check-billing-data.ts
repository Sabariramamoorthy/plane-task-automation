import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const logs = await sql`
    SELECT id, user_id, estimated_tokens, estimated_cost_usd, created_at
    FROM ai_usage_logs
    ORDER BY created_at DESC
  `;
  console.log("ai_usage_logs:", logs);

  const invoices = await sql`
    SELECT id, user_id, invoice_month, amount_usd, total_requests, total_estimated_tokens
    FROM billing_invoices
    ORDER BY created_at DESC
  `;
  console.log("billing_invoices:", invoices);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  console.log("current month range:", start.toISOString(), "to", end.toISOString());

  const monthAgg = await sql`
    SELECT count(*)::int AS n,
           coalesce(sum(estimated_tokens), 0)::int AS tokens,
           coalesce(sum(estimated_cost_usd), 0)::text AS usd
    FROM ai_usage_logs
    WHERE created_at >= ${start} AND created_at <= ${end}
  `;
  console.log("current month agg:", monthAgg[0]);

  const allAgg = await sql`
    SELECT count(*)::int AS n,
           coalesce(sum(estimated_tokens), 0)::int AS tokens,
           coalesce(sum(estimated_cost_usd), 0)::text AS usd
    FROM ai_usage_logs
  `;
  console.log("all-time agg:", allAgg[0]);

  await sql.end();
}

main().catch(console.error);
