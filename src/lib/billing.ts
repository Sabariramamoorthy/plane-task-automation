import "server-only";
import { unstable_cache } from "next/cache";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsageLogs, billingInvoices, user, userUsageLimits } from "@/lib/db/schema";

const PRICE_PER_1K_TOKENS_USD = 0.002;
const FALLBACK_USD_TO_INR = 83.5;
const BILLING_MULTIPLIER = 1.5;
const FX_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cachedUsdToInr: { value: number; expiresAt: number } | null = null;

async function fetchUsdToInrRate() {
  if (cachedUsdToInr && Date.now() < cachedUsdToInr.expiresAt) {
    return cachedUsdToInr.value;
  }

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      method: "GET",
      next: { revalidate: 21600 },
    });
    if (!response.ok) return FALLBACK_USD_TO_INR;

    const data = (await response.json()) as {
      rates?: { INR?: number };
    };
    const inr = data?.rates?.INR;
    if (!inr || Number.isNaN(inr)) return FALLBACK_USD_TO_INR;
    const value = Number(inr.toFixed(4));
    cachedUsdToInr = { value, expiresAt: Date.now() + FX_CACHE_TTL_MS };
    return value;
  } catch {
    return FALLBACK_USD_TO_INR;
  }
}

export const getCurrentUsdToInrRate = unstable_cache(fetchUsdToInrRate, ["usd-inr-rate"], {
  revalidate: 21600,
});

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return { start, end, monthId };
}

function estimateTokens(inputChars: number, outputChars: number) {
  return Math.max(1, Math.ceil((inputChars + outputChars) / 4));
}

function estimateCostUsd(tokens: number) {
  return Number(((tokens / 1000) * PRICE_PER_1K_TOKENS_USD).toFixed(4));
}

export async function ensureUserUsageLimit(userId: string) {
  const existing = await db.query.userUsageLimits.findFirst({
    where: eq(userUsageLimits.userId, userId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(userUsageLimits)
    .values({
      userId,
      monthlyRequestLimit: 250,
      monthlyTokenLimit: 300000,
      isBillingEnabled: true,
    })
    .returning();

  return created;
}

export async function trackAiUsage(params: {
  userId: string;
  instanceId?: string;
  operation?: string;
  inputChars: number;
  outputChars: number;
}) {
  const estimatedTokens = estimateTokens(params.inputChars, params.outputChars);
  const estimatedCostUsd = estimateCostUsd(estimatedTokens);

  await db.insert(aiUsageLogs).values({
    userId: params.userId,
    instanceId: params.instanceId,
    operation: params.operation ?? "task_parse",
    inputChars: params.inputChars,
    outputChars: params.outputChars,
    estimatedTokens,
    estimatedCostUsd: estimatedCostUsd.toFixed(4),
  });
}

export async function getUserBillingOverview(userId: string) {
  const { start, end, monthId } = getMonthRange();

  const [usageLimit, usdToInrRate, usageRows, invoices] = await Promise.all([
    ensureUserUsageLimit(userId),
    getCurrentUsdToInrRate(),
    db
      .select({
        totalRequests: count(aiUsageLogs.id),
        totalEstimatedTokens: sql<number>`coalesce(sum(${aiUsageLogs.estimatedTokens}), 0)`,
        totalCostUsd: sql<string>`coalesce(sum(${aiUsageLogs.estimatedCostUsd}), 0)`,
      })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.userId, userId),
          gte(aiUsageLogs.createdAt, start),
          lte(aiUsageLogs.createdAt, end),
        ),
      ),
    db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.userId, userId))
      .orderBy(desc(billingInvoices.invoiceMonth), desc(billingInvoices.createdAt)),
  ]);

  const usageRow = usageRows[0];
  const billedUsd = Number(usageRow?.totalCostUsd ?? 0) * BILLING_MULTIPLIER;

  return {
    monthId,
    usdToInrRate,
    usageLimit,
    usage: {
      totalRequests: Number(usageRow?.totalRequests ?? 0),
      totalEstimatedTokens: Number(usageRow?.totalEstimatedTokens ?? 0),
      totalCostUsd: billedUsd,
      totalCostInr: Number((billedUsd * usdToInrRate).toFixed(2)),
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceMonth: invoice.invoiceMonth,
      totalRequests: invoice.totalRequests,
      totalEstimatedTokens: invoice.totalEstimatedTokens,
      isPaid: invoice.isPaid,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      amountUsd: Number(invoice.amountUsd),
      amountInr: Number((Number(invoice.amountUsd) * usdToInrRate).toFixed(2)),
    })),
  };
}

export async function createOrUpdateCurrentInvoice(userId: string) {
  const overview = await getUserBillingOverview(userId);

  const existing = await db.query.billingInvoices.findFirst({
    where: and(
      eq(billingInvoices.userId, userId),
      eq(billingInvoices.invoiceMonth, overview.monthId),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(billingInvoices)
      .set({
        totalRequests: overview.usage.totalRequests,
        totalEstimatedTokens: overview.usage.totalEstimatedTokens,
        amountUsd: overview.usage.totalCostUsd.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(billingInvoices.id, existing.id))
      .returning();
    return { ...updated, amountUsd: Number(updated.amountUsd) };
  }

  const [created] = await db
    .insert(billingInvoices)
    .values({
      userId,
      invoiceMonth: overview.monthId,
      totalRequests: overview.usage.totalRequests,
      totalEstimatedTokens: overview.usage.totalEstimatedTokens,
      amountUsd: overview.usage.totalCostUsd.toFixed(2),
      isPaid: false,
    })
    .returning();

  return { ...created, amountUsd: Number(created.amountUsd) };
}

export async function isUserAdmin(userId: string, email?: string | null) {
  void userId;

  const hardcodedAdmins = ["sabari.r@cloudshiftsolutions.in"];
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const normalized = email?.trim().toLowerCase();
  if (normalized) {
    return hardcodedAdmins.includes(normalized) || adminEmails.includes(normalized);
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true },
  });
  const dbEmail = dbUser?.email?.trim().toLowerCase();
  if (!dbEmail) return false;

  return hardcodedAdmins.includes(dbEmail) || adminEmails.includes(dbEmail);
}
