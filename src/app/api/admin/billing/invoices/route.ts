import { desc, eq } from "drizzle-orm";
import { getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import { isUserAdmin } from "@/lib/billing";
import { db } from "@/lib/db";
import { billingInvoices, user } from "@/lib/db/schema";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const canAdmin = await isUserAdmin(sessionUser.id, sessionUser.email);
  if (!canAdmin) return unauthorized();

  const rows = await db
    .select({
      invoice: billingInvoices,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(billingInvoices)
    .innerJoin(user, eq(billingInvoices.userId, user.id))
    .orderBy(desc(billingInvoices.createdAt));

  return ok(
    rows.map((row) => ({
      ...row.invoice,
      amountUsd: Number(row.invoice.amountUsd),
      customer: row.customer,
    })),
  );
}
