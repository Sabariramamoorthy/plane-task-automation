import { config } from "dotenv";
import postgres from "postgres";
import { getBillingMonthRangeForId } from "../src/lib/billing-month";

config({ path: ".env.local" });

const BILLING_MULTIPLIER = 1.5;

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const invoices = await sql`
    SELECT id, user_id, invoice_month, total_estimated_tokens
    FROM billing_invoices
  `;

  for (const invoice of invoices) {
    const { start, end } = getBillingMonthRangeForId(invoice.invoice_month);
    const [agg] = await sql`
      SELECT count(*)::int AS requests,
             coalesce(sum(estimated_tokens), 0)::int AS tokens,
             coalesce(sum(estimated_cost_usd), 0)::numeric AS raw_usd
      FROM ai_usage_logs
      WHERE user_id = ${invoice.user_id}
        AND created_at >= ${start}
        AND created_at <= ${end}
    `;
    const amountUsd = Number((Number(agg.raw_usd) * BILLING_MULTIPLIER).toFixed(4));
    await sql`
      UPDATE billing_invoices
      SET amount_usd = ${amountUsd.toFixed(4)},
          total_requests = ${agg.requests},
          total_estimated_tokens = ${agg.tokens},
          updated_at = now()
      WHERE id = ${invoice.id}
    `;
    console.log(
      `Updated invoice ${invoice.invoice_month}: $${amountUsd}, ${agg.requests} requests, ${agg.tokens} tokens`,
    );
  }

  await sql.end();
  console.log("Invoice amounts repaired.");
}

main().catch(console.error);
