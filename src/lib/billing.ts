import "server-only";
import { unstable_cache } from "next/cache";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  getBillingMonthRange,
  getBillingMonthRangeForId,
  isValidBillingMonthId,
  listRecentBillingMonthIds,
  mergeBillingMonthIds,
} from "@/lib/billing-month";
import { db } from "@/lib/db";
import { aiUsageLogs, billingInvoices, user, userUsageLimits } from "@/lib/db/schema";

const PRICE_PER_1K_TOKENS_USD = 0.002;
const FALLBACK_USD_TO_INR = 83.5;
export const BILLING_MULTIPLIER = 1.5;
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

function estimateTokens(inputChars: number, outputChars: number) {
  return Math.max(1, Math.ceil((inputChars + outputChars) / 4));
}

function estimateCostUsd(tokens: number) {
  return Number(((tokens / 1000) * PRICE_PER_1K_TOKENS_USD).toFixed(4));
}

export function billedUsdFromRawCost(rawUsd: number) {
  return Number((rawUsd * BILLING_MULTIPLIER).toFixed(4));
}

export function inrFromUsd(usd: number, usdToInrRate: number) {
  const inr = usd * usdToInrRate;
  if (inr > 0 && inr < 0.01) return 0.01;
  return Number(inr.toFixed(2));
}

async function sumUsageForRange(userId: string, start: Date, end: Date) {
  const [usageRow] = await db
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
    );

  const rawUsd = Number(usageRow?.totalCostUsd ?? 0);
  const billedUsd = billedUsdFromRawCost(rawUsd);

  return {
    totalRequests: Number(usageRow?.totalRequests ?? 0),
    totalEstimatedTokens: Number(usageRow?.totalEstimatedTokens ?? 0),
    totalCostUsd: billedUsd,
  };
}

export async function resolveInvoiceFromUsage(userId: string, invoiceMonth: string) {
  const { start, end } = getBillingMonthRangeForId(invoiceMonth);
  return sumUsageForRange(userId, start, end);
}

function invoiceSnapshotMatches(
  existing: {
    totalRequests: number;
    totalEstimatedTokens: number;
    amountUsd: string | number;
  },
  usage: { totalRequests: number; totalEstimatedTokens: number; totalCostUsd: number },
) {
  return (
    existing.totalRequests === usage.totalRequests &&
    existing.totalEstimatedTokens === usage.totalEstimatedTokens &&
    Number(existing.amountUsd).toFixed(4) === usage.totalCostUsd.toFixed(4)
  );
}

export async function getBillingMonthIdsForUser(userId: string) {
  const [usageRows, invoiceRows] = await Promise.all([
    db.select({ createdAt: aiUsageLogs.createdAt }).from(aiUsageLogs).where(eq(aiUsageLogs.userId, userId)),
    db
      .select({ invoiceMonth: billingInvoices.invoiceMonth })
      .from(billingInvoices)
      .where(eq(billingInvoices.userId, userId)),
  ]);

  const usageMonths = usageRows.map((row) => getBillingMonthRange(row.createdAt).monthId);
  const invoiceMonths = invoiceRows.map((row) => row.invoiceMonth);

  return mergeBillingMonthIds(listRecentBillingMonthIds(24), usageMonths, invoiceMonths);
}

