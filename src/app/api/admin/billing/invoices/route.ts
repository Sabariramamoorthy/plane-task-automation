import { desc, eq, sql } from "drizzle-orm";
import { badRequest, getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import {
  createOrUpdateInvoiceForMonth,
  getBillingMonthIdsForAdmin,
  getCurrentUsdToInrRate,
  inrFromUsd,
  isUserAdmin,
  resolveInvoiceFromUsage,
} from "@/lib/billing";
import { getBillingMonthRange, isValidBillingMonthId } from "@/lib/billing-month";
import { db } from "@/lib/db";
import { billingInvoices, user } from "@/lib/db/schema";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const canAdmin = await isUserAdmin(sessionUser.id, sessionUser.email);
  if (!canAdmin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const selectedMonth =
    monthParam && isValidBillingMonthId(monthParam)
      ? monthParam
      : getBillingMonthRange().monthId;

  const monthFilter =
    monthParam && isValidBillingMonthId(monthParam)
      ? eq(billingInvoices.invoiceMonth, monthParam)
      : null;

  const [rows, users, months, usdToInrRate] = await Promise.all([
    db
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
      .where(monthFilter ?? sql`true`)
      .orderBy(desc(billingInvoices.invoiceMonth), desc(billingInvoices.createdAt)),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .orderBy(user.name),
    getBillingMonthIdsForAdmin(),
    getCurrentUsdToInrRate(),
  ]);

  return ok({
    selectedMonth,
    months,
    users,
    invoices: await Promise.all(
      rows.map(async (row) => {
        const monthUsage = await resolveInvoiceFromUsage(
          row.invoice.userId,
          row.invoice.invoiceMonth,
        );
        const amountUsd = monthUsage.totalCostUsd;
        return {
          ...row.invoice,
          totalRequests: monthUsage.totalRequests,
          totalEstimatedTokens: monthUsage.totalEstimatedTokens,
          amountUsd,
          amountInr: inrFromUsd(amountUsd, usdToInrRate),
          customer: row.customer,
        };
      }),
    ),
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const canAdmin = await isUserAdmin(sessionUser.id, sessionUser.email);
  if (!canAdmin) return unauthorized();

  const body = (await request.json()) as {
    userId?: string;
    invoiceMonth?: string;
  };

  if (!body.userId) return badRequest("userId is required");
  if (!body.invoiceMonth || !isValidBillingMonthId(body.invoiceMonth)) {
    return badRequest("invoiceMonth must be YYYY-MM");
  }

  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, body.userId),
    columns: { id: true },
  });
  if (!targetUser) return badRequest("User not found");

  const result = await createOrUpdateInvoiceForMonth(body.userId, body.invoiceMonth);
  const usdToInrRate = await getCurrentUsdToInrRate();

  return ok({
    ...result,
    amountInr: inrFromUsd(result.invoice.amountUsd, usdToInrRate),
  });
}
