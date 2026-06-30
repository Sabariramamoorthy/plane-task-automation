import "server-only";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getCurrentUsdToInrRate } from "@/lib/billing";
import { db } from "@/lib/db";
import {
  aiUsageLogs,
  billingInvoices,
  createdIssues,
  planeInstances,
  user,
  userUsageLimits,
} from "@/lib/db/schema";

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function getAdminDashboardData() {
  const { start, end } = getMonthRange();

  const [
    totalUsersRow,
    totalInstancesRow,
    totalIssuesRow,
    totalInvoicesRow,
    unpaidInvoicesRow,
    invoicedUsdRow,
    users,
    usageLimits,
    usageByUser,
    instancesByUser,
    invoiceRows,
    usdToInr,
  ] = await Promise.all([
    db.select({ value: count(user.id) }).from(user),
    db.select({ value: count(planeInstances.id) }).from(planeInstances),
    db.select({ value: count(createdIssues.id) }).from(createdIssues),
    db.select({ value: count(billingInvoices.id) }).from(billingInvoices),
    db
      .select({ value: count(billingInvoices.id) })
      .from(billingInvoices)
      .where(eq(billingInvoices.isPaid, false)),
    db
      .select({
        total: sql<string>`coalesce(sum(${billingInvoices.amountUsd}), 0)`,
      })
      .from(billingInvoices),
    db.select().from(user).orderBy(desc(user.createdAt)).limit(100),
    db.select().from(userUsageLimits),
    db
      .select({
        userId: aiUsageLogs.userId,
        totalRequests: count(aiUsageLogs.id),
        totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.estimatedTokens}), 0)`,
        totalCostUsd: sql<string>`coalesce(sum(${aiUsageLogs.estimatedCostUsd}), 0)`,
      })
      .from(aiUsageLogs)
      .where(and(gte(aiUsageLogs.createdAt, start), lte(aiUsageLogs.createdAt, end)))
      .groupBy(aiUsageLogs.userId),
    db
      .select({
        userId: planeInstances.userId,
        instanceCount: count(planeInstances.id),
      })
      .from(planeInstances)
      .groupBy(planeInstances.userId),
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
      .orderBy(desc(billingInvoices.createdAt))
      .limit(100),
    getCurrentUsdToInrRate(),
  ]);

  const limitsByUser = new Map(usageLimits.map((row) => [row.userId, row]));
  const usageMap = new Map(usageByUser.map((row) => [row.userId, row]));
  const instanceMap = new Map(instancesByUser.map((row) => [row.userId, row]));

  const usersWithMeta = users.map((item) => {
    const usageLimit = limitsByUser.get(item.id);
    const usageRow = usageMap.get(item.id);

    return {
      id: item.id,
      name: item.name,
      email: item.email,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      instanceCount: Number(instanceMap.get(item.id)?.instanceCount ?? 0),
      monthlyRequestLimit: usageLimit?.monthlyRequestLimit ?? 250,
      monthlyTokenLimit: usageLimit?.monthlyTokenLimit ?? 300000,
      isBillingEnabled: usageLimit?.isBillingEnabled ?? true,
      monthUsageRequests: Number(usageRow?.totalRequests ?? 0),
      monthUsageTokens: Number(usageRow?.totalTokens ?? 0),
      monthUsageInr: Number(
        (Number(usageRow?.totalCostUsd ?? 0) * 1.5 * usdToInr).toFixed(2),
      ),
    };
  });

  return {
    stats: {
      totalUsers: Number(totalUsersRow[0]?.value ?? 0),
      totalInstances: Number(totalInstancesRow[0]?.value ?? 0),
      totalIssues: Number(totalIssuesRow[0]?.value ?? 0),
      totalInvoices: Number(totalInvoicesRow[0]?.value ?? 0),
      unpaidInvoices: Number(unpaidInvoicesRow[0]?.value ?? 0),
      totalInvoicedInr: Number((Number(invoicedUsdRow[0]?.total ?? 0) * usdToInr).toFixed(2)),
    },
    users: usersWithMeta,
    invoices: invoiceRows.map((row) => ({
      id: row.invoice.id,
      userId: row.invoice.userId,
      invoiceMonth: row.invoice.invoiceMonth,
      totalRequests: row.invoice.totalRequests,
      totalEstimatedTokens: row.invoice.totalEstimatedTokens,
      isPaid: row.invoice.isPaid,
      paidAt: row.invoice.paidAt?.toISOString() ?? null,
      amountInr: Number((Number(row.invoice.amountUsd) * usdToInr).toFixed(2)),
      customer: row.customer,
    })),
  };
}

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
