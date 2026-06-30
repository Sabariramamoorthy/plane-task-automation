import { and, eq } from "drizzle-orm";
import { badRequest, getSessionUser, notFound, ok, unauthorized } from "@/lib/api-helpers";
import { isUserAdmin } from "@/lib/billing";
import { db } from "@/lib/db";
import { billingInvoices } from "@/lib/db/schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const canAdmin = await isUserAdmin(sessionUser.id, sessionUser.email);
  if (!canAdmin) return unauthorized();

  const body = (await request.json()) as { isPaid?: boolean };
  if (typeof body.isPaid !== "boolean") {
    return badRequest("isPaid boolean is required");
  }

  const { id } = await context.params;
  const existing = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, id),
  });
  if (!existing) return notFound("Invoice not found");

  const [updated] = await db
    .update(billingInvoices)
    .set({
      isPaid: body.isPaid,
      paidAt: body.isPaid ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(billingInvoices.id, id), eq(billingInvoices.userId, existing.userId)))
    .returning();

  return ok({
    ...updated,
    amountUsd: Number(updated.amountUsd),
  });
}
