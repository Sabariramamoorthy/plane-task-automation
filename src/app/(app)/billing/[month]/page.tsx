import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getActiveSessionUser } from "@/lib/auth-session";
import { getUserBillingOverview } from "@/lib/billing";
import { formatBillingMonthLabel, isValidBillingMonthId } from "@/lib/billing-month";
import { BillingMonthFilter } from "@/components/billing/BillingMonthFilter";
import { BILLING_BASE, billingAllPath } from "@/lib/billing-paths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BillingMonthPageProps = {
  params: Promise<{ month: string }>;
};

export default async function BillingMonthPage({ params }: BillingMonthPageProps) {
  const { month } = await params;
  if (!isValidBillingMonthId(month)) notFound();

  const user = await getActiveSessionUser();
  const data = user ? await getUserBillingOverview(user.id, { monthId: month }) : null;

  if (!data || !data.usage) {
    return <p className="text-sm text-red-600">Unable to load billing data.</p>;
  }

  const usagePct = Math.min(
    100,
    Math.round(
      (data.usage.totalEstimatedTokens / Math.max(1, data.usageLimit.monthlyTokenLimit)) * 100,
    ),
  );

  const invoice = data.invoices[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Usage & Billing</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Track usage limits, monthly consumption, and your invoices.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-zinc-500">Loading months...</p>}>
        <BillingMonthFilter
          months={data.availableMonths}
          selectedMonth={data.monthId}
          basePath={BILLING_BASE}
          allMonthsPath={billingAllPath()}
          view="month"
        />
      </Suspense>

      <p className="text-sm text-zinc-500">
        Showing usage for{" "}
        <span className="font-medium text-zinc-700">{formatBillingMonthLabel(data.monthId)}</span>{" "}
        (IST)
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {data.usage.totalRequests} / {data.usageLimit.monthlyRequestLimit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {data.usage.totalEstimatedTokens} / {data.usageLimit.monthlyTokenLimit}
            </p>
            <div className="mt-3 h-2 rounded bg-zinc-200">
              <div className="h-2 rounded bg-zinc-900" style={{ width: `${usagePct}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated Cost (INR)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              ₹{data.usage.totalCostInr.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice — {formatBillingMonthLabel(data.monthId)}</CardTitle>
        </CardHeader>
        <CardContent>
          {!invoice ? (
            <p className="text-sm text-zinc-600">
              No invoice has been issued for this month yet.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-medium">Invoice {invoice.invoiceMonth}</p>
                <p className="text-zinc-500">
                  Requests: {invoice.totalRequests} · Tokens: {invoice.totalEstimatedTokens}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{invoice.amountInr.toFixed(2)}</p>
                <p className={invoice.isPaid ? "text-emerald-700" : "text-amber-700"}>
                  {invoice.isPaid ? "Paid" : "Unpaid"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