export async function getBillingMonthIdsForAdmin() {
  const invoiceRows = await db
    .select({ invoiceMonth: billingInvoices.invoiceMonth })
    .from(billingInvoices);

  return mergeBillingMonthIds(
    listRecentBillingMonthIds(24),
    invoiceRows.map((row) => row.invoiceMonth),
  );
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

export async function getUserBillingOverview(
  userId: string,
  options?: { monthId?: string; allMonths?: boolean },
) {
  const defaultMonthId = getBillingMonthRange().monthId;
  const allMonths = options?.allMonths === true;
  const selectedMonthId =
    !allMonths && options?.monthId && isValidBillingMonthId(options.monthId)
      ? options.monthId
      : defaultMonthId;
  const { start, end } = getBillingMonthRangeForId(selectedMonthId);

  const invoiceQuery = allMonths
    ? db
        .select()
        .from(billingInvoices)
        .where(eq(billingInvoices.userId, userId))
        .orderBy(desc(billingInvoices.invoiceMonth), desc(billingInvoices.createdAt))
    : db
        .select()
        .from(billingInvoices)
        .where(
          and(
            eq(billingInvoices.userId, userId),
            eq(billingInvoices.invoiceMonth, selectedMonthId),
          ),
        )
        .orderBy(desc(billingInvoices.createdAt));

  const [usageLimit, usdToInrRate, usage, invoices, availableMonths] = await Promise.all([
    ensureUserUsageLimit(userId),
    getCurrentUsdToInrRate(),
    allMonths ? Promise.resolve({ totalRequests: 0, totalEstimatedTokens: 0, totalCostUsd: 0 }) : sumUsageForRange(userId, start, end),
    invoiceQuery,
    getBillingMonthIdsForUser(userId),
  ]);

  const invoiceRows = await Promise.all(
    invoices.map(async (invoice) => {
      const monthUsage = await resolveInvoiceFromUsage(userId, invoice.invoiceMonth);
      const amountUsd = monthUsage.totalCostUsd;

      return {
        id: invoice.id,
        invoiceMonth: invoice.invoiceMonth,
        totalRequests: monthUsage.totalRequests,
        totalEstimatedTokens: monthUsage.totalEstimatedTokens,
        isPaid: invoice.isPaid,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        amountUsd,
        amountInr: inrFromUsd(amountUsd, usdToInrRate),
      };
    }),
  );

  return {
    monthId: selectedMonthId,
    availableMonths,
    allMonths,
    usdToInrRate,
    usageLimit,
    usage: allMonths
      ? null
      : {
          ...usage,
          totalCostInr: inrFromUsd(usage.totalCostUsd, usdToInrRate),
        },
    invoices: invoiceRows,
  };
}

export async function createOrUpdateInvoiceForMonth(userId: string, monthId: string) {
  if (!isValidBillingMonthId(monthId)) {
    throw new Error(`Invalid invoice month: ${monthId}`);
  }

  const { start, end } = getBillingMonthRangeForId(monthId);
  const usage = await sumUsageForRange(userId, start, end);

  const existing = await db.query.billingInvoices.findFirst({
    where: and(eq(billingInvoices.userId, userId), eq(billingInvoices.invoiceMonth, monthId)),
  });

  if (existing && invoiceSnapshotMatches(existing, usage)) {
    return {
      invoice: { ...existing, amountUsd: Number(existing.amountUsd) },
      created: false,
      updated: false,
      unchanged: true,
    };
  }

  if (existing) {
    const [updated] = await db
      .update(billingInvoices)
      .set({
        totalRequests: usage.totalRequests,
        totalEstimatedTokens: usage.totalEstimatedTokens,
        amountUsd: usage.totalCostUsd.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(billingInvoices.id, existing.id))
      .returning();

    return {
      invoice: { ...updated, amountUsd: Number(updated.amountUsd) },
      created: false,
      updated: true,
      unchanged: false,
    };
  }

  const [created] = await db
    .insert(billingInvoices)
    .values({
      userId,
      invoiceMonth: monthId,
      totalRequests: usage.totalRequests,
      totalEstimatedTokens: usage.totalEstimatedTokens,
      amountUsd: usage.totalCostUsd.toFixed(4),
      isPaid: false,
    })
    .returning();

  return {
    invoice: { ...created, amountUsd: Number(created.amountUsd) },
    created: true,
    updated: false,
    unchanged: false,
  };
}

export async function createOrUpdateCurrentInvoice(userId: string) {
  const { monthId } = getBillingMonthRange();
  const result = await createOrUpdateInvoiceForMonth(userId, monthId);
  return result.invoice;
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
